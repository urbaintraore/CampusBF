import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Sparkles, Loader2, CheckCircle, AlertTriangle, FileArchive } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { restructureAcademicDocument } from '@/services/geminiService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function DocumentProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [institution, setInstitution] = useState('');
  const [institutionType, setInstitutionType] = useState('Université');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [subject, setSubject] = useState('');
  const [documentType, setDocumentType] = useState('TD');
  const [duration, setDuration] = useState('');
  const [level, setLevel] = useState('Licence 1');
  const [field, setField] = useState('');

  // Pipeline states
  const [status, setStatus] = useState<'idle' | 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');

  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (status !== 'idle' && status !== 'failed' && status !== 'completed') return;
    setFile(acceptedFiles[0]);
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    setProcessedUrl('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 30 * 1024 * 1024, // 30MB
    multiple: false
  });

  const generateModernHeader = (doc: jsPDF, pageWidth: number) => {
    doc.setFillColor(240, 248, 255); // Light Azure
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(0, 50, 100);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("CAMPUSBF", 15, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Établissement: ${institution} (${institutionType}) | Année: ${academicYear}`, 15, 30);
    doc.text(`Matière: ${subject} | Niveau: ${level} | Type: ${documentType}`, 15, 40);
  };

  const processAndUploadSequence = async (retryCount = 0) => {
    if (!file) return;
    
    // START PIPELINE
    setStatus('pending');
    setProgress(5);
    let docRefId = '';
    
    processingTimeoutRef.current = setTimeout(() => {
       if (status === 'uploading' || status === 'processing' || status === 'pending') {
          setStatus('failed');
          setErrorMsg("Délai de traitement dépassé.");
       }
    }, 120000); 

    try {
      // 1. CREATE RECORD IN FIRESTORE
      const docRef = await addDoc(collection(db, 'processed_documents'), {
        title: file.name,
        institution: institution || 'Général',
        field: field || 'Générale',
        status: 'pending',
        processingProgress: 5,
        errorMessage: '',
        retryCount: retryCount,
        processingStartedAt: serverTimestamp(),
      });
      docRefId = docRef.id;

      // 2. OCR & IA RESTRUCTURATION
      setStatus('processing');
      setProgress(25);
      await updateDoc(docRef, { status: 'processing', processingProgress: 25 });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const ocrResp = await fetch('/backend/ocr', { method: 'POST', body: formData });
      if (!ocrResp.ok) throw new Error("Erreur OCR");
      const { text: rawText } = await ocrResp.json();
      
      setProgress(50);
      await updateDoc(docRef, { processingProgress: 50 });
      
      const restructuredMarkdown = await restructureAcademicDocument(rawText, {
          institution, subject, academicYear, documentType, level
      });
      
      // GENERATION PDF MODERNE avec jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      generateModernHeader(doc, pageWidth);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(restructuredMarkdown, pageWidth - 30);
      doc.text(splitText, 15, 65);
      
      const pdfBytes = doc.output('arraybuffer');
      
      setProgress(75);
      await updateDoc(docRef, { processingProgress: 75 });
      
      // 3. UPLOAD TO STORAGE
      setStatus('uploading');
      setProgress(85);
      await updateDoc(docRef, { status: 'uploading', processingProgress: 85 });
      
      const fileName = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(fileName, new Uint8Array(pdfBytes), {
          contentType: 'application/pdf',
          upsert: false
        });
        
      if (uploadError) throw new Error("Erreur upload: " + uploadError.message);

      const { data: { publicUrl } } = supabase
        .storage
        .from('documents')
        .getPublicUrl(fileName);
      
      // 4. FINALIZE PUBLICATION
      await updateDoc(docRef, {
        processedPdfUrl: publicUrl,
        status: 'completed',
        processingProgress: 100,
        processingCompletedAt: serverTimestamp()
      });

      // 5. PUBLISH TO FRONTEND "documents" COLLECTION
      await addDoc(collection(db, 'documents'), {
        title: file.name,
        institution, institutionType, academicYear, subject, documentType, duration, level, field,
        type: documentType === 'Devoir' ? 'exam' : documentType === 'TD' ? 'exercise' : 'summary',
        university: institution, major: field,
        authorId: 'admin',
        downloadUrl: publicUrl,
        fileName: file.name,
        downloads: 0, likes: 0, isForSale: false,
        createdAt: serverTimestamp(),
      });

      setProcessedUrl(publicUrl);
      setStatus('completed');
      setProgress(100);
      toast.success("Document traité et publié !");

    } catch (err: any) {
      console.error("Pipeline error:", err);
      
      if (retryCount < 2) {
        toast.error(`Erreur, nouvelle tentative (${retryCount + 1}/2)...`);
        return processAndUploadSequence(retryCount + 1);
      }
      
      setStatus('failed');
      setErrorMsg(err.message || "Une erreur inattendue est survenue");
      
      if (docRefId) {
        await updateDoc(doc(db, 'processed_documents', docRefId), {
           status: 'failed',
           errorMessage: err.message || "Erreur de traitement",
           processingCompletedAt: serverTimestamp()
        }).catch(console.error);
      }
      toast.error("Échec du traitement du document après 3 tentatives.");
    } finally {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 max-w-4xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">Traitement Automatisé de Documents (IA)</h3>
        <p className="text-slate-500 text-sm mt-1">Upload, nettoie, insère l'entête CampusBF, et publie automatiquement. Formats: PDF, JPG, PNG.</p>
      </div>
      
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}
          ${(status === 'uploading' || status === 'processing' || status === 'pending') ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        {status === 'completed' ? (
          <CheckCircle className="mx-auto text-emerald-500 mb-3 h-10 w-10" />
        ) : status === 'failed' ? (
          <AlertTriangle className="mx-auto text-red-500 mb-3 h-10 w-10" />
        ) : (
          <Upload className={`mx-auto mb-3 h-10 w-10 ${isDragActive ? 'text-emerald-500' : 'text-slate-400'}`} />
        )}
        <p className="font-medium text-slate-700">Glissez un document ou cliquez pour sélectionner</p>
        <p className="text-xs text-slate-400 mt-2">Max: 30MB. Images converties automatiquement en PDF.</p>
      </div>

      {file && (
        <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <FileArchive className="text-emerald-600 h-6 w-6" />
              <div>
                <p className="font-bold text-sm text-slate-800 line-clamp-1">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Établissement</label>
                  <input type="text" placeholder="Ex: UJKZ" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={institution} onChange={e => setInstitution(e.target.value)} disabled={status !== 'idle' && status !== 'failed'} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Type Établissement</label>
                  <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={institutionType} onChange={e => setInstitutionType(e.target.value)} disabled={status !== 'idle' && status !== 'failed'}>
                    {['Université', 'École Supérieure', 'Institut', 'Lycée', 'Collège'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Année Académique</label>
                  <input type="text" placeholder="Ex: 2025-2026" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={academicYear} onChange={e => setAcademicYear(e.target.value)} disabled={status !== 'idle' && status !== 'failed'} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Matière</label>
                  <input type="text" placeholder="Ex: Mathématiques" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={subject} onChange={e => setSubject(e.target.value)} disabled={status !== 'idle' && status !== 'failed'} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Type de Document</label>
                  <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={documentType} onChange={e => setDocumentType(e.target.value)} disabled={status !== 'idle' && status !== 'failed'}>
                    {['Devoir', 'TD', 'Examen', 'Contrôle', 'Concours', 'Support cours'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Niveau</label>
                  <input type="text" placeholder="Ex: Licence 1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={level} onChange={e => setLevel(e.target.value)} disabled={status !== 'idle' && status !== 'failed'} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Filière</label>
                  <input type="text" placeholder="Ex: Math-Info" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" value={field} onChange={e => setField(e.target.value)} disabled={status !== 'idle' && status !== 'failed'} />
                </div>
              </div>

              {(status === 'idle' || status === 'failed') && (
                <button 
                    onClick={() => processAndUploadSequence(0)}
                    className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Sparkles size={18} />
                    Démarrer le Traitement
                </button>
              )}

              {(status === 'pending' || status === 'uploading' || status === 'processing') && (
                <div className="p-4 bg-white rounded-xl border border-emerald-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-emerald-600" />
                      {status === 'pending' && "Initialisation..."}
                      {status === 'processing' && "Traitement IA & Application de l'entête..."}
                      {status === 'uploading' && "Upload du document finalisé..."}
                    </span>
                    <span className="text-sm font-bold text-emerald-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              {status === 'completed' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center text-center">
                  <p className="text-emerald-800 font-medium text-sm mb-3">Le document a été traité et ajouté à la bibliothèque avec succès.</p>
                  {processedUrl && (
                    <a href={processedUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline text-sm flex items-center gap-1">
                      Voir le document en ligne
                    </a>
                  )}
                  <button onClick={() => { setStatus('idle'); setFile(null); }} className="mt-4 px-4 py-2 border border-emerald-600 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100">
                    Traiter un autre document
                  </button>
                </div>
              )}

              {status === 'failed' && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-red-800 font-medium text-sm flex items-center gap-2"><AlertTriangle size={16} /> {errorMsg}</p>
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
}


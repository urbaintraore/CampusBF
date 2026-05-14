import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Sparkles, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function DocumentProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [universite, setUniversite] = useState('');
  const [filiere, setFiliere] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);

  const addCampusBFHeader = (pdf: jsPDF, universite: string, filiere: string) => {
    pdf.setFontSize(16);
    pdf.text("CAMPUSBF", 10, 15);
    pdf.setFontSize(10);
    pdf.text("La plateforme des étudiants", 10, 20);
    pdf.line(10, 23, 200, 23);
    pdf.text(`Université : ${universite}`, 10, 30);
    pdf.text(`Filière : ${filiere}`, 10, 35);
    pdf.line(10, 38, 200, 38);
    pdf.text(`Date de publication : ${new Date().toLocaleDateString()}`, 10, 45);
  };

  const onDrop = (acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 20 * 1024 * 1024,
    multiple: false
  });

  const preprocessImage = (imageFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg > 128 ? 255 : 0; // Simple binarization
          data[i+1] = avg > 128 ? 255 : 0;
          data[i+2] = avg > 128 ? 255 : 0;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject('Failed to blob'), 'image/jpeg');
      };
    });
  };

  const uploadDocument = async (pdfBlob: Blob, title: string) => {
    const docId = Date.now().toString();
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('processed_documents')
      .upload(`${docId}.pdf`, pdfBlob, {
        contentType: 'application/pdf',
      });
      
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase
      .storage
      .from('processed_documents')
      .getPublicUrl(`${docId}.pdf`);
    
    await addDoc(collection(db, 'processed_documents'), {
      title,
      universite,
      filiere,
      niveau: 'Inconnu',
      originalFileUrl: '',
      processedPdfUrl: publicUrl,
      uploadedBy: 'Admin',
      createdAt: serverTimestamp(),
      pages: 1,
      tags: [],
      validated: false,
      views: 0,
      downloads: 0
    });
    return publicUrl;
  };

  const processDocument = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      // 1. Preprocess IMAGE server-side or client-side? 
      // Preprocessing in browser is fine.
      setProgress(30);
      const cleanedFile = await preprocessImage(file);
      
      // 2. OCR via API
      setProgress(40);
      const formData = new FormData();
      formData.append('file', cleanedFile);
      
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('OCR API failed');
      const { text } = await response.json();
      
      setProgress(60);
      
      // 3. Generate PDF with Branding
      const pdf = new jsPDF();
      addCampusBFHeader(pdf, universite, filiere);
      pdf.setFontSize(12);
      pdf.text(text.substring(0, 1500), 10, 55);
      const pdfBlob = pdf.output('blob');
      
      // 4. Upload
      await uploadDocument(pdfBlob, file.name);
      
      setProcessedFile(pdfBlob);
      setProgress(100);
      toast.success("Document traité et publié !");
    } catch (err) {
      console.error("Processing error:", err);
      toast.error("Erreur de traitement/upload");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold mb-4">Traitement Intelligent de Documents</h3>
      
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}>
        <input {...getInputProps()} />
        <Upload className="mx-auto text-slate-400 mb-2" />
        <p>Glissez un document ou cliquez ici</p>
      </div>

      {file && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
            <span className="font-medium text-sm text-slate-700">{file.name}</span>
            <input type="text" placeholder="Université" className="w-full p-2 border rounded" value={universite} onChange={e => setUniversite(e.target.value)} />
            <input type="text" placeholder="Filière" className="w-full p-2 border rounded" value={filiere} onChange={e => setFiliere(e.target.value)} />
            <button 
                onClick={processDocument}
                disabled={isProcessing}
                className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold"
            >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Traiter et Générer PDF
            </button>
        </div>
      )}
      
      {progress > 0 && (
          <div className="mt-4 w-full bg-slate-200 h-2 rounded-full">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
      )}
    </div>
  );
}

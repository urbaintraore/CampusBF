import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateText } from '@/services/geminiService';

export function ExamProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [concours, setConcours] = useState('');
  const [categorie, setCategorie] = useState('');
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  // Helper for safe JSON stringify to avoid circular structure errors
  const safeStringify = (obj: any) => {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return;
        seen.add(value);
      }
      return value;
    }, 2);
  };

  const onDrop = (acceptedFiles: File[], fileRejections: any[]) => {
    console.log("onDrop acceptedFiles:", acceptedFiles);
    console.log("onDrop fileRejections:", fileRejections);
    if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
    } else if (fileRejections.length > 0) {
        toast.error("Format de fichier non accepté ou taille trop grande");
    }
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

  const processExam = async () => {
    console.log("processExam clicked. File state:", file);
    if (!file) {
      console.error("No file in state!");
      return;
    }
    setIsProcessing(true);
    setProgress(20);
    
    try {
      console.log("Sending exam file to OCR:", file.name, file.size);
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log("Fetching /api/ocr...");
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      console.log("OCR API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR API error response:', errorText);
        throw new Error(`OCR API failed: ${response.statusText} - ${errorText}`);
      }
      const { text } = await response.json();
      console.log("OCR text length:", text.length);
      
      // 2. Generate Quiz JSON with AI
      setProgress(70);
      const prompt = `Transforme ce texte provenant d'un sujet de concours en un JSON de quiz interactif.
      Texte: ${text.substring(0, 5000)}
      Format JSON attendu:
      {
        "title": "Titre",
        "questions": [{"question": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "..."}],
        "corrections": ["..."]
      }`;
      const quizJsonStr = await generateText(prompt);
      const quiz = JSON.parse(quizJsonStr.replace(/```json|```/g, ''));
      console.log("Setting generatedQuiz:", quiz);
      setGeneratedQuiz(quiz);
      setProgress(100);
      toast.success("Quiz généré !");
    } catch (err) {
      console.error("Error in processExam:", err);
      toast.error("Erreur génération quiz: " + (err instanceof Error ? err.message : 'Inconnue'));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const publishQuiz = async () => {
    console.log("=== publishQuiz start ===");
    console.log("generatedQuiz:", generatedQuiz);
    console.log("file:", file);
    
    if (!generatedQuiz || !file) {
      console.error("Early return in publishQuiz: missing generatedQuiz or file");
      console.log("=== publishQuiz end ===");
      return;
    }
    
    try {
      console.log("Publishing quiz. FileName:", file.name);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      console.log("Uploading file to bucket 'public_exam_subjects' with name:", fileName);
      
      console.log("Attempting upload to Supabase...");

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('public_exam_subjects')
        .upload(fileName, file);

      console.log("Supabase upload attempted. Result:", { uploadData, uploadError });
      
      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw uploadError;
      }
      
      console.log("Upload successful:", uploadData);

      const { data: { publicUrl } } = supabase
        .storage
        .from('public_exam_subjects')
        .getPublicUrl(fileName);
      
      console.log("Public URL fetched:", publicUrl);

      console.log("Adding document to Firestore...");

      await addDoc(collection(db, 'public_exam_quizzes'), {
        ...generatedQuiz,
        concours,
        categorie,
        annee: parseInt(annee),
        generatedByAI: true,
        validated: false,
        uploadedBy: 'Admin',
        createdAt: serverTimestamp(),
        subjectFileUrl: publicUrl
      });
      console.log("Document added to Firestore successfully.");
      
      toast.success("Quiz publié !");
      console.log("=== publishQuiz success ===");
    } catch (err) {
      console.error("Error in publishQuiz:", err);
      toast.error("Échec publication: " + (err instanceof Error ? err.message : String(err)));
      console.log("=== publishQuiz failure ===");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold mb-4">Générateur Intelligent Quiz Concours</h3>
      
      <div {...getRootProps()} className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer">
        <input {...getInputProps()} />
        <Upload className="mx-auto text-slate-400 mb-2" />
        <p>Glissez le sujet du concours (PDF/Image)</p>
      </div>

      {file && (
        <div className="mt-4 space-y-2">
            <input type="text" placeholder="Concours (ex: ENA)" className="w-full p-2 border rounded" value={concours} onChange={e => setConcours(e.target.value)} />
            <input type="text" placeholder="Catégorie" className="w-full p-2 border rounded" value={categorie} onChange={e => setCategorie(e.target.value)} />
            <input type="number" placeholder="Année" className="w-full p-2 border rounded" value={annee} onChange={e => setAnnee(e.target.value)} />
            <button onClick={processExam} disabled={isProcessing} className="w-full bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Générer Quiz
            </button>
        </div>
      )}
      
      {generatedQuiz && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <pre className="text-xs">{safeStringify(generatedQuiz)}</pre>
            <button onClick={() => publishQuiz()} className="mt-4 w-full bg-blue-600 text-white p-2 rounded-lg">Publier</button>
        </div>
      )}
    </div>
  );
}

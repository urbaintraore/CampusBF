import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles, Loader2, AlertTriangle, CheckCircle, Eye, EyeOff, Save, Trash2, ArrowRight, FileText, Calendar, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const categoryLabels: Record<string, string> = {
  culture_generale: 'Culture Générale',
  maths: 'Mathématiques',
  droit: 'Droit & Administration',
  economie: 'Économie & Finances',
  svt: 'SVT / Santé',
  physique: 'Physique',
  chimie: 'Chimie',
  dissertation_redaction: 'Dissertation / Rédaction',
  tests_psychotechniques: 'Tests Psychotechniques',
  cas_pratique: 'Cas pratique',
  actualite_retrospective: 'Actualité et rétrospective',
  societes_evenements: 'Sociétés-Evènements',
  institutions_nationales_internationales: 'Institutions nationales et internationales',
  culture_litteraire_artistique: 'Culture littéraire et artistique',
  histoire: 'Histoire',
  geographie: 'Géographie',
  philosophie: 'Philosophie',
  psychologie: 'Psychologie',
  sociologie: 'Sociologie',
  francais: 'Français',
  sciences_technologie: 'Sciences et technologie',
  connaissances_burkina: 'Connaissances sur le Burkina',
  test_niveau: 'Test de Niveau'
};

export function ExamProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('culture_generale');
  const [level, setLevel] = useState('BAC');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  // Custom manual metadata fields for adjustment before publishing
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'upload' | 'ocr' | 'ai_structuring'>('idle');
  const [progress, setProgress] = useState(0);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [showQuestions, setShowQuestions] = useState(true);

  const [isPublishing, setIsPublishing] = useState(false);

  const onDrop = (acceptedFiles: File[], fileRejections: any[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setGeneratedQuiz(null);
      setCustomTitle('');
      setCustomDescription('');
      toast.success(`Fichier "${acceptedFiles[0].name}" chargé d'un clic !`);
    } else if (fileRejections.length > 0) {
      toast.error("Format non supporté (seuls PDF, PNG, JPG, JPEG et WEBP sont acceptés)");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'], 
      'application/pdf': ['.pdf'] 
    },
    maxSize: 25 * 1024 * 1024,
    multiple: false
  });

  const handleProcessExam = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un sujet d'épreuve (PDF ou Image) d'abord.");
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setGeneratedQuiz(null);
    setProcessingStep('upload');

    try {
      console.log("[Pipeline] Extraction text for", file.name, "size =", file.size);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('level', level);
      
      setProcessingStep('ocr');
      setProgress(40);
      
      const ocrResp = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!ocrResp.ok) {
        const errorText = await ocrResp.text();
        throw new Error(`Erreur lors de l'OCR : ${ocrResp.statusText} - ${errorText}`);
      }

      const ocrData = await ocrResp.json();
      const extractedText = ocrData.text || '';
      console.log("[Pipeline] Extracted text character count:", extractedText.length);

      if (!extractedText.trim()) {
        throw new Error("Aucun texte lisible n'a pu être extrait de ce document.");
      }

      setProcessingStep('ai_structuring');
      setProgress(75);

      // Call the server-side structured text-processing endpoint
      const aiResp = await fetch('/api/public-service/process-contest-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: extractedText,
          category,
          level
        }),
      });

      if (!aiResp.ok) {
        const errorText = await aiResp.text();
        throw new Error(`L'IA s'est arrêtée : ${errorText}`);
      }

      const structuredQuiz = await aiResp.json();
      console.log("[Pipeline] Quiz structured from text:", structuredQuiz);

      setGeneratedQuiz(structuredQuiz);
      setCustomTitle(structuredQuiz.titre || `Sujet de concours - ${categoryLabels[category]}`);
      setCustomDescription(structuredQuiz.description || `Session officielle d'examen corrigée par l'IA.`);
      
      setProgress(100);
      toast.success("Analyse et structuration IA terminées !");
    } catch (err: any) {
      console.error("[Pipeline] Generation failed:", err);
      toast.error(err.message || 'La numérisation ou la structuration a échoué');
    } finally {
      setIsProcessing(false);
      setProcessingStep('idle');
      setProgress(0);
    }
  };

  const handlePublishQuiz = async () => {
    if (!generatedQuiz || !file) {
      toast.error("Rien à publier. Générez le quiz d'abord.");
      return;
    }

    setIsPublishing(true);
    const loadId = toast.loading("Publication officielle sur CampusBF...");

    try {
      console.log("[Publish] Uploading document source...");
      const fileExt = file.name.split('.').pop();
      const storageFileName = `contest_${Date.now()}_${Math.random().toString(36).substring(3, 9)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('public_exam_subjects')
        .upload(storageFileName, file);

      if (uploadError) {
        console.error("Supabase Storage upload failure:", uploadError);
        throw new Error(`Stockage échoué: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from('public_exam_subjects')
        .getPublicUrl(storageFileName);

      console.log("[Publish] Source url fetched:", publicUrl);

      // Perform strict database mappings for reliability
      const questionsListMapped = (generatedQuiz.questions || []).map((q: any) => {
        const rawOptions = q.options || q.choices || [];
        
        let correctResponseIdx = 0;
        if (typeof q.bonne_reponse === 'number') {
          correctResponseIdx = q.bonne_reponse;
        } else if (typeof q.correctAnswerIndex === 'number') {
          correctResponseIdx = q.correctAnswerIndex;
        } else if (typeof q.correctAnswer === 'number') {
          correctResponseIdx = q.correctAnswer;
        } else if (q.correct_answer !== undefined) {
          const strVal = String(q.correct_answer).trim();
          const idx = rawOptions.findIndex((opt: any) => String(opt).trim().toLowerCase() === strVal.toLowerCase());
          if (idx !== -1) {
            correctResponseIdx = idx;
          } else {
            if (strVal.length === 1) {
              const charIdx = strVal.toUpperCase().charCodeAt(0) - 65;
              if (charIdx >= 0 && charIdx < rawOptions.length) {
                correctResponseIdx = charIdx;
              }
            }
          }
        } else if (q.correctAnswer !== undefined) {
          const strVal = String(q.correctAnswer).trim();
          const idx = rawOptions.findIndex((opt: any) => String(opt).trim().toLowerCase() === strVal.toLowerCase());
          if (idx !== -1) {
            correctResponseIdx = idx;
          } else {
            if (strVal.length === 1) {
              const charIdx = strVal.toUpperCase().charCodeAt(0) - 65;
              if (charIdx >= 0 && charIdx < rawOptions.length) {
                correctResponseIdx = charIdx;
              }
            }
          }
        }

        return {
          question: q.question || "Question sans libellé",
          options: rawOptions.length > 0 ? rawOptions : ["Vrai", "Faux"],
          bonne_reponse: correctResponseIdx,
          explication: q.explication || q.explanation || "Explication résolue par le jury IA CampusBF."
        };
      });

      console.log("[Publish] Schema-mapped questions list length:", questionsListMapped.length);

      // Create primary search document inside Firestore collection 'public_service_contests'
      const contestRef = await addDoc(collection(db, 'public_service_contests'), {
        titre: customTitle || generatedQuiz.titre || "Concours d'État",
        description: customDescription || generatedQuiz.description || "Épreuve officielle corrigée.",
        categorie: category,
        niveau: level,
        annee: parseInt(year) || new Date().getFullYear(),
        type: 'qcm',
        duree: questionsListMapped.length * 1.5, // 1.5 minutes per objective question
        difficulte: 'moyen',
        status: 'active',
        validationStatus: 'published',
        createdAt: serverTimestamp(),
        aiGenerated: true,
        aiVerified: true,
        subjectFileUrl: publicUrl
      });

      // Save structural detail payload containing questions
      await setDoc(doc(db, 'public_service_contest_details', contestRef.id), {
        contestId: contestRef.id,
        questions: questionsListMapped,
        verificationLogs: ["Importé souverainement avec succès depuis le pipeline de traitement IA."]
      });

      console.log("[Publish] Write success, reference ID:", contestRef.id);
      
      toast.success("Le quiz a été structuré et enregistré avec succès dans 'Concours de l'État' !", { id: loadId });
      
      // Cleanup states
      setFile(null);
      setGeneratedQuiz(null);
      setCustomTitle('');
      setCustomDescription('');
    } catch (err: any) {
      console.error("[Publish] Publication process failed:", err);
      toast.error(`La publication a échoué: ${err.message || String(err)}`, { id: loadId });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setGeneratedQuiz(null);
    setCustomTitle('');
    setCustomDescription('');
    toast.success("Espace de travail réinitialisé.");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-emerald-500 animate-pulse h-5 w-5" />
            Traitement Concours IA
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Pipeline sécurisé : Extraction d'épreuves PDF/Image &rarr; Structuration QCM IA &rarr; Validation et Publication.
          </p>
        </div>
        {file && !isProcessing && (
          <button 
            onClick={handleReset}
            className="self-start text-[11px] font-black tracking-wider uppercase text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="p-8 space-y-8">
        {/* Upload Zone & Setup */}
        {!generatedQuiz && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <BookOpen size={13} className="text-emerald-500" /> Thème / Matière
                </label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={isProcessing}
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-700"
                >
                  {Object.entries(categoryLabels).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Education Level */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-emerald-500" /> Échelon / Niveau
                </label>
                <select 
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  disabled={isProcessing}
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-700"
                >
                  <option value="BEPC">BEPC</option>
                  <option value="BAC">BAC</option>
                  <option value="Licence">Licence</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              {/* Contest Year */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-500" /> Année
                </label>
                <input 
                  type="number" 
                  min="2000" 
                  max={new Date().getFullYear() + 1}
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  disabled={isProcessing}
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Drag & Drop zone */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50/30'}
                ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                <Upload className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Déposer l'épreuve officielle</h4>
              <p className="text-slate-400 text-xs mt-1">Glissez-déposez le PDF ou l'Image de l'épreuve originale (Max: 25 Mo)</p>
              <p className="text-[10px] bg-slate-100 text-slate-500 rounded py-1 px-2.5 max-w-xs mx-auto mt-4 font-mono font-bold uppercase tracking-wider">
                Formats acceptés : PDF, PNG, JPG, JPEG, WEBP
              </p>
            </div>

            {/* Selected File Details & Trigger */}
            {file && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 card-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-400">
                    <FileText className="text-emerald-600 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 break-all">{file.name}</p>
                    <p className="text-[11px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} Mo</p>
                  </div>
                </div>

                {!isProcessing && (
                  <button 
                    onClick={handleProcessExam}
                    className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    Découper et Structurer <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading Animation and descriptive steps */}
        {isProcessing && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                <Sparkles size={20} className="animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-slate-800">
                {processingStep === 'upload' && "1. Traitement préalable du fichier..."}
                {processingStep === 'ocr' && "2. Numérisation de l'épreuve (OCR)..."}
                {processingStep === 'ai_structuring' && "3. Structuration de l'épreuve par Gemini 3.5..."}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
                {processingStep === 'upload' && "Nous lisons les entêtes et préparons l'extraction."}
                {processingStep === 'ocr' && "Le document est analysé caractère par caractère pour en dégager le texte brut."}
                {processingStep === 'ai_structuring' && "L'éminent jury d'IA configure les QCM, résout les réponses et rédige les justifications."}
              </p>
            </div>

            {/* Progress Visual */}
            <div className="w-full max-w-xs bg-slate-50 border border-slate-100 p-1 rounded-full h-4 overflow-hidden relative shadow-inner">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        )}

        {/* Structured Output & Visual Validation Preview */}
        {generatedQuiz && !isProcessing && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Status Alert Banner */}
            <div className="p-5 bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-3xl relative overflow-hidden shadow-md">
              <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-bold uppercase tracking-widest mb-3">
                <CheckCircle size={15} /> Épreuve structurée avec succès par l'IA
              </div>
              <h4 className="text-lg font-black tracking-tight mb-2">Génération & Résolution Complètes</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed max-w-2xl">
                L'IA a transformé le contenu du document en QCM interactif burkinabè. Veuillez réviser les questions, modifier les métadonnées si désiré, puis publier officiellement le sujet corrigé.
              </p>
            </div>

            {/* Metadatas fine-tuning */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-4">
              <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                Ajustements des Métadonnées
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Titre personnalisé de l'examen</label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800"
                    placeholder="Ex: Concours ENA - Épreuve de Culture Générale"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Description / Cadre du sujet</label>
                  <input 
                    type="text" 
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs text-slate-700"
                    placeholder="Ex: Concours d'intégration de la magistrature au Burkina Faso"
                  />
                </div>
              </div>

              {/* Dynamic tag badges */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <BookOpen size={10} /> Thème : {categoryLabels[category]}
                </span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <GraduationCap size={10} /> Niveau : {level}
                </span>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <Calendar size={10} /> Session : {year}
                </span>
                <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <Clock size={10} /> {questionsListMappedQuantity(generatedQuiz)} questions résolues
                </span>
              </div>
            </div>

            {/* Questions list Accordion button */}
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setShowQuestions(!showQuestions)}
                className="flex items-center justify-between p-4.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 hover:bg-slate-100 transition-all text-xs font-black uppercase tracking-wider"
              >
                <div className="flex items-center gap-2">
                  {showQuestions ? <EyeOff size={16} className="text-slate-500" /> : <Eye size={16} className="text-slate-550" />}
                  <span>{showQuestions ? "Masquer" : "Afficher"} les questions du concours ({questionsListMappedQuantity(generatedQuiz)})</span>
                </div>
              </button>

              {/* Collapsible detailed view of questions */}
              {showQuestions && (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {(generatedQuiz.questions || []).map((q: any, i: number) => {
                    const rawOpts = q.options || q.choices || [];
                    // Find correct response index using helper mapping
                    let corIdx = 0;
                    if (typeof q.bonne_reponse === 'number') corIdx = q.bonne_reponse;
                    else if (typeof q.correctAnswerIndex === 'number') corIdx = q.correctAnswerIndex;
                    else if (typeof q.correctAnswer === 'number') corIdx = q.correctAnswer;
                    else if (q.correct_answer !== undefined) {
                      const str = String(q.correct_answer).trim();
                      const idx = rawOpts.findIndex((opt: any) => String(opt).trim().toLowerCase() === str.toLowerCase());
                      if (idx !== -1) corIdx = idx;
                      else if (str.length === 1) {
                        const charIdx = str.toUpperCase().charCodeAt(0) - 65;
                        if (charIdx >= 0 && charIdx < rawOpts.length) corIdx = charIdx;
                      }
                    } else if (q.correctAnswer !== undefined) {
                      const str = String(q.correctAnswer).trim();
                      const idx = rawOpts.findIndex((opt: any) => String(opt).trim().toLowerCase() === str.toLowerCase());
                      if (idx !== -1) corIdx = idx;
                      else if (str.length === 1) {
                        const charIdx = str.toUpperCase().charCodeAt(0) - 65;
                        if (charIdx >= 0 && charIdx < rawOpts.length) corIdx = charIdx;
                      }
                    }

                    return (
                      <div key={i} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-4 transition-colors hover:border-slate-200">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                          <span className="text-slate-400">Question {i + 1}</span>
                          <span className="bg-emerald-50 px-2 py-0.5 rounded text-emerald-700 border border-emerald-100">
                            Index correct : {corIdx} ({String.fromCharCode(65 + corIdx)})
                          </span>
                        </div>

                        <p className="text-slate-800 text-xs font-bold leading-relaxed">{q.question || "Libellé vide"}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {rawOpts.map((opt: string, optIdx: number) => (
                            <div 
                              key={optIdx} 
                              className={`p-3 rounded-xl border transition-all text-xs font-medium flex items-center gap-2 
                                ${optIdx === corIdx 
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 font-bold' 
                                  : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                            >
                              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono border ${optIdx === corIdx ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>

                        {/* Explanation block */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 italic leading-relaxed">
                          <span className="font-bold text-slate-700 not-italic block uppercase text-[8px] tracking-wider mb-1">Justification du Jury :</span>
                          {q.explication || q.explanation || "Aucune justification fournie."}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
              <button 
                onClick={handleReset}
                disabled={isPublishing}
                className="py-3.5 px-6 border-2 border-slate-200 rounded-xl font-bold text-slate-500 text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
              >
                <Trash2 size={16} /> Rejeter
              </button>
              
              <button 
                onClick={handlePublishQuiz}
                disabled={isPublishing}
                className="py-3.5 px-6 bg-slate-900 border-2 border-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 shadow-md"
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Publication...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Publier le Concours (Corrigé)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to Safely calculate structured questions length
function questionsListMappedQuantity(quiz: any): number {
  if (!quiz || !quiz.questions) return 0;
  return quiz.questions.length;
}

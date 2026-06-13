import React, { useState } from 'react';
import { Sparkles, Loader2, ShieldCheck, CheckCircle, AlertTriangle, Play, Save, RotateCw, ListFilter, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PSContest, PSVerificationResult, PSQuestion, aiContestService } from '@/services/aiContestService';

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

export function AIContestGenerator({ onContestCreated, onCancel }: { onContestCreated?: () => void, onCancel?: () => void }) {
  const [activeStep, setActiveStep] = useState<'config' | 'generating' | 'verifying' | 'review'>('config');
  const [config, setConfig] = useState({
    category: 'culture_generale',
    level: 'BAC',
    questionCount: 10
  });
  
  const [generatedContest, setGeneratedContest] = useState<PSContest | null>(null);
  const [verificationResult, setVerificationResult] = useState<PSVerificationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  // 1. GENERATION 
  const handleGenerate = async () => {
    console.log("[AI Generator] handleGenerate called", config);
    setIsProcessing(true);
    setActiveStep('generating');
    try {
      const response = await fetch('/api/public-service/generate-contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        let errorData: any = {};
        try {
           errorData = await response.json();
        } catch(e) {}
        throw new Error(errorData.error || `Erreur serveur ${response.status}`);
      }
      
      const contest = await response.json();
      console.log("[AI Generator] Received contest", contest.titre);
      setGeneratedContest(contest);
      toast.success('Concours généré avec succès !');
      
      // Auto move to verification step UI
      setActiveStep('verifying');
      await handleVerify(contest);
    } catch (err: any) {
      console.error("[AI Generator] Generation error:", err);
      toast.error(err.message || 'Échec de la génération');
      setActiveStep('config');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. DOUBLE VERIFICATION IA
  const handleVerify = async (contest: PSContest) => {
    console.log("[AI Generator] handleVerify called for", contest.titre);
    setIsProcessing(true);
    setActiveStep('verifying');
    try {
      const response = await fetch('/api/public-service/verify-contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: contest.titre,
          category: config.category,
          level: config.level,
          questions: contest.questions
        })
      });
      
      if (!response.ok) {
        let errorData: any = {};
        try {
           errorData = await response.json();
        } catch(e) {}
        throw new Error(errorData.error || `Erreur serveur ${response.status}`);
      }
      
      const result = await response.json();
      console.log("[AI Generator] Verification result received", result.questionsChecked, "questions");
      setVerificationResult(result);
      
      if (result.correctedQuestions && result.correctedQuestions.length > 0) {
        setGeneratedContest(prev => prev ? { ...prev, questions: result.correctedQuestions } : null);
      }
      
      toast.success('Vérification IA terminée !');
      setActiveStep('review');
    } catch (err: any) {
      toast.error(err.message || 'Échec de la vérification');
      setActiveStep('review'); // Still let user review what we have
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. VALIDATION & SAVE
  const handleSave = async (status: 'draft' | 'published') => {
    if (!generatedContest) return;
    
    const tId = toast.loading('Enregistrement du concours...');
    try {
      // Call the server-side API endpoint for high reliability (especially when in offline/restricted iframe mode)
      const response = await fetch('/api/public-service/save-contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatedContest,
          config,
          verificationResult,
          status
        })
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {}
        throw new Error(errorData.error || `Erreur serveur ${response.status}`);
      }

      const resData = await response.json();
      console.log("[AI Generator] Contest saved successfully via backend API, ID:", resData.id);

      toast.success(status === 'published' ? 'Concours publié !' : 'Enregistré en brouillon', { id: tId });
      
      setGeneratedContest(null);
      setVerificationResult(null);
      setActiveStep('config');
      if (onContestCreated) onContestCreated();
    } catch (err: any) {
      console.error("[AI Generator] Save error:", err);
      toast.error(`Erreur d'enregistrement: ${err.message || err}`, { id: tId });
    }
  };

  const handleReset = () => {
    setGeneratedContest(null);
    setVerificationResult(null);
    setActiveStep('config');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-emerald-500" />
            Générateur de Concours IA
          </h3>
          <p className="text-sm text-slate-500">Système sécurisé avec double vérification IA & validation</p>
        </div>
        <div className="flex items-center gap-4">
          {activeStep !== 'config' && !isProcessing && (
             <button 
               onClick={handleReset}
               className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider flex items-center gap-1"
             >
               <RotateCw size={14} /> Réinitialiser
             </button>
          )}
          <button 
            onClick={onCancel}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl font-bold text-xs transition-all border border-slate-200"
            title="Fermer le générateur"
          >
            <X size={16} />
            <span>Fermer</span>
          </button>
        </div>
      </div>

      <div className="p-8">
        {activeStep === 'config' && (
          <div className="space-y-6 max-w-xl mx-auto">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Catégorie / Thème</label>
                  <select 
                    value={config.category}
                    onChange={e => setConfig({...config, category: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {Object.entries(categoryLabels).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Niveau d'étude</label>
                  <select 
                    value={config.level}
                    onChange={e => setConfig({...config, level: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="BEPC">BEPC</option>
                    <option value="BAC">BAC</option>
                    <option value="Licence">Licence</option>
                    <option value="Master">Master</option>
                  </select>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <ListFilter size={14} className="text-emerald-500" />
                    Nombre de questions
                  </label>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100 text-sm">
                    {config.questionCount} questions
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    step="5"
                    value={config.questionCount}
                    onInput={e => setConfig({...config, questionCount: parseInt((e.target as HTMLInputElement).value)})}
                    className="w-full h-2 bg-slate-100 rounded-lg cursor-pointer accent-emerald-600 hover:bg-slate-200 transition-colors"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                  <span>5</span>
                  <span>15</span>
                  <span>25</span>
                  <span>35</span>
                  <span>50</span>
                </div>
             </div>

             <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="text-emerald-600" size={20} />
                  <span className="font-bold text-emerald-950 text-sm">Contrôle Qualité IA</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Le système va générer {config.questionCount} questions factuelles basées sur le programme des concours au Burkina Faso, 
                  puis un second agent IA vérifiera l'exactitude avant de vous soumettre le brouillon.
                </p>
             </div>

             <button 
               onClick={handleGenerate}
               className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
             >
               <Sparkles size={20} />
               Générer le concours
             </button>
          </div>
        )}

        {(activeStep === 'generating' || activeStep === 'verifying') && (
           <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                  {activeStep === 'generating' ? <Sparkles size={32} /> : <ShieldCheck size={32} />}
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 tracking-tight">
                  {activeStep === 'generating' ? 'Génération de l\'épreuve...' : 'Vérification IA en cours...'}
                </h4>
                <p className="text-slate-500 max-w-sm mt-1">
                  {activeStep === 'generating' 
                    ? 'L\'intelligence artificielle assemble des questions pertinentes pour le niveau ' + config.level 
                    : 'Le second agent IA vérifie les dates et les clés de réponse.'}
                </p>
              </div>
           </div>
        )}

        {activeStep === 'review' && generatedContest && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                   <CheckCircle size={14} /> Épreuve validée par IA
                </div>
                <h4 className="text-2xl font-bold mb-3">{generatedContest.titre}</h4>
                <p className="text-slate-400 text-sm italic">"{generatedContest.description}"</p>
                
                <div className="flex flex-wrap gap-4 mt-8">
                   <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-medium">
                      {generatedContest.questions.length} Questions
                   </div>
                   <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-medium">
                      Niveau : {config.level}
                   </div>
                   <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-medium">
                      Thème : {categoryLabels[config.category]}
                   </div>
                </div>
             </div>

             {verificationResult && (
               <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                  <h5 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <ListFilter size={18} /> Rapport de Double Vérification IA
                  </h5>
                  <div className="space-y-2">
                    {verificationResult.logs.map((log, i) => (
                      <div key={i} className="flex gap-3 text-xs text-blue-800 leading-relaxed bg-white/50 p-2.5 rounded-lg">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                        {log}
                      </div>
                    ))}
                    {verificationResult.logs.length === 0 && (
                      <p className="text-xs text-blue-600 italic">Aucune erreur détectée lors de l'audit automatique.</p>
                    )}
                  </div>
               </div>
             )}

             <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setShowQuestions(!showQuestions)}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 hover:bg-slate-100 transition-all font-medium text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-slate-400" />
                    <span>{showQuestions ? 'Masquer' : 'Voir'} le détail des questions</span>
                  </div>
                  <span className="text-xs text-slate-400">({generatedContest.questions.length} questions)</span>
                </button>

                {showQuestions && (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {generatedContest.questions.map((q, i) => (
                      <div key={i} className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Question {i + 1}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-[10px] text-emerald-600 font-bold rounded uppercase">
                            Clé: {String.fromCharCode(65 + q.bonne_reponse)}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 mb-4">{q.question}</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                           {q.options.map((opt, oIdx) => (
                             <div key={oIdx} className={`p-2.5 rounded-xl text-xs border ${oIdx === q.bonne_reponse ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-medium' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                               {String.fromCharCode(65 + oIdx)}. {opt}
                             </div>
                           ))}
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 italic leading-relaxed">
                          <span className="font-bold text-slate-700 not-italic">Justification :</span> {q.explication}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                <button 
                  onClick={() => handleSave('draft')}
                  className="py-4 px-6 border-2 border-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Brouillon
                </button>
                <button 
                  onClick={() => handleSave('published')}
                  className="py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                >
                  <Play size={18} /> Publier Officiellement
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

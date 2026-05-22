import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  Shield, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  Share2,
  RefreshCw,
  Home,
  Camera,
  Video,
  Eye,
  EyeOff
} from 'lucide-react';
import { PublicServiceContest, PublicServiceQuestion, ResultAnswer } from '@/types';
import { publicServiceExamService } from '@/services/publicServiceExamService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PublicServiceExamPlayerProps {
  contest: PublicServiceContest;
  onClose: () => void;
}

export default function PublicServiceExamPlayer({ contest, onClose }: PublicServiceExamPlayerProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'instructions' | 'exam' | 'results' | 'correction'>('instructions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, { selectedOption: number, comment?: string }>>({});
  const [timeLeft, setTimeLeft] = useState(contest.duree * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentComment, setCurrentComment] = useState("");
  const [cheatCount, setCheatCount] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Camera handling
  useEffect(() => {
    if ((currentStep === 'instructions' || currentStep === 'exam') && !cameraStream) {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn("Camera API not available");
        return;
      }
      
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          setCameraStream(stream);
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => {
          console.warn("Camera access denied or not available", err);
          toast.error("L'accès à la caméra est recommandé pour cet examen sécurisé.");
        });
    }
    
    // Auto-attach stream to video element when it might have been unmounted/remounted
    if (cameraStream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = cameraStream;
    }

    return () => {
      if (isFinished) {
        cameraStream?.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentStep, cameraStream, isFinished]);

  useEffect(() => {
    // Reset comment when question changes
    setCurrentComment(userAnswers[currentQuestionIndex]?.comment || "");
  }, [currentQuestionIndex, userAnswers]);

  const handleUpdateAnswer = (optionIdx: number) => {
    setUserAnswers(prev => ({ 
      ...prev, 
      [currentQuestionIndex]: { 
        ...prev[currentQuestionIndex], 
        selectedOption: optionIdx 
      } 
    }));
  };

  const handleUpdateComment = (comment: string) => {
    setCurrentComment(comment);
    setUserAnswers(prev => ({ 
      ...prev, 
      [currentQuestionIndex]: { 
        ...prev[currentQuestionIndex], 
        comment: comment 
      } 
    }));
  };

  // Security: Prevent Back Navigation and Text Selection
  useEffect(() => {
    if (currentStep === 'exam') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setCheatCount(prev => prev + 1);
          toast.error("ALERTE : Changement d'onglet détecté ! Ce comportement frauduleux est enregistré.");
          if (user) {
            publicServiceExamService.logCheatIncident({
              userId: user.id,
              contestId: contest.id,
              type: 'tab_switch',
              details: `Tentative de changement d'onglet ou réduction de fenêtre.`
            });
          }
        }
      };

      const handleBlur = () => {
        setCheatCount(prev => prev + 1);
        toast.warning("Attention : Perte de focus sur la fenêtre d'examen.");
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      
      // Disable text selection
      document.body.style.userSelect = 'none';
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        document.body.style.userSelect = 'auto';
      };
    }
  }, [currentStep, user, contest.id]);

  // Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 'exam' && timeLeft > 0 && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, timeLeft, isFinished]);

  const handleFinish = useCallback(async () => {
    if (isFinished) return;
    setIsFinished(true);

    // Calculate score
    let totalCorrect = 0;
    const answersArray: ResultAnswer[] = contest.questions.map((q, idx) => {
      const answer = userAnswers[idx] || { selectedOption: -1 };
      if (answer.selectedOption === q.bonne_reponse) {
        totalCorrect++;
      }
      return {
        questionIndex: idx,
        selectedOption: answer.selectedOption,
        comment: answer.comment || ""
      };
    });
    
    const finalScore = Math.round((totalCorrect / contest.questions.length) * 100);
    setScore(finalScore);
    
    // Save to Firestore
    try {
      if (user) {
        await publicServiceExamService.saveResult({
          user_id: user.id,
          concours_id: contest.id,
          score: finalScore,
          total_questions: contest.questions.length,
          temps: Math.floor((Date.now() - startTime) / 1000),
          answers: answersArray
        });
      }
    } catch (error) {
      console.error("Failed to save exam result:", error);
    }

    setCurrentStep('results');
  }, [contest, userAnswers, user, isFinished, startTime]);

  const handleNext = () => {
    if (currentQuestionIndex < contest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!contest.questions || contest.questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-white/10 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erreur de chargement</h2>
          <p className="text-slate-400 mb-6">Ce concours ne contient aucune question ou n'a pas pu être chargé correctement.</p>
          <button onClick={onClose} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = contest.questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/5 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-white/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{contest.categorie}</div>
            <div className="text-sm font-medium text-white line-clamp-1">{contest.titre}</div>
          </div>
        </div>

        {currentStep === 'exam' && (
          <div className="flex items-center gap-6">
            {cheatCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-bold text-rose-500 uppercase">Signalements : {cheatCount}</span>
              </div>
            )}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${
              timeLeft < 60 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-white/5 border-white/10'
            }`}>
              <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
              <span className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-rose-400' : 'text-white'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        )}

                <div className="hidden sm:block">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-white/70 uppercase">
              {currentStep === 'correction' ? 'Mode Correction' : 'Mode Examen Sécurisé'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-8">
        {/* Camera Surveillance Fixed PIP */}
        {(currentStep === 'exam' || currentStep === 'instructions') && cameraStream && (
          <motion.div 
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            className="fixed bottom-8 right-8 w-48 h-36 bg-slate-800 rounded-2xl border-2 border-emerald-500/30 shadow-2xl overflow-hidden z-50 group"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className={cn("w-full h-full object-cover", !showCamera && "hidden")} 
            />
            {!showCamera && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white/30 p-4 text-center">
                <Camera size={32} className="mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Flux Masqué</span>
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-2">
              <button 
                onClick={() => setShowCamera(!showCamera)}
                className="p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-black/60 transition-colors"
                title={showCamera ? "Masquer ma caméra" : "Afficher ma caméra"}
              >
                {showCamera ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 bg-emerald-500/20 backdrop-blur-md rounded-lg border border-emerald-500/30">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-bold text-white uppercase tracking-tighter">LIVE PROCTORING</span>
            </div>
          </motion.div>
        )}

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {currentStep === 'instructions' && (
              <motion.div
                key="instructions"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 border border-white/5 shadow-2xl"
              >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                  <Shield className="w-10 h-10 text-emerald-400" />
                </div>
                
                <h2 className="text-3xl font-bold text-white text-center mb-4">Instructions de l'Examen</h2>
                <p className="text-slate-400 text-center mb-10 text-lg leading-relaxed">
                  Veuillez lire attentivement les consignes avant de commencer. 
                  Ce test est conçu pour simuler les conditions réelles d'un concours.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Clock className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Durée Limitée</div>
                      <div className="text-xs text-slate-500">Vous avez {contest.duree} minutes pour terminer l'intégralité du test.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Shield className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Anti-Triche Actif</div>
                      <div className="text-xs text-slate-500">Le copier-coller et le clic droit sont désactivés durant le test.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <AlertCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Score Immédiat</div>
                      <div className="text-xs text-slate-500">Votre score et le corrigé détaillé s'afficheront dès la fin du test.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Trophy className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Classement</div>
                      <div className="text-xs text-slate-500">Tes performances impactent ton classement national CampusBF.</div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 mb-10">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-500 font-medium leading-relaxed">
                    IMPORTANT : Ne rechargez pas la page et ne quittez pas le plein écran. 
                    Toute tentative de sortie du mode examen peut entraîner l'annulation de votre test.
                  </p>
                </div>

                <button 
                  onClick={() => setCurrentStep('exam')}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Commencer l'examen
                </button>
              </motion.div>
            )}

            {(currentStep === 'exam' || currentStep === 'correction') && (
              <motion.div
                key="exam"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Progress Bar */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-black text-white/50 uppercase tracking-widest">
                      {currentStep === 'correction' ? 'Correction ' : ''}Question {currentQuestionIndex + 1} sur {contest.questions.length}
                    </div>
                    <div className="text-2xl font-black text-white">
                      {Math.round(((currentQuestionIndex + 1) / contest.questions.length) * 100)}%
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / contest.questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Card */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-2xl">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-10 leading-relaxed italic">
                    « {currentQuestion.question} »
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = userAnswers[currentQuestionIndex]?.selectedOption === idx;
                      let buttonClass = '';
                      let icon = null;
                      
                      if (currentStep === 'exam') {
                        buttonClass = isSelected 
                          ? 'bg-emerald-600 border-emerald-500 shadow-xl shadow-emerald-500/10' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10';
                        if (isSelected) {
                          icon = <CheckCircle2 className="w-6 h-6 text-white" />;
                        }
                      } else if (currentStep === 'correction') {
                        const isCorrectAnswer = currentQuestion.bonne_reponse === idx;
                        
                        if (isCorrectAnswer) {
                          buttonClass = 'bg-emerald-600 border-emerald-500 text-white';
                          icon = <CheckCircle2 className="w-6 h-6 text-white" />;
                        } else if (isSelected && !isCorrectAnswer) {
                          buttonClass = 'bg-rose-500/20 border-rose-500/50 text-white';
                          icon = <X className="w-6 h-6 text-rose-400" />;
                        } else {
                          buttonClass = 'bg-white/5 border-white/5 opacity-50';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={currentStep === 'correction'}
                          onClick={() => currentStep === 'exam' && handleUpdateAnswer(idx)}
                          className={`group w-full p-6 rounded-3xl border text-left transition-all relative overflow-hidden flex items-center gap-4 ${buttonClass}`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                            currentStep === 'exam' && isSelected ? 'bg-white text-emerald-600' : 
                            (currentStep === 'correction' && currentQuestion.bonne_reponse === idx ? 'bg-white text-emerald-600' : 'bg-white/10 text-white/50')
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={`text-base font-medium transition-all ${
                            (currentStep === 'exam' && isSelected) || (currentStep === 'correction' && currentQuestion.bonne_reponse === idx) ? 'text-white' : 'text-slate-300'
                          }`}>
                            {option}
                          </span>
                          
                          {icon && (
                            <div className="absolute right-6">
                              {icon}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {userAnswers[currentQuestionIndex]?.selectedOption !== undefined && (
                    <div className="mt-8 space-y-2">
                       {currentStep === 'correction' && currentQuestion.explication && (
                         <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-sm font-bold text-blue-400 mb-1">Explication :</p>
                            <p className="text-sm text-blue-200">{currentQuestion.explication}</p>
                         </div>
                       )}
                      <label className="text-sm font-bold text-white/70">Commentaire {currentStep === 'correction' ? 'saisi pendant l\'examen' : '(optionnel)'} :</label>
                      <textarea
                        value={currentComment}
                        disabled={currentStep === 'correction'}
                        onChange={(e) => handleUpdateComment(e.target.value)}
                        placeholder={currentStep === 'correction' ? "Aucun commentaire saisi" : "Ajouter une remarque..."}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-75 disabled:resize-none"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4 pt-4">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-8 py-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl text-white font-bold text-sm transition-all flex items-center gap-3 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Précédent
                  </button>
                  
                  {currentStep === 'correction' && currentQuestionIndex === contest.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep('results')}
                      className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold text-sm transition-all shadow-xl shadow-indigo-500/10 flex items-center gap-3"
                    >
                      Retour aux résultats
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={currentStep === 'exam' && userAnswers[currentQuestionIndex] === undefined}
                      className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-bold text-sm transition-all shadow-xl shadow-emerald-500/10 flex items-center gap-3 disabled:opacity-50 disabled:grayscale"
                    >
                      {currentStep === 'exam' && currentQuestionIndex === contest.questions.length - 1 ? 'Terminer l\'examen' : 'Suivant'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 rounded-[3rem] p-8 sm:p-12 border border-white/5 shadow-2xl text-center overflow-hidden relative"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl rotate-12">
                  <Trophy className="w-12 h-12 text-white -rotate-12" />
                </div>

                <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">Examen Terminé !</h2>
                <p className="text-slate-400 mb-10 text-sm font-medium tracking-wide">TES RÉSULTATS ONT ÉTÉ ENREGISTRÉS AVEC SUCCÈS.</p>

                <div className="relative mb-12">
                  <div className="text-[120px] font-black text-white/5 leading-none absolute inset-0 flex items-center justify-center pointer-events-none tracking-tighter">
                    {score}%
                  </div>
                  <div className="relative z-10">
                    <div className="text-7xl font-black text-white tracking-tighter mb-2">{score}%</div>
                    <div className={`text-sm font-bold py-1 px-4 rounded-full w-fit mx-auto ${
                      score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                      score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {score >= 80 ? 'EXCELLENT TRAVAIL !' : score >= 50 ? 'PAS MAL, CONTINUE !' : 'REVOIS TES BASES'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="text-2xl font-black text-white mb-1">
                      {contest.questions.filter((q, idx) => userAnswers[idx]?.selectedOption === q.bonne_reponse).length} / {contest.questions.length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Réponses Justes</div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="text-2xl font-black text-white mb-1">
                      {formatTime(Math.floor((Date.now() - startTime) / 1000))}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Temps Écoulé</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={onClose}
                    className="py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-bold flex items-center justify-center gap-3 transition-all border border-white/5"
                  >
                    <Home className="w-5 h-5" />
                    Retour à l'accueil
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentQuestionIndex(0);
                      setCurrentStep('correction');
                    }}
                    className="py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/10"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Voir la correction
                  </button>
                </div>

                <button 
                  onClick={() => {
                    // Logic to restart could be added here
                    window.location.reload();
                  }}
                  className="mt-8 text-slate-500 hover:text-white transition-colors text-sm font-bold flex items-center justify-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Réessayer un autre test
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const Play = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Brain, Sparkles, BookOpen, Clock, Settings, Save, List, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Quiz, QuizQuestion } from '@/types';
import { quizService } from '@/services/quizService';
import { generateAdvancedQuizWithAI } from '@/services/geminiService';
import toast from 'react-hot-toast';

export const QuizBuilder: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('Licence 1');
  const [duration, setDuration] = useState<number>(30); // minutes
  
  // Advanced settings
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [attemptsLimit, setAttemptsLimit] = useState<number>(0); // 0 = unlimited
  const [penaltyPerWrongAnswer, setPenaltyPerWrongAnswer] = useState<number>(0);
  const [showCorrections, setShowCorrections] = useState<'always' | 'never' | 'after_submit'>('after_submit');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI Generation params
  const [courseText, setCourseText] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [aiDifficulty, setAiDifficulty] = useState('Moyen');
  const [aiLanguage, setAiLanguage] = useState('Français');
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple_choice', 'true_false', 'short_answer']);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated questions
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const toggleQuestionType = (type: string) => {
    setQuestionTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerateAI = async () => {
    if (!courseText.trim() || !subject.trim() || questionTypes.length === 0) {
      toast.error('Veuillez remplir le sujet, le texte source et choisir au moins un type de question.');
      return;
    }

    const loadingToast = toast.loading('Analyse du texte et génération du quiz en cours...');
    setIsGenerating(true);

    try {
      const result = await generateAdvancedQuizWithAI(courseText, subject, level, numQuestions, {
        difficulty: aiDifficulty,
        language: aiLanguage,
        questionTypes: questionTypes
      });

      if (result) {
        if (!title) setTitle(result.title);
        setQuestions(result.questions);
        toast.success(`Généré avec succès ! (${result.questions.length} questions importées)`, { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la génération.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!title.trim() || questions.length === 0 || !user) {
      toast.error('Veuillez donner un titre et générer des questions.');
      return;
    }

    const toastId = toast.loading('Sauvegarde du quiz...');
    try {
      const newQuiz: Omit<Quiz, 'id' | 'createdAt'> = {
        title,
        description: `Quiz de ${subject} - Niveau ${level}`,
        subject,
        level,
        creatorId: user.id,
        creatorName: `${user.firstName} ${user.lastName}`,
        type: user.role === 'teacher' || user.role === 'admin' ? 'teacher' : 'ai',
        duration,
        questions,
        settings: {
          shuffleQuestions,
          shuffleAnswers,
          attemptsLimit,
          penaltyPerWrongAnswer,
          showCorrections
        }
      };

      await quizService.addQuiz(newQuiz);
      toast.success('Quiz créé avec succès !', { id: toastId });
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde.', { id: toastId });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="text-purple-600" size={32} />
              Générateur IA de Quiz Avancé
            </h1>
            <p className="text-slate-500 mt-2">Créez automatiquement des quiz académiques similaires à Moodle avec l'IA.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold">Annuler</button>
            <button 
              onClick={handleSaveQuiz}
              disabled={questions.length === 0}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              Publier le Quiz
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: SETTINGS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-blue-600" />
                Informations Générales
              </h2>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Titre du quiz <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Ex: Examen Final Biologie" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Matière <span className="text-red-500">*</span></label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Ex: Biologie Cellulaire" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Niveau</label>
                  <select value={level} onChange={e => setLevel(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                    <option>Licence 1</option><option>Licence 2</option><option>Licence 3</option><option>Master 1</option><option>Master 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Durée (min)</label>
                  <input type="number" min={5} value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <Settings size={20} className="text-slate-500" />
                  Paramètres Avancés (Moodle)
                </span>
                {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {showAdvanced && (
                <div className="p-6 pt-2 space-y-4 border-t border-slate-100 bg-slate-50">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700">Ordre aléatoire des questions</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={shuffleAnswers} onChange={e => setShuffleAnswers(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700">Mélanger les réponses (QCM)</span>
                  </label>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Limite de tentatives (0 = illimité)</label>
                    <input type="number" min={0} value={attemptsLimit} onChange={e => setAttemptsLimit(Number(e.target.value))} className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pénalité mauvaise réponse (Points)</label>
                    <input type="number" min={0} step={0.5} value={penaltyPerWrongAnswer} onChange={e => setPenaltyPerWrongAnswer(Number(e.target.value))} className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Affichage des corrections</label>
                    <select value={showCorrections} onChange={e => setShowCorrections(e.target.value as any)} className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none">
                      <option value="after_submit">Après la soumission finale</option>
                      <option value="always">Immédiatement après chaque question</option>
                      <option value="never">Ne jamais afficher</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: GENERATION & PREVIEW */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-6 text-white">
              <h2 className="font-bold text-xl flex items-center gap-2 mb-4">
                <Brain size={24} />
                Génération par l'IA (Gemini)
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Texte / Cours source <span className="text-red-300">*</span></label>
                  <textarea 
                    value={courseText} 
                    onChange={e => setCourseText(e.target.value)} 
                    placeholder="Copiez-collez le texte de votre cours, notes ou chapitre ici..." 
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl outline-none placeholder:text-white/40 focus:bg-white/20 transition-all min-h-[150px] resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Questions à générer (max recommandé: 20)</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={50} 
                      value={numQuestions} 
                      onChange={e => setNumQuestions(Number(e.target.value))} 
                      className={`w-full p-3 bg-white/10 border rounded-xl outline-none transition-colors ${numQuestions > 20 ? 'border-orange-400' : 'border-white/20'}`} 
                    />
                    {numQuestions > 20 && <p className="text-[10px] text-orange-200 mt-1 font-medium">⚠️ Trop de questions peuvent être tronquées par l'IA.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Difficulté IA</label>
                    <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-xl outline-none text-slate-800">
                      <option>Facile</option><option>Moyen</option><option>Difficile</option><option>Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Types de questions autorisés</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'multiple_choice', label: 'QCM' },
                      { id: 'true_false', label: 'Vrai/Faux' },
                      { id: 'short_answer', label: 'Rép. courte' },
                      { id: 'matching', label: 'Correspondance' },
                      { id: 'numerical', label: 'Numérique' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => toggleQuestionType(type.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          questionTypes.includes(type.id) 
                            ? 'bg-white text-purple-700 border-white' 
                            : 'bg-transparent text-white/70 border-white/30 hover:border-white'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="w-full py-4 mt-2 bg-white text-purple-700 rounded-xl font-bold hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {isGenerating ? <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={20} />}
                  {isGenerating ? 'Génération en cours...' : 'Générer le Quiz depuis le texte'}
                </button>
              </div>
            </div>

            {/* PREVIEW OF QUESTIONS */}
            {questions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                  <List size={20} className="text-slate-500" />
                  Aperçu des questions ({questions.length})
                </h2>
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">{q.type}</span>
                        <span className="text-sm font-bold text-slate-400">Q{idx + 1}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2">{q.question}</h3>
                      
                      {q.type === 'multiple_choice' || q.type === 'true_false' ? (
                        <div className="space-y-1 mb-3">
                          {q.options?.map((opt, i) => (
                            <div key={i} className={`text-sm p-2 rounded-lg ${q.correctAnswerIndex === i ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200' : 'bg-white border text-slate-600'}`}>
                              {opt}
                            </div>
                          ))}
                        </div>
                      ) : q.type === 'short_answer' || q.type === 'numerical' ? (
                        <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 font-bold rounded-lg text-sm border border-emerald-200">
                          Réponse attendue : {q.correctTextAnswer || q.correctNumericAnswer}
                        </div>
                      ) : null}

                      {q.explanation && (
                        <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                          💡 <b>Explication :</b> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

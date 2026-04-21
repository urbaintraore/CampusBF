import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { generateQuizWithAI } from '@/services/geminiService';
import { Brain, Sparkles, BookOpen, Plus, Play, Layers, Key } from 'lucide-react';
import { Quiz, QuizQuestion } from '@/types';
import { QuizPlayer } from '@/components/QuizPlayer';
import { FlashcardPlayer } from '@/components/FlashcardPlayer';
import { QuizCreator } from '@/components/QuizCreator';
import toast from 'react-hot-toast';

export default function Quizzes() {
  const { user, quizzes, addQuiz } = useAuth();
  const [activeTab, setActiveTab] = useState<'explore' | 'ai' | 'flashcards'>('explore');
  const [showCreator, setShowCreator] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeFlashcards, setActiveFlashcards] = useState<Quiz | null>(null);

  // AI Generator State
  const [aiSubject, setAiSubject] = useState('');
  const [aiLevel, setAiLevel] = useState('Licence 1');
  const [aiNumQuestions, setAiNumQuestions] = useState<number>(20);
  const [aiDifficulty, setAiDifficulty] = useState('Moyen');
  const [aiLanguage, setAiLanguage] = useState('Français');
  const [aiInstructions, setAiInstructions] = useState('');
  const [customApiKey, setCustomApiKey] = useState(typeof window !== 'undefined' ? localStorage.getItem('CAMPUSBF_QUIZ_API_KEY') || '' : '');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAIQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSubject.trim()) return;

    if (customApiKey) {
      localStorage.setItem('CAMPUSBF_QUIZ_API_KEY', customApiKey.trim());
    } else {
      localStorage.removeItem('CAMPUSBF_QUIZ_API_KEY');
    }

    const loadingToast = toast.loading('Génération du quiz par l\'IA...');
    try {
      setIsGenerating(true);
      const questions = await generateQuizWithAI(aiSubject, aiLevel, aiNumQuestions, {
        difficulty: aiDifficulty,
        language: aiLanguage,
        instructions: aiInstructions
      });
      
      const newQuiz: Omit<Quiz, 'id' | 'createdAt'> = {
        title: `Quiz IA : ${aiSubject} (${aiNumQuestions} questions)`,
        description: `Quiz généré par l'IA pour le niveau ${aiLevel}.`,
        subject: aiSubject,
        level: aiLevel,
        creatorId: 'ai',
        creatorName: 'Gemini IA',
        questions,
        type: 'ai'
      };

      await addQuiz(newQuiz);
      setAiSubject('');
      toast.success('Quiz généré avec succès !', { id: loadingToast });
      setActiveTab('explore');
    } catch (error: any) {
      console.error('Quiz Generation Error:', error);
      toast.error(error.message || 'Erreur lors de la génération du quiz.', { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  if (activeQuiz) {
    return <QuizPlayer quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />;
  }

  if (activeFlashcards) {
    return <FlashcardPlayer quiz={activeFlashcards} onClose={() => setActiveFlashcards(null)} />;
  }

  if (showCreator) {
    return <QuizCreator onClose={() => setShowCreator(false)} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="text-emerald-600" size={32} />
            Révisions & Quiz
          </h1>
          <p className="text-slate-500 mt-2">Générez des quiz avec l'IA ou révisez avec les quiz des enseignants.</p>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <button
            onClick={() => setShowCreator(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            Créer un Quiz
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('explore')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'explore' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen size={16} />
          Explorer
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ai' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles size={16} />
          Générateur IA
        </button>
      </div>

      {activeTab === 'explore' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  quiz.type === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {quiz.type === 'ai' ? <Sparkles size={12} /> : <BookOpen size={12} />}
                  {quiz.type === 'ai' ? 'Généré par IA' : 'Enseignant'}
                </div>
                <span className="text-xs font-medium text-slate-400">{quiz.level}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{quiz.title}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{quiz.description}</p>
              
              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveQuiz(quiz)}
                  className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <Play size={16} />
                  Jouer
                </button>
                <button
                  onClick={() => setActiveFlashcards(quiz)}
                  className="flex-1 py-2 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <Layers size={16} />
                  Flashcards
                </button>
              </div>
            </div>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
              <Brain className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-bold text-slate-900 mb-1">Aucun quiz disponible</h3>
              <p className="text-slate-500">Générez-en un avec l'IA ou attendez qu'un enseignant en crée un.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Générateur de Quiz IA Avancé</h2>
            <p className="text-slate-500 mt-2">Paramétrez votre quiz sur mesure pris en charge par Gemini 1.5 Flash.</p>
          </div>

          <form onSubmit={handleGenerateAIQuiz} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Sujet à réviser <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={aiSubject}
                onChange={(e) => setAiSubject(e.target.value)}
                placeholder="Ex: La photosynthèse, Histoire de la Seconde Guerre Mondiale..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Niveau d'études</label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                >
                  <option value="Collège">Collège</option>
                  <option value="Lycée">Lycée</option>
                  <option value="Licence 1">Licence 1</option>
                  <option value="Licence 2">Licence 2</option>
                  <option value="Licence 3">Licence 3</option>
                  <option value="Master 1">Master 1</option>
                  <option value="Master 2">Master 2</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nombre de questions</label>
                <select
                  value={aiNumQuestions}
                  onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                >
                  <option value={5}>5 questions (Quiz rapide)</option>
                  <option value={10}>10 questions (Standard)</option>
                  <option value={15}>15 questions</option>
                  <option value={20}>20 questions (Examen)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Difficulté</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                >
                  <option value="Facile">Facile (Révisions de base)</option>
                  <option value="Moyen">Moyen (Standard)</option>
                  <option value="Difficile">Difficile (Apprentissage avancé)</option>
                  <option value="Expert">Expert (Questions pièges/complexes)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Langue</label>
                <select
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                >
                  <option value="Français">Français</option>
                  <option value="Anglais">Anglais</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Instructions supplémentaires <span className="text-slate-400 font-normal">(Optionnel)</span></label>
              <textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Ex: Concentre-toi particulièrement sur les dates clés. N'utilise pas de questions Vrai/Faux..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-y min-h-[100px]"
              />
            </div>

            <div className="space-y-2 p-5 bg-purple-50 rounded-2xl border border-purple-100">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key size={18} className="text-purple-600" />
                Clé API Gemini (Optionnel)
              </label>
              <p className="text-xs text-slate-600 mb-3">
                Si vous obtenez des erreurs "Quota exceeded", vous pouvez saisir votre propre clé API Google Gemini. Elle sera sauvegardée uniquement dans votre navigateur actuel.
              </p>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="Ex: AIzaSy..."
                className="w-full p-4 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !aiSubject.trim()}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Générer le Quiz
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Brain, BookOpen, Plus, Play, Layers, Sparkles, BarChart3 } from 'lucide-react';
import { Quiz } from '@/types';
import { QuizPlayer } from '@/components/QuizPlayer';
import { FlashcardPlayer } from '@/components/FlashcardPlayer';
import { QuizCreator } from '@/components/QuizCreator';
import { QuizBuilder } from '@/components/QuizBuilder';
import { QuizStats } from '@/components/QuizStats';

import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function Quizzes() {
  const location = useLocation();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'explore' | 'stats'>('explore');
  const [showCreator, setShowCreator] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [initialBuilderData, setInitialBuilderData] = useState<any>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeFlashcards, setActiveFlashcards] = useState<Quiz | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      const cacheKey = 'local_cache_quizzes_directory';
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheKey + '_time');
      const now = Date.now();

      if (cached && cacheTime && now - parseInt(cacheTime) < 43200000) {
        setQuizzes(JSON.parse(cached));
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
        setQuizzes(list);
        localStorage.setItem(cacheKey, JSON.stringify(list));
        localStorage.setItem(cacheKey + '_time', now.toString());
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (location.state?.autoGenerate) {
      setInitialBuilderData({
        subject: location.state.subject || '',
        title: location.state.title || '',
        level: location.state.level || 'Licence 1'
      });
      setShowBuilder(true);
      // Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  if (activeQuiz) {
    return <QuizPlayer quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />;
  }

  if (activeFlashcards) {
    return <FlashcardPlayer quiz={activeFlashcards} onClose={() => setActiveFlashcards(null)} />;
  }

  if (showCreator) {
    return <QuizCreator onClose={() => setShowCreator(false)} />;
  }
  
  if (showBuilder) {
    return <QuizBuilder onClose={() => setShowBuilder(false)} initialData={initialBuilderData} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="text-emerald-600" size={32} />
            Révisions & Quiz
          </h1>
          <p className="text-slate-500 mt-2">Générez et révisez avec les quiz créés par les enseignants et l'IA.</p>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'student') && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
            >
              <Sparkles size={18} />
              Générateur IA Moodle
            </button>
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <button
                onClick={() => setShowCreator(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Plus size={18} />
                Créer Manuel
              </button>
            )}
          </div>
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
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'stats' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={16} />
          Mes Statistiques
        </button>
      </div>

      {activeTab === 'stats' && <QuizStats />}

      {activeTab === 'explore' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium tracking-tight">Chargement des quiz...</p>
          </div>
        ) : quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                quiz.type === 'ai' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
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
        {!loading && quizzes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
            <Brain className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Aucun quiz disponible</h3>
            <p className="text-slate-500">Soyez le premier à générer un quiz avec l'IA ou attendez qu'un enseignant en crée un.</p>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

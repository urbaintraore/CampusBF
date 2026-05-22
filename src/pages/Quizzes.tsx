import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Brain, BookOpen, Plus, Play, Layers, Sparkles, BarChart3, RotateCw } from 'lucide-react';
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
  const { user, quizzes, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'explore' | 'stats'>('explore');
  const [showCreator, setShowCreator] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [initialBuilderData, setInitialBuilderData] = useState<any>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeFlashcards, setActiveFlashcards] = useState<Quiz | null>(null);

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
    return <QuizCreator onClose={() => setShowCreator(false)} onSuccess={() => {}} />;
  }
  
  if (showBuilder) {
    return <QuizBuilder onClose={() => setShowBuilder(false)} onSuccess={() => {}} initialData={initialBuilderData} />;
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
        {(user?.role === 'admin') && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
            >
              <Sparkles size={18} />
              Générateur IA Moodle
            </button>
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Plus size={18} />
              Créer Manuel
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {activeTab === 'stats' && <QuizStats />}

      {activeTab === 'explore' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium tracking-tight">Chargement des quiz...</p>
          </div>
        ) : (
          (() => {
            const filteredQuizzes = quizzes.filter(q => q.validationStatus === 'published' || !q.validationStatus || user?.role === 'admin');
            const normalizeSubject = (sub: string | undefined): string => {
              if (!sub) return 'Autres';
              const s = sub.toLowerCase().trim();
              if (['tic', 'programmation', 'architecture', 'informatique', 'algorithme'].some(keyword => s.includes(keyword))) return 'Informatique';
              if (['algèbre', 'math', 'analyse', 'topologie', 'suites', 'fonction', 'limites', 'continuité', 'dérivabilité', 'développement limité', 'statistique'].some(keyword => s.includes(keyword))) return 'Mathématiques';
              if (['mécanique', 'atomistique', 'optique', 'electricité', 'thermodynamique', 'physique'].some(keyword => s.includes(keyword))) return 'Physique';
              if (['chimie'].some(keyword => s.includes(keyword))) return 'Chimie';
              if (s.includes('culture')) return 'Culture Générale';
              return sub.charAt(0).toUpperCase() + sub.slice(1);
            };

            const groupedQuizzes = filteredQuizzes.reduce((acc, q) => {
              const subject = normalizeSubject(q.subject);
              if (!acc[subject]) acc[subject] = [];
              acc[subject].push(q);
              return acc;
            }, {} as Record<string, typeof filteredQuizzes>);

            return Object.entries(groupedQuizzes).length > 0 ? (
              Object.entries(groupedQuizzes).map(([subject, quizzesInCategory]) => (
                <div key={subject} className="col-span-full space-y-4 pt-4">
                  <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">{subject}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzesInCategory.map((quiz) => (
                      <div key={quiz.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden">
                        {user?.role === 'admin' && quiz.validationStatus && quiz.validationStatus !== 'published' && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10 shadow-sm">
                            BROUILLON / EN ATTENTE
                          </div>
                        )}
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
                        <h3 className="font-bold text-slate-900 text-lg mb-2 flex items-center justify-between">
                          {quiz.title}
                          {quiz.qualityScore && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md ml-2 border border-emerald-100 shrink-0" title="Score de Qualité IA">{quiz.qualityScore}%</span>}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{quiz.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 font-medium">
                          <span className="flex items-center gap-1">
                            <Layers size={14} className="text-slate-300" />
                            {quiz.questions?.length || 0} {(quiz.questions?.length || 0) > 1 ? 'questions' : 'question'}
                          </span>
                          <span className="flex items-center gap-1" title="Nombre de fois que ce quiz a été complété">
                            <Play size={14} className="text-slate-300" />
                            {quiz.playCount || 0} {(quiz.playCount || 0) > 1 ? 'participations' : 'participation'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setActiveQuiz(quiz)}
                              className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"
                              disabled={user?.role !== 'admin' && quiz.validationStatus && quiz.validationStatus !== 'published'}
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
                          
                          {user?.role === 'admin' && (
                             <button
                             onClick={() => {
                               setInitialBuilderData(quiz);
                               setShowBuilder(true);
                             }}
                             className="w-full py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors"
                           >
                             <Sparkles size={16} />
                             Modération IA & Édition
                           </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <Brain className="mx-auto text-slate-300 mb-3" size={48} />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Aucun quiz disponible</h3>
                <p className="text-slate-500">Soyez le premier à générer un quiz avec l'IA ou attendez qu'un enseignant en crée un.</p>
              </div>
            );
          })()
        )}

        </div>
      )}
    </div>
  );
}

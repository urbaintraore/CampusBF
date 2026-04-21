import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { quizService } from '@/services/quizService';
import { QuizResult } from '@/types';
import { Target, Clock, Award, BarChart3 } from 'lucide-react';

export const QuizStats: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      quizService.getQuizResultsByUser(user.id).then(res => {
        setResults(res);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return <div className="text-center py-12"><div className="w-8 h-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto"></div></div>;
  }

  const totalAttempts = results.length;
  const avgScore = totalAttempts > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.totalPoints > 0 ? (curr.score / curr.totalPoints) * 100 : 0), 0) / totalAttempts)
    : 0;
  const successRate = totalAttempts > 0 
    ? Math.round((results.filter(r => (r.score / r.totalPoints) >= 0.5).length / totalAttempts) * 100)
    : 0;
  const totalTime = results.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase">Tentatives</p>
          <p className="text-3xl font-bold text-slate-900">{totalAttempts}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Target size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase">Score Moyen</p>
          <p className="text-3xl font-bold text-slate-900">{avgScore}%</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Award size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase">Taux de réussite</p>
          <p className="text-3xl font-bold text-slate-900">{successRate}%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase">Temps total</p>
          <p className="text-3xl font-bold text-slate-900">{Math.round(totalTime / 60)} min</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Historique des quiz</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {results.map((res, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-bold text-slate-900">Quiz ID: {res.quizId}</p>
                <p className="text-sm text-slate-500">{new Date(res.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{Math.round((res.score / res.totalPoints) * 100)}%</p>
                <p className="text-xs font-bold text-slate-400 uppercase">{res.score} / {res.totalPoints} pts</p>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-medium">
              Aucun quiz complété pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

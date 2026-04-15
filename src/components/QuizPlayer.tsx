import React, { useState } from 'react';
import { Quiz } from '@/types';
import { X, CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface QuizPlayerProps {
  quiz: Quiz;
  onClose: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onClose }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    
    // Fallback for old quizzes
    if (currentQuestion.pointsPerOption) {
      setScore(score + currentQuestion.pointsPerOption[index]);
    } else if (currentQuestion.correctAnswerIndex !== undefined && index === currentQuestion.correctAnswerIndex) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    // Fallback for old quizzes
    const maxPossibleScore = quiz.questions.reduce((total, q) => {
      if (q.pointsPerOption) {
        return total + Math.max(...q.pointsPerOption);
      }
      return total + 1;
    }, 0);
    
    const percentage = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center animate-in zoom-in-95">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Terminé !</h2>
        <p className="text-slate-500 mb-8">Vous avez complété "{quiz.title}"</p>
        
        <div className="bg-slate-50 rounded-2xl p-6 mb-8">
          <div className="text-5xl font-bold text-emerald-600 mb-2">{percentage}%</div>
          <p className="text-slate-700 font-medium">Score : {score} / {maxPossibleScore} points</p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={20} />
            Recommencer
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Terminer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div>
            <h2 className="font-bold text-slate-900">{quiz.title}</h2>
            <p className="text-xs text-slate-500">Question {currentQuestionIndex + 1} sur {quiz.questions.length}</p>
          </div>
        </div>
        <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
          Score: {score}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-100 w-full">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Question Area */}
      <div className="p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all font-medium flex items-center justify-between ";
            
            // Fallback for old quizzes
            const hasPoints = !!currentQuestion.pointsPerOption;
            const maxPoints = hasPoints ? Math.max(...currentQuestion.pointsPerOption) : 1;
            const isBestAnswer = hasPoints 
              ? currentQuestion.pointsPerOption[index] === maxPoints && maxPoints > 0
              : index === currentQuestion.correctAnswerIndex;
            const pointsForOption = hasPoints ? currentQuestion.pointsPerOption[index] : (index === currentQuestion.correctAnswerIndex ? 1 : 0);
            
            const isSelected = index === selectedOption;
            
            if (!isAnswered) {
              buttonClass += "border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700";
            } else {
              if (isBestAnswer) {
                buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-700";
              } else if (isSelected) {
                buttonClass += "border-red-500 bg-red-50 text-red-700";
              } else {
                buttonClass += "border-slate-200 bg-slate-50 text-slate-400 opacity-50";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswered}
                className={buttonClass}
              >
                <span>{option}</span>
                <div className="flex items-center gap-2">
                  {isAnswered && hasPoints && <span className="text-sm font-bold opacity-70">{pointsForOption} pts</span>}
                  {isAnswered && isBestAnswer && <CheckCircle size={20} className="text-emerald-500" />}
                  {isAnswered && isSelected && !isBestAnswer && <XCircle size={20} className="text-red-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {isAnswered && currentQuestion.explanation && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 animate-in fade-in">
            <p className="font-bold text-sm mb-1">Explication :</p>
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>
        )}

        {isAnswered && (
          <div className="mt-8 flex justify-end animate-in fade-in">
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2 transition-colors"
            >
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Question suivante' : 'Voir les résultats'}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

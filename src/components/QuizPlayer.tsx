import React, { useState } from 'react';
import { Quiz } from '@/types';
import { X, CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface QuizPlayerProps {
  quiz: Quiz;
  onClose: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onClose }) => {
  const { incrementActivity } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<any>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const questionType = currentQuestion.type || 'multiple_choice';

  const handleSubmitAnswer = (answer: any) => {
    if (isAnswered) return;
    setUserInput(answer);
    setIsAnswered(true);
    
    let points = 0;

    switch (questionType) {
      case 'multiple_choice':
      case 'true_false':
        const index = answer as number;
        if (currentQuestion.pointsPerOption) {
          points = currentQuestion.pointsPerOption[index] || 0;
        } else if (index === currentQuestion.correctAnswerIndex) {
          points = 1;
        }
        break;
      
      case 'short_answer':
        if (currentQuestion.correctTextAnswer?.toLowerCase().trim() === (answer as string).toLowerCase().trim()) {
          points = 1;
        }
        break;
      
      case 'numerical':
      case 'calculated':
        const num = parseFloat(answer);
        const target = currentQuestion.correctNumericAnswer || 0;
        const tolerance = currentQuestion.tolerance || 0;
        if (Math.abs(num - target) <= tolerance) {
          points = 1;
        }
        break;
      
      case 'matching':
        // Simplified check: if all matches are correct
        const matches = answer as { [key: string]: string };
        const correctMatches = currentQuestion.matchingPairs?.every(pair => matches[pair.left] === pair.right);
        if (correctMatches) points = 1;
        break;
      
      case 'description':
        points = 0;
        break;
      
      case 'essay':
        // Essays are usually manually graded, but we give a point for completion here
        points = 1;
        break;
      
      case 'cloze':
        const gapAnswers = answer as { [key: string]: string };
        const allCorrect = Object.entries(currentQuestion.clozeAnswers || {}).every(
          ([gap, correct]) => gapAnswers[gap]?.toLowerCase().trim() === (correct as string).toLowerCase().trim()
        );
        if (allCorrect) points = 1;
        break;

      default:
        points = 0;
    }

    setScore(score + points);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setUserInput(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      if (incrementActivity) {
        incrementActivity('quizzesCompleted').catch(console.error);
      }
    }
  };

  const renderQuestionInput = () => {
    switch (questionType) {
      case 'description':
        return (
          <div className="space-y-6">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-slate-700 italic text-center">
              <p className="mb-4">Cette section est informative. Lisez attentivement les instructions ci-dessus avant de continuer.</p>
              {!isAnswered && (
                <button 
                  onClick={() => setIsAnswered(true)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
                >
                  J'ai compris, continuer
                </button>
              )}
            </div>
          </div>
        );

      case 'multiple_choice':
      case 'true_false':
        const options = questionType === 'true_false' ? ['Vrai', 'Faux'] : currentQuestion.options;
        return (
          <div className="space-y-3">
            {options.map((option, index) => {
              let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all font-medium flex items-center justify-between ";
              const hasPoints = !!currentQuestion.pointsPerOption;
              const maxPoints = hasPoints ? Math.max(...currentQuestion.pointsPerOption) : 1;
              const isBestAnswer = hasPoints 
                ? currentQuestion.pointsPerOption[index] === maxPoints && maxPoints > 0
                : index === currentQuestion.correctAnswerIndex;
              const pointsForOption = hasPoints ? currentQuestion.pointsPerOption[index] : (index === currentQuestion.correctAnswerIndex ? 1 : 0);
              const isSelected = index === userInput;
              
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
                  onClick={() => handleSubmitAnswer(index)}
                  disabled={isAnswered}
                  className={buttonClass}
                >
                  <span>{option}</span>
                  <div className="flex items-center gap-2">
                    {isAnswered && hasPoints && pointsForOption > 0 && <span className="text-sm font-bold opacity-70">{pointsForOption} pts</span>}
                    {isAnswered && isBestAnswer && <CheckCircle size={20} className="text-emerald-500" />}
                    {isAnswered && isSelected && !isBestAnswer && <XCircle size={20} className="text-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'short_answer':
      case 'numerical':
      case 'calculated':
        return (
          <div className="space-y-4">
            <input 
              type={questionType === 'short_answer' ? 'text' : 'number'}
              disabled={isAnswered}
              placeholder="Votre réponse..."
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all font-medium focus:outline-none focus:ring-2",
                isAnswered 
                  ? (score > 0 ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50")
                  : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
              )}
              value={userInput || ''}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAnswered && userInput) {
                  handleSubmitAnswer(userInput);
                }
              }}
            />
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(userInput)}
                disabled={!userInput}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Valider la réponse
              </button>
            )}
            {isAnswered && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500 mb-1 font-bold uppercase">Réponse correcte :</p>
                <p className="font-bold text-slate-900">
                  {questionType === 'short_answer' ? currentQuestion.correctTextAnswer : currentQuestion.correctNumericAnswer}
                </p>
              </div>
            )}
          </div>
        );

      case 'matching':
        const leftItems = currentQuestion.matchingPairs?.map(p => p.left) || [];
        const rightOptions = [...(currentQuestion.matchingPairs?.map(p => p.right) || [])].sort();
        
        return (
          <div className="space-y-4">
            {leftItems.map((left, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex-1 font-bold text-slate-900">{left}</div>
                <div className="text-slate-400">associer à</div>
                <select
                  disabled={isAnswered}
                  value={userInput?.[left] || ''}
                  onChange={(e) => setUserInput({ ...userInput, [left]: e.target.value })}
                  className={cn(
                    "flex-1 p-2 rounded-lg border focus:outline-none",
                    isAnswered 
                      ? (userInput?.[left] === currentQuestion.matchingPairs?.find(p => p.left === left)?.right ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50")
                      : "border-slate-200"
                  )}
                >
                  <option value="">Choisir...</option>
                  {rightOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(userInput)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                Confirmer les associations
              </button>
            )}
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-4">
            <textarea
              disabled={isAnswered}
              rows={6}
              placeholder="Rédigez votre réponse ici..."
              className="w-full p-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              value={userInput || ''}
              onChange={(e) => setUserInput(e.target.value)}
            />
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(userInput)}
                disabled={!userInput}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Soumettre ma composition
              </button>
            )}
          </div>
        );

      case 'cloze':
        const parts = currentQuestion.clozeTemplate?.split(/(\[\[gap\d+\]\])/g) || [];
        return (
          <div className="space-y-6">
            <div className="leading-relaxed text-lg bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-700">
              {parts.map((part, i) => {
                const match = part.match(/\[\[(gap\d+)\]\]/);
                if (match) {
                  const gapId = match[1];
                  return (
                    <input
                      key={i}
                      disabled={isAnswered}
                      type="text"
                      className={cn(
                         "mx-1 px-2 py-1 rounded border-b-2 bg-white focus:outline-none w-32 inline-block transition-all",
                         isAnswered
                           ? (userInput?.[gapId]?.toLowerCase().trim() === (currentQuestion.clozeAnswers?.[gapId] as string)?.toLowerCase().trim() ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700")
                           : "border-indigo-500/30 focus:border-indigo-500"
                      )}
                      value={userInput?.[gapId] || ''}
                      onChange={(e) => setUserInput({ ...userInput, [gapId]: e.target.value })}
                    />
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </div>
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(userInput)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                Vérifier les trous
              </button>
            )}
            {isAnswered && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                <p className="text-sm text-slate-500 mb-2 font-bold uppercase">Réponses attendues :</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(currentQuestion.clozeAnswers || {}).map(([gap, ans]) => (
                    <span key={gap} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                      {gap}: <span className="text-emerald-600">{ans as string}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>Type de question non supporté</div>;
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setUserInput(null);
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

        {renderQuestionInput()}

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

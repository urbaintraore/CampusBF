import React, { useState, useEffect } from 'react';
import { Quiz } from '@/types';
import { X, CheckCircle, XCircle, ArrowRight, RotateCcw, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { quizService } from '@/services/quizService';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';

interface QuizPlayerProps {
  quiz: Quiz;
  onClose: () => void;
}

// Helper to shuffle an array
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onClose }) => {
  const { user, incrementActivity, syncUserStats, logActivity } = useAuth();
  
  // Quiz State
  const [questions, setQuestions] = useState(quiz.questions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<any>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.duration ? quiz.duration * 60 : null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Initialize Quiz (Shuffling)
  useEffect(() => {
    let qList = [...quiz.questions];
    if (quiz.settings?.shuffleQuestions) {
      qList = shuffleArray(qList);
    }
    // Deep clone to safely shuffle options
    if (quiz.settings?.shuffleAnswers) {
      qList = qList.map(q => {
        if ((q.type === 'multiple_choice' || (!q.type)) && q.options) {
          // We need to keep track of the correct answer when shuffling
          const optionsObjects = q.options.map((opt, i) => ({ opt, index: i }));
          const shuffledOptions = shuffleArray(optionsObjects);
          
          let newCorrectAnswerIndex = Number(q.correctAnswerIndex);
          shuffledOptions.forEach((o, newIndex) => {
            if (o.index === Number(q.correctAnswerIndex)) newCorrectAnswerIndex = newIndex;
          });

          // Also shuffle points
          let newPoints = q.pointsPerOption ? [...q.pointsPerOption] : undefined;
          if (newPoints && newPoints.length === q.options.length) {
            newPoints = shuffledOptions.map(o => q.pointsPerOption![o.index]);
          }

          return { 
            ...q, 
            options: shuffledOptions.map(o => o.opt), 
            correctAnswerIndex: newCorrectAnswerIndex,
            pointsPerOption: newPoints 
          };
        }
        return q;
      });
    }
    setQuestions(qList);
  }, [quiz]);

  // Timer Effect
  useEffect(() => {
    if (isFinished) return;
    
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      
      if (timeLeft !== null) {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            clearInterval(timer);
            handleFinishQuiz(true);
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;
  const questionType = currentQuestion.type || 'multiple_choice';

  const handleSubmitAnswer = (answer: any) => {
    if (isAnswered) return;
    setUserInput(answer);
    setIsAnswered(true);
    
    // Store user answer
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    let points = 0;

    switch (questionType) {
      case 'multiple_choice':
      case 'true_false':
        const index = answer as number;
        if (currentQuestion.pointsPerOption && currentQuestion.pointsPerOption.length > 0) {
          points = currentQuestion.pointsPerOption[index] || 0;
        } else if (index === Number(currentQuestion.correctAnswerIndex)) {
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
        const matches = answer as { [key: string]: string };
        const correctMatches = currentQuestion.matchingPairs?.every(pair => matches[pair.left] === pair.right);
        if (correctMatches) points = 1;
        break;
      
      case 'essay':
      case 'description':
        points = 0; // Requires manual grading
        break;
      
      case 'cloze':
        const gapAnswers = answer as { [key: string]: string };
        const allCorrect = Object.entries(currentQuestion.clozeAnswers || {}).every(
          ([gap, correct]) => gapAnswers[gap]?.toLowerCase().trim() === (correct as string).toLowerCase().trim()
        );
        if (allCorrect) points = 1;
        break;
    }

    if (points === 0 && quiz.settings?.penaltyPerWrongAnswer) {
      points = -Math.abs(quiz.settings.penaltyPerWrongAnswer);
    }

    setScore(score + points);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setUserInput(null);
      setIsAnswered(false);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async (timeout: boolean = false) => {
    setIsFinished(true);
    if (timeout) {
      toast.error('Le temps imparti est écoulé !', { icon: '⏰' });
    }

    const maxPossibleScore = quiz.questions.reduce((total, q) => {
      if (q.pointsPerOption && q.pointsPerOption.length > 0) {
        return total + Math.max(...q.pointsPerOption);
      }
      return total + (q.type === 'description' ? 0 : 1);
    }, 0);
    
    const finalPercentage = maxPossibleScore > 0 ? Math.round((Math.max(0, score) / maxPossibleScore) * 100) : 0;
    
    // Gamification & Saving
    if (user) {
      try {
        await quizService.saveQuizResult({
          quizId: quiz.id,
          userId: user.id,
          score: Math.max(0, score),
          totalPoints: maxPossibleScore,
          answers: userAnswers,
          timeSpent
        });
        
        let earnedPoints = 10; // Completion points
        if (finalPercentage >= 80) earnedPoints += 20;

        if (logActivity) {
          logActivity({
            action: 'Participation à un quiz',
            module: 'Quiz & Évaluations',
            details: `Quiz: ${quiz.title} - Score: ${Math.max(0, score)}/${maxPossibleScore} (${finalPercentage}%)`,
            metadata: { 
              quizId: quiz.id, 
              score: Math.max(0, score),
              maxScore: maxPossibleScore,
              percentage: finalPercentage,
              timeSpentSeconds: timeSpent
            }
          });
        }

        if (incrementActivity) {
          // One atomic call for both activity count and points
          await incrementActivity('quizzesCompleted', earnedPoints);
        }

        if (syncUserStats) {
          await syncUserStats();
        }
        
        toast.success(`+${earnedPoints} points gagnés !`);
      } catch (e) {
        console.error('Save failed', e);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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
        const options = currentQuestion.options || (questionType === 'true_false' ? ['Vrai', 'Faux'] : []);
        return (
          <div className="space-y-3">
            {options.map((option, index) => {
              let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all font-medium flex items-center justify-between ";
              const hasPoints = currentQuestion.pointsPerOption && currentQuestion.pointsPerOption.length > 0;
              const maxPoints = hasPoints ? Math.max(...currentQuestion.pointsPerOption!) : 1;
              const isBestAnswer = hasPoints 
                ? currentQuestion.pointsPerOption![index] === maxPoints && maxPoints > 0
                : index === Number(currentQuestion.correctAnswerIndex);
              const pointsForOption = hasPoints ? currentQuestion.pointsPerOption![index] : (index === Number(currentQuestion.correctAnswerIndex) ? 1 : 0);
              const isSelected = index === userInput;
              
              const showCorr = quiz.settings?.showCorrections !== 'never' && (quiz.settings?.showCorrections === 'always' || typeof quiz.settings?.showCorrections === 'undefined');

              if (!isAnswered) {
                buttonClass += "border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700";
              } else {
                if (showCorr) {
                  if (isBestAnswer) {
                    buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-700";
                  } else if (isSelected) {
                    buttonClass += "border-red-500 bg-red-50 text-red-700";
                  } else {
                    buttonClass += "border-slate-200 bg-slate-50 text-slate-400 opacity-50";
                  }
                } else {
                   // Clean state if corrections hidden
                   if (isSelected) buttonClass += "border-indigo-500 bg-indigo-50 text-indigo-700";
                   else buttonClass += "border-slate-200 bg-slate-50 text-slate-400";
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
                    {isAnswered && showCorr && hasPoints && pointsForOption > 0 && <span className="text-sm font-bold opacity-70">{pointsForOption} pts</span>}
                    {isAnswered && showCorr && isBestAnswer && <CheckCircle size={20} className="text-emerald-500" />}
                    {isAnswered && showCorr && isSelected && !isBestAnswer && <XCircle size={20} className="text-red-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'short_answer':
      case 'numerical':
      case 'calculated':
        const showCorrInput = isAnswered && quiz.settings?.showCorrections !== 'never';
        return (
          <div className="space-y-4">
            <input 
              type={questionType === 'short_answer' ? 'text' : 'number'}
              disabled={isAnswered}
              placeholder="Votre réponse..."
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all font-medium focus:outline-none focus:ring-2",
                isAnswered 
                  ? (showCorrInput ? (score > 0 ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50") : "border-indigo-500 bg-indigo-50")
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
            {showCorrInput && (
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
        const currentMatches = (userInput as { [key: string]: string }) || {};
        const showMatchingCorr = isAnswered && quiz.settings?.showCorrections !== 'never';
        return (
          <div className="space-y-4">
            {currentQuestion.matchingPairs?.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">
                  {pair.left}
                </div>
                <ArrowRight size={20} className="text-slate-400" />
                <select
                  disabled={isAnswered}
                  value={currentMatches[pair.left] || ''}
                  onChange={(e) => {
                    const newMatches = { ...currentMatches, [pair.left]: e.target.value };
                    setUserInput(newMatches);
                  }}
                  className={cn(
                    "flex-1 p-3 rounded-xl border-2 transition-all font-medium",
                    isAnswered
                      ? (showMatchingCorr && currentMatches[pair.left] === pair.right ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700")
                      : "border-slate-200 focus:border-indigo-500"
                  )}
                >
                  <option value="">Choisir...</option>
                  {shuffleArray(currentQuestion.matchingPairs?.map(p => p.right) || []).map((right, rIdx) => (
                    <option key={rIdx} value={right}>{right}</option>
                  ))}
                </select>
              </div>
            ))}
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(currentMatches)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Valider l'appariement
              </button>
            )}
            {showMatchingCorr && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-sm text-slate-500 mb-1 font-bold uppercase">Corrections :</p>
                {currentQuestion.matchingPairs?.map((pair, idx) => (
                  <p key={idx} className="text-sm font-medium">
                    <span className="text-slate-600">{pair.left}</span> = <span className="text-emerald-600">{pair.right}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        );

      case 'cloze':
        const currentGaps = (userInput as { [key: string]: string }) || {};
        const showClozeCorr = isAnswered && quiz.settings?.showCorrections !== 'never';
        
        // Split template by gaps
        const parts = currentQuestion.clozeTemplate?.split(/(\[\[gap\d+\]\])/g) || [];
        
        return (
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl leading-loose text-lg">
              {parts.map((part, idx) => {
                const gapMatch = part.match(/\[\[(gap\d+)\]\]/);
                if (gapMatch) {
                  const gapId = gapMatch[1];
                  const isGapCorrect = currentGaps[gapId]?.toLowerCase().trim() === (currentQuestion.clozeAnswers?.[gapId] as string)?.toLowerCase().trim();
                  
                  return (
                    <input
                      key={idx}
                      type="text"
                      disabled={isAnswered}
                      value={currentGaps[gapId] || ''}
                      onChange={(e) => {
                        const newGaps = { ...currentGaps, [gapId]: e.target.value };
                        setUserInput(newGaps);
                      }}
                      placeholder="..."
                      className={cn(
                        "mx-1 px-2 py-1 rounded border-b-2 text-center transition-all focus:outline-none min-w-[80px]",
                        isAnswered
                          ? (showClozeCorr && isGapCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-700")
                          : "border-slate-300 focus:border-indigo-500 bg-white"
                      )}
                    />
                  );
                }
                return <span key={idx}>{part}</span>;
              })}
            </div>
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(currentGaps)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Valider le texte
              </button>
            )}
            {showClozeCorr && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-sm text-slate-500 mb-1 font-bold uppercase">Réponses attendues :</p>
                {Object.entries(currentQuestion.clozeAnswers || {}).map(([gap, correct]) => (
                  <p key={gap} className="text-sm font-medium">
                    <span className="text-slate-600">{gap} : </span> 
                    <span className="text-emerald-600">{correct as string}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-4">
            <textarea
              disabled={isAnswered}
              value={userInput || ''}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Rédigez votre réponse ici..."
              className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[200px]"
            />
            {!isAnswered && (
              <button 
                onClick={() => handleSubmitAnswer(userInput)}
                disabled={!userInput}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Enregistrer la réponse
              </button>
            )}
            {isAnswered && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Les essais nécessitent une correction manuelle par un enseignant. Votre score actuel ne reflète pas encore cette question.
                </p>
              </div>
            )}
          </div>
        );

      // Remaining types fallbacks...
      default:
        return <div>Type de question {questionType} non supporté dans le lecteur actuel.</div>;
    }
  };

  if (isFinished) {
    const maxPossibleScore = quiz.questions.reduce((total, q) => {
      if (q.pointsPerOption && q.pointsPerOption.length > 0) return total + Math.max(...q.pointsPerOption);
      return total + (q.type === 'description' ? 0 : 1);
    }, 0);
    
    const percentage = maxPossibleScore > 0 ? Math.round((Math.max(0, score) / maxPossibleScore) * 100) : 0;
    
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center animate-in zoom-in-95 mt-10">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Target size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Terminé !</h2>
        <p className="text-slate-500 mb-8">Vous avez complété "{quiz.title}"</p>
        
        <div className="bg-slate-50 rounded-2xl p-6 mb-8 flex items-center justify-around">
          <div>
            <div className="text-5xl font-bold text-emerald-600 mb-2">{percentage}%</div>
            <p className="text-slate-700 font-medium">Score : {Math.max(0, score)} / {maxPossibleScore} points</p>
          </div>
          <div className="w-px h-16 bg-slate-200"></div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2 flex items-center justify-center gap-2"><Clock size={28}/> {formatTime(timeSpent)}</div>
            <p className="text-slate-700 font-medium">Temps passé</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={onClose} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20">
            Fermer le quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 mt-6">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
          <div>
            <h2 className="font-bold text-slate-900">{quiz.title}</h2>
            <p className="text-xs text-slate-500">Question {currentQuestionIndex + 1} sur {questions.length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-lg font-bold text-sm">
              <Clock size={16} />
              {formatTime(timeLeft)}
            </div>
          )}
          <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
            Score: {score}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-100 w-full">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Area */}
      <div className="p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {renderQuestionInput()}

        {isAnswered && (quiz.settings?.showCorrections !== 'never') && currentQuestion.explanation && (
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
              {currentQuestionIndex < questions.length - 1 ? 'Question suivante' : 'Voir les résultats'}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

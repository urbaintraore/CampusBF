import React, { useState } from 'react';
import { Quiz } from '@/types';
import { X, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

interface FlashcardPlayerProps {
  quiz: Quiz;
  onClose: () => void;
}

export const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({ quiz, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = quiz.questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Flashcards : {quiz.title}</h2>
          <p className="text-slate-500 text-sm mt-1">Carte {currentIndex + 1} sur {quiz.questions.length}</p>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Flashcard Container */}
      <div className="relative w-full h-96 perspective-1000">
        <div 
          className={`w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front (Question) */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center">
            <span className="absolute top-6 left-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Question</span>
            <h3 className="text-2xl font-bold text-slate-800 leading-relaxed">
              {currentCard.question}
            </h3>
            <p className="absolute bottom-6 text-sm text-slate-400 flex items-center gap-2">
              <RotateCcw size={16} /> Cliquez pour voir la réponse
            </p>
          </div>

          {/* Back (Answer) */}
          <div className="absolute inset-0 backface-hidden bg-emerald-50 rounded-3xl border border-emerald-200 shadow-sm p-8 flex flex-col items-center justify-center text-center rotate-y-180">
            <span className="absolute top-6 left-6 text-xs font-bold text-emerald-600 uppercase tracking-wider">Réponse</span>
            <h3 className="text-xl font-bold text-emerald-900 mb-4">
              {currentCard.options[
                currentCard.pointsPerOption 
                  ? currentCard.pointsPerOption.indexOf(Math.max(...currentCard.pointsPerOption))
                  : currentCard.correctAnswerIndex
              ]}
            </h3>
            {currentCard.explanation && (
              <p className="text-emerald-700 text-sm leading-relaxed max-w-lg">
                {currentCard.explanation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-4 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-sm font-bold text-slate-500 w-16 text-center">
          {currentIndex + 1} / {quiz.questions.length}
        </div>
        <button
          onClick={handleNext}
          disabled={currentIndex === quiz.questions.length - 1}
          className="p-4 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
};

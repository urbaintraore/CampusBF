import React from 'react';
import { Target, X, Clock } from 'lucide-react';
import { useFocus } from '@/context/FocusContext';

export function FocusModeBanner() {
  const { isFocusMode, toggleFocusMode, focusMinutesLeft } = useFocus();

  if (!isFocusMode) return null;

  return (
    <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-medium animate-in slide-in-from-top-2 no-print border-b border-purple-800/50">
      <div className="flex items-center gap-2 max-w-3xl">
        <div className="p-1.5 bg-purple-500/30 text-purple-300 rounded-lg flex-shrink-0">
          <Target size={16} className="animate-spin" />
        </div>
        <div>
          <span className="font-bold text-amber-300 mr-2">🎯 Mode Focus Actif</span>
          <span className="opacity-90 hidden sm:inline">
            Les distractions (Marketplace & notifications sociales) sont temporairement masquées pour favoriser vos révisions.
          </span>
          {focusMinutesLeft !== null && (
            <span className="ml-2 inline-flex items-center gap-1 bg-purple-800/80 px-2 py-0.5 rounded-full text-[11px] text-purple-200 font-semibold border border-purple-700">
              <Clock size={12} /> {focusMinutesLeft} min restante(s)
            </span>
          )}
        </div>
      </div>

      <button
        onClick={toggleFocusMode}
        className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all border border-white/20 flex-shrink-0 ml-2"
      >
        <X size={14} />
        <span className="hidden xs:inline">Désactiver</span>
      </button>
    </div>
  );
}

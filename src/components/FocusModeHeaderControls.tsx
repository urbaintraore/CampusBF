import React, { useState } from 'react';
import { Target, Wifi, WifiOff, Clock, ShieldCheck, X, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useFocus } from '@/context/FocusContext';
import { cn } from '@/lib/utils';

export function FocusModeHeaderControls() {
  const { isFocusMode, toggleFocusMode, focusMinutesLeft, startFocusTimer, isOnline, swRegistered } = useFocus();
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showOfflineInfoModal, setShowOfflineInfoModal] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* 1. Online / Offline Status Badge Indicator */}
      <button
        onClick={() => setShowOfflineInfoModal(true)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-sm border",
          isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
            : "bg-amber-100 text-amber-900 border-amber-300 animate-pulse hover:bg-amber-200"
        )}
        title={isOnline ? "Connecté à internet" : "Mode Hors-ligne (Service Worker)"}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isOnline ? "bg-emerald-400" : "bg-amber-500"
          )}></span>
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            isOnline ? "bg-emerald-500" : "bg-amber-600"
          )}></span>
        </span>

        {isOnline ? (
          <span className="flex items-center gap-1">
            <Wifi size={13} className="text-emerald-600" />
            <span className="hidden sm:inline">En ligne</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <WifiOff size={13} className="text-amber-700" />
            <span>Mode Hors-ligne</span>
          </span>
        )}
      </button>

      {/* 2. Focus Mode Button & Indicator */}
      <button
        onClick={() => setShowFocusModal(!showFocusModal)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border",
          isFocusMode
            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500 shadow-purple-500/20 animate-pulse"
            : "bg-white text-slate-700 border-slate-200/80 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
        )}
      >
        <Target size={14} className={isFocusMode ? "text-amber-300 animate-spin" : "text-purple-600"} />
        <span>
          {isFocusMode
            ? focusMinutesLeft
              ? `Focus (${focusMinutesLeft}m)`
              : 'Mode Focus'
            : 'Mode Focus'}
        </span>
      </button>

      {/* Focus Mode Setup / Management Modal */}
      {showFocusModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/80 text-purple-600 rounded-xl">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Mode Focus Révisions
                  </h3>
                  <p className="text-[11px] text-slate-500">Concentration maximale sans distractions</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFocusModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-2xl text-xs text-purple-900 dark:text-purple-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-600" />
                  Effet du Mode Focus :
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-800 dark:text-purple-300/90 pl-1">
                  <li><strong>Marketplace masquée</strong> pour éviter les achats compulsifs.</li>
                  <li><strong>Notifications sociales réduites</strong> pour éviter les interruptions.</li>
                </ul>
              </div>

              {/* Status Toggle Button */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    toggleFocusMode();
                    setShowFocusModal(false);
                  }}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md",
                    isFocusMode
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-purple-600/20"
                  )}
                >
                  {isFocusMode ? (
                    <>
                      <X size={16} /> Désactiver le Mode Focus
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Activer en Continu
                    </>
                  )}
                </button>
              </div>

              {/* Timer options */}
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <Clock size={14} className="text-purple-600" />
                  Chrono Pomodoro révision :
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        startFocusTimer(mins);
                        setShowFocusModal(false);
                      }}
                      className="py-2 px-1 bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all border border-slate-200/60 dark:border-slate-700 text-center"
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Mode Details Modal */}
      {showOfflineInfoModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-xl text-white",
                  isOnline ? "bg-emerald-600" : "bg-amber-600"
                )}>
                  {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {isOnline ? "Connexion Réseau Rétablie" : "Mode Hors-Ligne Actif"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Service Worker & Cache PWA</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOfflineInfoModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                CampusBF utilise une technologie de **Service Worker** qui met en cache les ressources académiques importantes.
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px]">
                    <strong>Statut du Service Worker :</strong> {swRegistered ? "Actif & Fonctionnel 🟢" : "Enregistré"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px]">
                    <strong>Accès Hors-Ligne :</strong> Les cours, documents et annales déjà consultés restent consultables sans réseau.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowOfflineInfoModal(false)}
                className="w-full py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

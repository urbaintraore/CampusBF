import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface FocusContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  focusMinutesLeft: number | null;
  startFocusTimer: (minutes: number) => void;
  stopFocusTimer: () => void;
  isOnline: boolean;
  swRegistered: boolean;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('campusbf_focus_mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [focusMinutesLeft, setFocusMinutesLeft] = useState<number | null>(() => {
    try {
      const savedTimer = localStorage.getItem('campusbf_focus_timer_end');
      if (savedTimer) {
        const diff = Math.ceil((parseInt(savedTimer, 10) - Date.now()) / 60000);
        return diff > 0 ? diff : null;
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [swRegistered, setSwRegistered] = useState<boolean>('serviceWorker' in navigator && !!navigator.serviceWorker.controller);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Connexion internet rétablie !', { id: 'online-status' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('⚡ Mode hors-ligne activé. Vos documents enregistrés restent disponibles.', { id: 'online-status', duration: 4000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwRegistered(true));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('campusbf_focus_mode', JSON.stringify(isFocusMode));
    } catch (e) {
      console.warn(e);
    }
  }, [isFocusMode]);

  useEffect(() => {
    let interval: any;
    if (isFocusMode && focusMinutesLeft !== null) {
      interval = setInterval(() => {
        try {
          const savedTimer = localStorage.getItem('campusbf_focus_timer_end');
          if (savedTimer) {
            const diff = Math.ceil((parseInt(savedTimer, 10) - Date.now()) / 60000);
            if (diff <= 0) {
              setIsFocusMode(false);
              setFocusMinutesLeft(null);
              localStorage.removeItem('campusbf_focus_timer_end');
              toast.success('🎉 Session de travail terminée ! Le Mode Focus a été désactivé.');
            } else {
              setFocusMinutesLeft(diff);
            }
          }
        } catch (e) {
          console.warn(e);
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isFocusMode, focusMinutesLeft]);

  const toggleFocusMode = () => {
    setIsFocusMode(prev => {
      const next = !prev;
      if (next) {
        toast.success('🎯 Mode Focus activé ! Distractions (Marketplace & notifications sociales) masquées.', { duration: 4000 });
      } else {
        toast('🔓 Mode Focus désactivé.', { icon: 'ℹ️' });
        stopFocusTimer();
      }
      return next;
    });
  };

  const startFocusTimer = (minutes: number) => {
    const endTime = Date.now() + minutes * 60 * 1000;
    try {
      localStorage.setItem('campusbf_focus_timer_end', endTime.toString());
    } catch (e) {
      console.warn(e);
    }
    setFocusMinutesLeft(minutes);
    setIsFocusMode(true);
    toast.success(`🎯 Mode Focus activé pour ${minutes} minutes ! Concentration maximale.`);
  };

  const stopFocusTimer = () => {
    setFocusMinutesLeft(null);
    try {
      localStorage.removeItem('campusbf_focus_timer_end');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <FocusContext.Provider value={{
      isFocusMode,
      toggleFocusMode,
      focusMinutesLeft,
      startFocusTimer,
      stopFocusTimer,
      isOnline,
      swRegistered
    }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}

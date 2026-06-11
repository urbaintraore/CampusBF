import React, { useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function NetworkStatus() {
  const { isOfflineMode } = useAuth();
  const prevOfflineRef = useRef(isOfflineMode);

  useEffect(() => {
    if (prevOfflineRef.current && !isOfflineMode) {
      toast.success('Connexion rétablie avec les services CampusBF !', {
        id: 'network-status',
        icon: <Wifi className="w-4 h-4 text-emerald-500 animate-bounce" />,
        duration: 4000,
      });
    } else if (!prevOfflineRef.current && isOfflineMode) {
      toast.error('Vous êtes actuellement hors ligne. CampusBF continue de fonctionner en mode local.', {
        id: 'network-status',
        duration: Infinity,
        icon: <WifiOff className="w-4 h-4 text-rose-500 animate-pulse" />
      });
    }
    prevOfflineRef.current = isOfflineMode;
  }, [isOfflineMode]);

  return (
    <AnimatePresence>
      {isOfflineMode && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg border-b border-amber-500/30 font-sans tracking-wide"
          id="network-offline-banner"
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Mode hors ligne activé. La synchronisation en cache local est active.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

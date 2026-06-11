import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion internet rétablie', {
        id: 'network-status',
        icon: <Wifi className="w-4 h-4" />
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Vous êtes hors ligne. Vérifiez votre connexion internet.', {
        id: 'network-status',
        duration: Infinity,
        icon: <WifiOff className="w-4 h-4" />
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md"
        >
          <WifiOff className="w-4 h-4" />
          <span>Mode hors ligne. Certaines fonctionnalités peuvent être limitées.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

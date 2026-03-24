import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export const SubscriptionNotification: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string }[]>([]);

  useEffect(() => {
    if (!user) return;

    const checkExpirations = () => {
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(now.getDate() + 7);

      const newNotifications: { id: string; message: string; type: string }[] = [];

      const checkExpiry = (expiryDateStr: string | undefined, label: string) => {
        if (!expiryDateStr) return;
        const expiryDate = new Date(expiryDateStr);
        
        // If expiry is within 7 days and hasn't passed yet
        if (expiryDate > now && expiryDate <= sevenDaysFromNow) {
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          newNotifications.push({
            id: `${label}-${expiryDateStr}`,
            message: `Votre abonnement ${label} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} (${expiryDate.toLocaleDateString()}).`,
            type: 'warning'
          });
        }
      };

      // Check different subscription types
      if (user.subscriptionStatus === 'active') {
        checkExpiry(user.subscriptionExpiry, 'Général');
      }
      checkExpiry(user.premiumSubscriptionExpiry, 'Premium');
      checkExpiry(user.eventSubscriptionExpiry, 'Event');

      setNotifications(newNotifications);
    };

    checkExpirations();
    // Check every hour
    const interval = setInterval(checkExpirations, 3600000);
    return () => clearInterval(interval);
  }, [user]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0">
      {notifications.map((notif) => (
        <div 
          key={notif.id}
          className="glass bg-white/90 border-amber-200 shadow-2xl rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-right-4 fade-in duration-300"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900">Alerte Expiration</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {notif.message}
            </p>
          </div>
          <button 
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const { user, notifications, markNotificationAsRead } = useAuth();
  
  const userNotifications = notifications
    .filter(n => n.userId === user?.id || n.userId === 'all')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const markAllAsRead = () => {
    userNotifications.forEach(n => {
      if (!n.read) markNotificationAsRead(n.id);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Bell size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Historique des Notifications</h1>
          </div>
          <p className="text-slate-500 text-sm">Retrouvez ici toutes vos alertes et messages importants.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <CheckCircle2 size={18} className="text-emerald-500" />
          Tout marquer comme lu
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {userNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {userNotifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "p-6 transition-colors cursor-pointer flex gap-4", 
                  !notif.read ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-slate-50"
                )}
                onClick={() => {
                  if (!notif.read) markNotificationAsRead(notif.id);
                }}
              >
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-red-500"></div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-900">{notif.title}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', { 
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aucune notification</h3>
            <p className="text-slate-500">Vous êtes à jour !</p>
          </div>
        )}
      </div>
    </div>
  );
}

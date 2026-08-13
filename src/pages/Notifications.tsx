import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, CheckCircle2, Trash2, Check, Filter, AlertCircle, Info, Sparkles, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const { user, notifications, markNotificationAsRead, deleteNotification } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  const userNotifications = notifications
    .filter(n => n.userId === user?.id || n.userId === 'all')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredNotifications = userNotifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    userNotifications.forEach(n => {
      if (!n.read) markNotificationAsRead(n.id);
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteNotification) {
      await deleteNotification(id);
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle size={18} className="text-amber-500" />;
      case 'error':
        return <ShieldAlert size={18} className="text-rose-500" />;
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'info':
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Historique des Notifications</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {unreadCount > 0 ? `${unreadCount} alerte(s) non lue(s)` : 'Toutes vos notifications sont à jour'}
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-all shadow-sm"
          >
            <CheckCircle2 size={16} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            filter === 'all'
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          )}
        >
          Toutes ({userNotifications.length})
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            filter === 'unread'
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          )}
        >
          Non lues ({unreadCount})
        </button>

        <button
          onClick={() => setFilter('read')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
            filter === 'read'
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          )}
        >
          Lues ({userNotifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "p-5 transition-colors flex items-start gap-4 group", 
                  !notif.read ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                )}
                onClick={() => {
                  if (!notif.read) markNotificationAsRead(notif.id);
                }}
              >
                <div className="mt-1 flex-shrink-0">
                  {getTypeIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', { 
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    {!notif.read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(notif.id);
                        }}
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Check size={12} /> Marquer comme lu
                      </button>
                    )}

                    <button 
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Aucune notification trouvée</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filter === 'unread' ? "Vous n'avez aucune alerte non lue." : "Votre historique de notifications est vide."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

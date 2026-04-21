import React, { useState, useEffect } from 'react';
import { Bell, CheckSquare, Trash2, Filter, Loader2, Info, BookOpen, Briefcase, Trophy, MessageSquare, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Notification } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationsCenterProps {
  onClose?: () => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      const ref = doc(db, 'notifications', n.id);
      batch.update(ref, { read: true });
    });

    await batch.commit();
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'documents': return <BookOpen className="text-blue-500" size={18} />;
      case 'internships': return <Briefcase className="text-emerald-500" size={18} />;
      case 'forums': return <MessageSquare className="text-purple-500" size={18} />;
      case 'contests': return <Trophy className="text-amber-500" size={18} />;
      case 'events': return <Calendar className="text-pink-500" size={18} />;
      default: return <Info className="text-slate-400" size={18} />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell className="text-emerald-600" size={20} />
          <h2 className="font-display font-bold text-slate-900">Notifications</h2>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
            title="Tout marquer comme lu"
          >
            <CheckSquare size={14} />
            Tout lu
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
              <Trash2 size={16} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <div className="p-2 border-b border-slate-100 flex gap-1 overflow-x-auto no-scrollbar">
        {[
          { label: 'Tout', value: 'all' },
          { label: 'Documents', value: 'documents' },
          { label: 'Stages', value: 'internships' },
          { label: 'Communauté', value: 'forums' },
          { label: 'Concours', value: 'contests' },
          { label: 'Événements', value: 'events' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              filter === f.value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2 space-y-2">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm">Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Bell size={40} className="mx-auto opacity-20" />
            <p className="text-sm">Aucune notification pour le moment.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                n.read 
                  ? "bg-white border-slate-100 opacity-70" 
                  : "bg-emerald-50/50 border-emerald-100 shadow-sm"
              )}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                    {n.createdAt && formatDistanceToNow(
                      new Date(
                        typeof n.createdAt === 'string' 
                          ? n.createdAt 
                          : (n.createdAt as any).toDate 
                            ? (n.createdAt as any).toDate() 
                            : n.createdAt
                      ), 
                      { addSuffix: true, locale: fr }
                    )}
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-300 transition-all absolute top-2 right-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {!n.read && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-full"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

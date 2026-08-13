import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, 
  AlertCircle, BookOpen, GraduationCap, Bell, Filter, Check, 
  Sparkles, Tag, AlertTriangle, ChevronRight, Share2, Download, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export interface AgendaEvent {
  id: string;
  title: string;
  category: 'exam' | 'homework' | 'event' | 'revision';
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  subject?: string;
  location?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  notes?: string;
  reminderSet?: boolean;
}

const DEFAULT_AGENDA_ITEMS: AgendaEvent[] = [
  {
    id: '1',
    title: 'Examen d\'Algorithmique & C++',
    category: 'exam',
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    time: '08:00',
    subject: 'Informatique',
    location: 'Amphi A, Université Joseph Ki-Zerbo',
    priority: 'high',
    completed: false,
    notes: 'Réviser les arbres binationaux et les algorithmes de tri.',
    reminderSet: true
  },
  {
    id: '2',
    title: 'Rendu du Rapport de TP Base de Données',
    category: 'homework',
    date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    time: '23:59',
    subject: 'Bases de Données',
    priority: 'high',
    completed: false,
    notes: 'Fichier PDF à transmettre par email au Dr. Sawadogo.',
    reminderSet: true
  },
  {
    id: '3',
    title: 'Journée d\'Orientation & Forum Entreprises',
    category: 'event',
    date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    time: '09:00',
    location: 'Palais des Sports de Ouaga 2000',
    priority: 'medium',
    completed: false,
    notes: 'Apporter des exemplaires imprimés de son CV CampusBF.'
  }
];

export default function StudentAgenda() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>(() => {
    const saved = localStorage.getItem('campusbf_student_agenda');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn(e); }
    }
    return DEFAULT_AGENDA_ITEMS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'exam' | 'homework' | 'event' | 'revision'>('exam');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:00');
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [notes, setNotes] = useState('');
  const [reminderSet, setReminderSet] = useState(true);

  useEffect(() => {
    localStorage.setItem('campusbf_student_agenda', JSON.stringify(events));
  }, [events]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Veuillez saisir un titre pour l\'événement.');
      return;
    }

    const newEvt: AgendaEvent = {
      id: Date.now().toString(),
      title: title.trim(),
      category,
      date,
      time,
      subject: subject.trim(),
      location: location.trim(),
      priority,
      completed: false,
      notes: notes.trim(),
      reminderSet
    };

    setEvents(prev => [newEvt, ...prev]);
    toast.success('Événement ajouté à votre agenda !');

    // Request browser notification permission if reminder set
    if (reminderSet && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Reset form
    setTitle('');
    setSubject('');
    setLocation('');
    setNotes('');
    setShowAddModal(false);
  };

  const handleToggleComplete = (id: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id === id) {
        const nextState = !e.completed;
        if (nextState) toast.success('Marqué comme terminé ! 🎉');
        return { ...e, completed: nextState };
      }
      return e;
    }));
  };

  const handleDelete = (id: string) => {
    if (confirm('Voulez-vous supprimer cet événement de votre agenda ?')) {
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Événement supprimé.');
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.subject && e.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());

  // Statistics
  const upcomingExams = events.filter(e => e.category === 'exam' && !e.completed).length;
  const pendingHomework = events.filter(e => e.category === 'homework' && !e.completed).length;
  const upcomingEvents = events.filter(e => e.category === 'event' && !e.completed).length;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'exam':
        return { label: 'Examen', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200' };
      case 'homework':
        return { label: 'Devoir / Rendu', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200' };
      case 'event':
        return { label: 'Événement Campus', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200' };
      case 'revision':
        return { label: 'Révision', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200' };
      default:
        return { label: 'Note', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200' };
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'high':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">Priorité Haute</span>;
      case 'medium':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">Moyenne</span>;
      case 'low':
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-400 text-white">Basse</span>;
    }
  };

  const calculateDaysLeft = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return <span className="text-rose-600 dark:text-rose-400 font-bold">Aujourd'hui !</span>;
    if (diffDays === 1) return <span className="text-amber-600 dark:text-amber-400 font-bold">Demain</span>;
    if (diffDays < 0) return <span className="text-slate-400 dark:text-slate-500 line-through">Passé</span>;
    return <span className="text-emerald-600 dark:text-emerald-400 font-bold">Dans {diffDays} jour(s)</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Agenda Étudiant</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Organise tes examens, devoirs et événements universitaires avec rappels.</p>
          </div>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          Ajouter un événement
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <span className="text-xs uppercase font-bold text-rose-100 tracking-wider">Examens à venir</span>
          <div className="text-3xl font-extrabold my-2">{upcomingExams}</div>
          <p className="text-[11px] text-rose-100">Prépare tes fiches de révision</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <span className="text-xs uppercase font-bold text-amber-100 tracking-wider">Devoirs & TP en cours</span>
          <div className="text-3xl font-extrabold my-2">{pendingHomework}</div>
          <p className="text-[11px] text-amber-100">Ne laisse pas s'accumuler les retards</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <span className="text-xs uppercase font-bold text-emerald-100 tracking-wider">Événements Campus</span>
          <div className="text-3xl font-extrabold my-2">{upcomingEvents}</div>
          <p className="text-[11px] text-emerald-100">Forums, ateliers et conférences</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par titre, matière, note..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none border border-slate-200 dark:border-slate-700 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'exam', label: 'Examens' },
              { id: 'homework', label: 'Devoirs' },
              { id: 'event', label: 'Événements' },
              { id: 'revision', label: 'Révisions' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
                  selectedCategory === cat.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agenda Items List */}
      <div className="space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((item) => {
            const badge = getCategoryBadge(item.category);
            return (
              <div 
                key={item.id}
                className={cn(
                  "p-5 bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",
                  item.completed 
                    ? "opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40" 
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700"
                )}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button 
                    onClick={() => handleToggleComplete(item.id)}
                    className={cn(
                      "mt-1 p-1 rounded-full border transition-all shrink-0",
                      item.completed 
                        ? "bg-emerald-500 text-white border-emerald-500" 
                        : "border-slate-300 hover:border-emerald-500 text-transparent"
                    )}
                  >
                    <Check size={16} />
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", badge.bg)}>
                        {badge.label}
                      </span>
                      {getPriorityBadge(item.priority)}
                      {item.subject && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {item.subject}
                        </span>
                      )}
                    </div>

                    <h3 className={cn(
                      "text-base font-bold text-slate-900 dark:text-slate-100 leading-snug",
                      item.completed && "line-through text-slate-400 dark:text-slate-500"
                    )}>
                      {item.title}
                    </h3>

                    {item.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={14} className="text-emerald-600" />
                        <span>{new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>

                      {item.time && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-emerald-600" />
                          <span>{item.time}</span>
                        </div>
                      )}

                      {item.location && (
                        <div className="flex items-center gap-1">
                          <GraduationCap size={14} className="text-emerald-600" />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-right">
                    {calculateDaysLeft(item.date)}
                  </div>

                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
            <CalendarIcon size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Aucun événement dans l'agenda</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Ajoute tes examens, devoirs et rappels pour suivre ton semestre avec sérénité.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Ajouter mon premier rappel
            </button>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ajouter à mon Agenda</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Titre de l'événement / Examen *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Examen d'Algèbre Linéaire"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Catégorie</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                  >
                    <option value="exam">Examen</option>
                    <option value="homework">Devoir / TP / Rendu</option>
                    <option value="event">Événement Campus</option>
                    <option value="revision">Session de Révision</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Niveau de Priorité</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                  >
                    <option value="high">Priorité Haute</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Date *</label>
                  <input 
                    type="date" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Heure</label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Matière / UE</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Mathématiques"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Lieu / Salle</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Amphi B"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Remarques / Instructions de révision</label>
                <textarea 
                  rows={3}
                  placeholder="Notes personnelles, chapitres à étudier, consignes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="reminder"
                  checked={reminderSet}
                  onChange={(e) => setReminderSet(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="reminder" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Activer le rappel local dans le navigateur
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

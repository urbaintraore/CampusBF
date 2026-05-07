import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Plus, Search, Filter, Shield, AlertCircle, Lock, GraduationCap, Trophy, Music, Info, X, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CampusEvent } from '@/types';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { contestService } from '@/services/contestService';
import toast from 'react-hot-toast';
import { deleteDoc } from 'firebase/firestore';

export default function Events() {
  const { user, events, users, logAction, contests, contestParticipants, registerForContest, addEvent, incrementActivity } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my-events' | 'organized'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<CampusEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'Soutenance' as CampusEvent['type'],
    location: '',
    date: '',
    time: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const filteredEvents = events.filter(event => {
    const title = event.title || '';
    const description = event.description || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    
    if (activeTab === 'my-events') {
      return matchesSearch && matchesType && user && event.attendees.includes(user.id);
    }

    if (activeTab === 'organized') {
      return matchesSearch && matchesType && user && event.organizerId === user.id;
    }
    
    return matchesSearch && matchesType;
  });

  const getContestForEvent = (eventTitle: string) => {
    return contests.find(c => c.title.toLowerCase().trim() === eventTitle.toLowerCase().trim());
  };

  const getEventParticipants = (event: CampusEvent) => {
    const attendees = event.attendees || [];
    const linkedContest = getContestForEvent(event.title);
    
    if (linkedContest) {
      const participants = contestParticipants
        .filter(p => p.contestId === linkedContest.id)
        .map(p => p.userId);
        
      // Merge and remove duplicates
      const allParticipantIds = Array.from(new Set([...attendees, ...participants]));
      return allParticipantIds;
    }
    
    return attendees;
  };

  const getEventParticipantCount = (event: CampusEvent) => {
    return getEventParticipants(event).length;
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '';
      // Manual parsing to avoid timezone shifts (e.g., 2026-05-02)
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const handleRegister = async (eventId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour vous inscrire');
      return;
    }
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Check if it's a competition linked to a contest
    const linkedContest = getContestForEvent(event.title);
    if (linkedContest) {
      if (linkedContest.conditions.minInvites > 0 && (user.inviteCount || 0) < linkedContest.conditions.minInvites) {
        toast.error(`Pour vous inscrire à cet événement (Concours), vous devez avoir invité au moins ${linkedContest.conditions.minInvites} étudiants.`);
        return;
      }
    }

    const isRegistered = event.attendees.includes(user.id);
    const newAttendees = isRegistered 
      ? event.attendees.filter(id => id !== user.id)
      : [...event.attendees, user.id];

    try {
      await updateDoc(doc(db, 'events', eventId), {
        attendees: isRegistered ? arrayRemove(user.id) : arrayUnion(user.id)
      });
      
      // Update local state (optimistic update if needed, or trigger refresh)
      // Since events list is managed via AuthContext's onSnapshot, it should technically refresh
      // but if Firestore is delayed, we can force a re-render or local check.
      // Given the list in AuthContext follows onSnapshot, it should work.

      if (linkedContest && !isRegistered) {
        const isParticipant = contestParticipants.some(p => p.contestId === linkedContest.id && p.userId === user.id);
        if (!isParticipant) {
          try {
            await registerForContest(linkedContest.id);
            toast.success('Inscrit à l\'événement et au concours !');
          } catch (err: any) {
            console.error('Auto-contest registration failed:', err);
            toast.success('Inscrit à l\'événement (le concours nécessite plus d\'invitations)');
          }
        } else {
          toast.success('Inscription réussie');
        }
      } else {
        toast.success(isRegistered ? 'Désinscription réussie' : 'Inscription réussie');
      }

      if (!isRegistered && incrementActivity) {
        incrementActivity('eventParticipations').catch(console.error);
      }

      if (logAction) {
        logAction(isRegistered ? 'Désinscription événement' : 'Inscription événement', `Événement: ${event.title}`);
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      toast.error('Erreur lors de l\'inscription');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (isEditing && editingEventId) {
        await updateDoc(doc(db, 'events', editingEventId), {
          ...newEvent,
          updatedAt: new Date().toISOString()
        });
        toast.success('Événement mis à jour !');
        if (logAction) {
          logAction('Modification événement', `Événement: ${newEvent.title}`);
        }
      } else {
        await addEvent(newEvent);
        toast.success('Événement publié !');
      }

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEditInit = (event: CampusEvent) => {
    setNewEvent({
      title: event.title,
      description: event.description,
      type: event.type,
      location: event.location,
      date: event.date,
      time: event.time
    });
    setEditingEventId(event.id);
    setIsEditing(true);
    setShowCreateModal(true);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${title}" ?`)) return;

    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Événement supprimé');
      if (logAction) {
        logAction('Suppression événement', `Événement: ${title}`);
      }
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      type: 'Soutenance',
      location: '',
      date: '',
      time: ''
    });
    setIsEditing(false);
    setEditingEventId(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conference': return <Info size={16} />;
      case 'defense': 
      case 'Soutenance': return <GraduationCap size={16} />;
      case 'competition': return <Trophy size={16} />;
      case 'cultural': return <Music size={16} />;
      case 'Atelier': return <Users size={16} />;
      case 'Séminaire': return <Info size={16} />;
      case 'Colloque': return <Info size={16} />;
      case 'Réunion': return <Users size={16} />;
      default: return <Calendar size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'conference': return 'Conférence';
      case 'defense': 
      case 'Soutenance': return 'Soutenance';
      case 'competition': return 'Compétition';
      case 'cultural': return 'Activité Culturelle';
      case 'Atelier': return 'Atelier';
      case 'Séminaire': return 'Séminaire';
      case 'Colloque': return 'Colloque';
      case 'Réunion': return 'Réunion';
      default: return 'Autre';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conference': 
      case 'Séminaire':
      case 'Colloque': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'defense': 
      case 'Soutenance': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'competition': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'cultural': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Atelier': 
      case 'Réunion': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Événements Universitaires</h1>
          </div>
          <p className="text-slate-500 text-sm">Ne manquez plus aucune conférence, soutenance ou activité sur votre campus.</p>
        </div>
      </div>

      {/* Tabs & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Tous les événements
          </button>
          <button
            onClick={() => setActiveTab('my-events')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'my-events' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mes inscriptions
          </button>
          <button
            onClick={() => setActiveTab('organized')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'organized' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mes publications
          </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="all">Tous les types</option>
            <option value="Soutenance">Soutenance</option>
            <option value="Atelier">Atelier</option>
            <option value="Séminaire">Séminaire</option>
            <option value="Colloque">Colloque</option>
            <option value="Réunion">Réunion</option>
            <option value="conference">Conférences</option>
            <option value="defense">Anciennes Soutenances</option>
            <option value="competition">Compétitions</option>
            <option value="cultural">Culturel</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const organizer = event.organizer || users.find((u: any) => u.id === event.organizerId) || {
                  id: event.organizerId,
                  firstName: 'Utilisateur',
                  lastName: '',
                };
                const isRegistered = user && event.attendees.includes(user.id);
                const isOrganizer = user && (event.organizerId === user.id || user.role === 'admin');

                return (
                  <div key={event.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg border", getTypeColor(event.type))}>
                          {getTypeIcon(event.type)}
                        </div>
                        <div>
                          <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mb-1 inline-block", getTypeColor(event.type))}>
                            {getTypeLabel(event.type)}
                          </span>
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{event.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={14} className="text-indigo-500" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} className="text-indigo-500" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin size={14} className="text-indigo-500" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users size={14} className="text-indigo-500" />
                        <span>{getEventParticipantCount(event)} inscrits</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {organizer?.firstName?.[0] || '?'}
                        </div>
                        <span className="text-xs text-slate-500">Par {organizer?.firstName} {organizer?.lastName}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        {isOrganizer && (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditInit(event);
                              }}
                              className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                              title="Modifier"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id, event.title);
                              }}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedEvent(event);
                            if (incrementActivity) {
                              incrementActivity('eventsViewed').catch(console.error);
                            }
                          }}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                        >
                          <Info size={14} />
                          Voir détails
                        </button>
                        {isOrganizer && (
                          <button 
                            onClick={() => setSelectedEventAttendees(event)}
                            className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                          >
                            <Users size={14} />
                            Voir les inscrits
                          </button>
                        )}
                        {!isOrganizer && (
                          <button 
                            onClick={() => handleRegister(event.id)}
                            className={cn(
                              "px-4 py-2 text-xs font-bold rounded-lg transition-colors",
                              isRegistered 
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            )}
                          >
                            {isRegistered ? 'Se désinscrire' : 'S\'inscrire'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
                {activeTab === 'my-events' ? (
                  <Users size={48} className="mx-auto text-slate-300 mb-4" />
                ) : activeTab === 'organized' ? (
                  <Plus size={48} className="mx-auto text-slate-300 mb-4" />
                ) : (
                  <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                )}
                <h3 className="font-bold text-slate-900 mb-2">
                  {activeTab === 'my-events' ? 'Vos inscriptions' : activeTab === 'organized' ? 'Vos publications' : 'Aucun événement'}
                </h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  {activeTab === 'my-events' 
                    ? "Vous n'êtes inscrit à aucun événement pour le moment. Parcourez la liste pour trouver des activités qui vous intéressent." 
                    : activeTab === 'organized'
                    ? "Vous n'avez publié aucun événement pour le moment. Utilisez le bouton à droite pour créer votre premier événement."
                    : "Aucun événement ne correspond à votre recherche."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Publish Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-indigo-600" />
              Publier un événement
            </h3>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Partagez votre événement avec toute la communauté étudiante.</p>
              <button 
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Créer un événement
              </button>
            </div>
          </div>

          <div className="bg-indigo-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-800 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Rappels Automatiques</h3>
              <p className="text-indigo-200 text-xs mb-4">Recevez une notification 24h avant chaque événement auquel vous êtes inscrit.</p>
              <div className="flex items-center gap-2 text-[10px] font-bold bg-indigo-800/50 w-fit px-2 py-1 rounded-full border border-indigo-700">
                <AlertCircle size={12} />
                SERVICE ACTIF
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg border", getTypeColor(selectedEvent.type))}>
                  {getTypeIcon(selectedEvent.type)}
                </div>
                <div>
                  <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mb-1 inline-block", getTypeColor(selectedEvent.type))}>
                    {getTypeLabel(selectedEvent.type)}
                  </span>
                  <h2 className="font-bold text-slate-900">{selectedEvent.title}</h2>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Calendar size={16} />
                    <span className="text-xs font-bold uppercase">Date</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(selectedEvent.date)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase">Heure</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{selectedEvent.time}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <MapPin size={16} />
                    <span className="text-xs font-bold uppercase">Lieu</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate" title={selectedEvent.location}>{selectedEvent.location}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Users size={16} />
                    <span className="text-xs font-bold uppercase">Inscrits</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{getEventParticipantCount(selectedEvent)} personnes</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Description de l'événement</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedEvent.description}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {(() => {
                    const org = selectedEvent.organizer || users.find((u: any) => u.id === selectedEvent.organizerId);
                    return org?.firstName?.[0] || '?';
                  })()}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Organisé par</p>
                  <p className="text-sm font-bold text-slate-900">
                    {(() => {
                      const org = selectedEvent.organizer || users.find((u: any) => u.id === selectedEvent.organizerId);
                      return org ? `${org.firstName} ${org.lastName}` : 'Utilisateur inconnu';
                    })()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              {user && (selectedEvent.organizerId === user.id || user.role === 'admin') && (
                <>
                  <button 
                    onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleEditInit(selectedEvent)}
                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <Edit size={20} />
                  </button>
                </>
              )}
              <button 
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Fermer
              </button>
              {user && selectedEvent.organizerId !== user.id && (
                <button 
                  onClick={() => {
                    handleRegister(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className={cn(
                    "px-6 py-2 font-bold rounded-xl transition-all shadow-lg",
                    selectedEvent.attendees.includes(user.id)
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-none"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                  )}
                >
                  {selectedEvent.attendees.includes(user.id) ? 'Se désinscrire' : 'S\'inscrire à l\'événement'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-bold text-slate-900">{isEditing ? 'Modifier l\'événement' : 'Créer un événement'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'événement</label>
                <input 
                  required
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Conférence sur l'IA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type d'événement</label>
                <select 
                  value={newEvent.type}
                  onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-700 capitalize"
                >
                  <option value="Soutenance">Soutenance</option>
                  <option value="Atelier">Atelier</option>
                  <option value="Séminaire">Séminaire</option>
                  <option value="Colloque">Colloque</option>
                  <option value="Réunion">Réunion</option>
                  <option value="conference">Conférence</option>
                  <option value="competition">Compétition</option>
                  <option value="cultural">Activité Culturelle</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Décrivez votre événement..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    required
                    type="date" 
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Heure</label>
                  <input 
                    required
                    type="time" 
                    value={newEvent.time}
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label>
                <input 
                  required
                  type="text" 
                  value={newEvent.location}
                  onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Amphi A600, UJKZ"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4"
              >
                {isEditing ? 'Mettre à jour l\'événement' : 'Publier l\'événement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attendees List Modal */}
      {selectedEventAttendees && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="font-bold text-slate-900">Liste des inscrits</h2>
                <p className="text-xs text-slate-500">{selectedEventAttendees.title}</p>
              </div>
              <button onClick={() => setSelectedEventAttendees(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                {getEventParticipants(selectedEventAttendees).length > 0 ? (
                  getEventParticipants(selectedEventAttendees).map((attendeeId) => {
                    const attendee = users.find(u => u.id === attendeeId);
                    return (
                      <div key={attendeeId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                            {attendee?.avatarUrl ? (
                              <img src={attendee.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              attendee?.firstName?.[0] || 'E'
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {attendee ? `${attendee.firstName} ${attendee.lastName}` : `Étudiant #${attendeeId.slice(-4)}`}
                            </p>
                            <p className="text-[10px] text-slate-500">{attendee?.major || 'Étudiant'} • {attendee?.level || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                          CONFIRMÉ
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Aucun inscrit pour le moment.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setSelectedEventAttendees(null)}
                className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
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

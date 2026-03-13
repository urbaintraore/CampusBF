import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Plus, Search, Filter, Shield, AlertCircle, Lock, GraduationCap, Trophy, Music, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { CampusEvent } from '@/types';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';

export default function Events() {
  const { user, events, users } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my-events' | 'organized'>('all');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<CampusEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'conference' as CampusEvent['type'],
    location: '',
    date: '',
    time: ''
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    
    if (activeTab === 'my-events') {
      return matchesSearch && matchesType && user && event.attendees.includes(user.id);
    }

    if (activeTab === 'organized') {
      return matchesSearch && matchesType && user && event.organizerId === user.id;
    }
    
    return matchesSearch && matchesType;
  });

  const handleRegister = async (eventId: string) => {
    if (!user) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const isRegistered = event.attendees.includes(user.id);

    try {
      await updateDoc(doc(db, 'events', eventId), {
        attendees: isRegistered ? arrayRemove(user.id) : arrayUnion(user.id)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${eventId}`);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        organizerId: user.id,
        attendees: [user.id],
        createdAt: serverTimestamp()
      });

      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        type: 'conference',
        location: '',
        date: '',
        time: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'events');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conference': return <Info size={16} />;
      case 'defense': return <GraduationCap size={16} />;
      case 'competition': return <Trophy size={16} />;
      case 'cultural': return <Music size={16} />;
      default: return <Calendar size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'conference': return 'Conférence';
      case 'defense': return 'Soutenance';
      case 'competition': return 'Compétition';
      case 'cultural': return 'Activité Culturelle';
      default: return 'Autre';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conference': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'defense': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'competition': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'cultural': return 'bg-purple-50 text-purple-700 border-purple-100';
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
            <option value="conference">Conférences</option>
            <option value="defense">Soutenances</option>
            <option value="competition">Compétitions</option>
            <option value="cultural">Culturel</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'all' ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => {
                  const organizer = users.find(u => u.id === event.organizerId);
                  const isRegistered = user && event.attendees.includes(user.id);
                  const isOrganizer = user && event.organizerId === user.id;

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
                          <span>{new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
                          <span>{event.attendees.length} inscrits</span>
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
                  <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">
                    {activeTab === 'my-events' 
                      ? "Vous n'êtes inscrit à aucun événement pour le moment." 
                      : activeTab === 'organized'
                      ? "Vous n'avez publié aucun événement pour le moment."
                      : "Aucun événement ne correspond à votre recherche."}
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'my-events' ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2">Vos inscriptions</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Vous n'êtes inscrit à aucun événement pour le moment. Parcourez la liste pour trouver des activités qui vous intéressent.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
              <Plus size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2">Vos publications</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Vous n'avez publié aucun événement pour le moment. Utilisez le bouton à droite pour créer votre premier événement.</p>
            </div>
          )}
        </div>

        {/* Sidebar / Publish Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-indigo-600" />
              Publier un événement
            </h3>
            
            {user?.eventSubscriptionStatus === 'active' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Partagez votre événement avec toute la communauté étudiante.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Créer un événement
                </button>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <Shield size={12} /> Abonnement Actif
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <Lock size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-600 mb-4">
                    Pour publier des événements, un abonnement de 2000 FCFA / mois est requis.
                  </p>
                  
                  {user?.eventSubscriptionStatus === 'pending' ? (
                    <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-xs font-medium flex items-center gap-2 justify-center">
                      <Clock size={16} />
                      Paiement en attente...
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowSubscriptionModal(true)}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      S'abonner (2000 F)
                    </button>
                  )}
                </div>
              </div>
            )}
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

      <ManualPaymentModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        type="event"
        amount={2000}
        title="Abonnement Événements"
        description="Publiez vos conférences, soutenances et activités culturelles pendant 30 jours."
      />

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-bold text-slate-900">Créer un événement</h2>
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
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="conference">Conférence</option>
                  <option value="defense">Soutenance</option>
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
                Publier l'événement
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
                {selectedEventAttendees.attendees.length > 0 ? (
                  selectedEventAttendees.attendees.map((attendeeId) => {
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

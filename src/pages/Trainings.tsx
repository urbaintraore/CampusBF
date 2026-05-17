import React, { useState } from 'react';
import { Search, Plus, Filter, BookOpen, Clock, Users, MapPin, Globe, CheckCircle, AlertTriangle, Star, Shield, ChevronRight, Info, Flag, X, Check, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Training } from '@/types';

const DOMAINS = [
  'Informatique',
  'Mathématiques',
  'Finance',
  'Langues',
  'Marketing',
  'Management',
  'Santé',
  'Droit',
  'Art & Design',
  'Autre'
];

export default function Trainings() {
  const { user, trainings, addTraining, enrollInTraining, reportTraining, reviewTraining, deleteTraining } = useAuth();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-trainings' | 'organized'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'online' | 'in_person'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Form state
  const [newTraining, setNewTraining] = useState({
    title: '',
    description: '',
    domain: DOMAINS[0],
    type: 'online' as 'online' | 'in_person',
    location: '',
    meetingLink: '',
    price: 0,
    startDate: '',
    duration: '',
    maxParticipants: 20,
    imageUrl: ''
  });

  // Report state
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const filteredTrainings = trainings.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || t.domain === selectedDomain;
    const matchesType = selectedType === 'all' || t.type === selectedType;
    
    if (activeTab === 'browse') return t.status === 'approved' && matchesSearch && matchesDomain && matchesType;
    if (activeTab === 'my-trainings') return t.participants.includes(user?.id || '') && matchesSearch;
    if (activeTab === 'organized') return t.trainerId === user?.id && matchesSearch;
    return false;
  });

  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await addTraining({
        ...newTraining,
        location: newTraining.type === 'in_person' ? newTraining.location : '',
        meetingLink: newTraining.type === 'online' ? newTraining.meetingLink : '',
        trainerId: user.id,
        trainerName: `${user.firstName} ${user.lastName}`,
        trainerAvatar: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`,
        trainerUniversity: user.university || '',
        trainerRating: user.trainingStats?.averageRating || 5,
        trainerTrainingsCount: user.trainingStats?.trainingsOrganized || 0
      });
      
      setShowAddModal(false);
      setNewTraining({
        title: '',
        description: '',
        domain: DOMAINS[0],
        type: 'online',
        location: '',
        meetingLink: '',
        price: 0,
        startDate: '',
        duration: '',
        maxParticipants: 20,
        imageUrl: ''
      });
      alert("Votre formation a été soumise pour validation.");
    } catch (e: any) {
      alert("Une erreur est survenue: " + e.message);
    }
  };

  const handleEnroll = async (trainingId: string) => {
    if (!user) return;
    await enrollInTraining(trainingId);
  };

  const handleReport = async () => {
    if (!selectedTraining || !user) return;
    await reportTraining(selectedTraining.id, reportReason, reportDetails);
    setShowReportModal(false);
    setReportReason('');
    setReportDetails('');
    alert("Signalement envoyé.");
  };

  const handleReview = async () => {
    if (!selectedTraining || !user) return;
    await reviewTraining(selectedTraining.id, reviewRating, reviewComment);
    setShowReviewModal(false);
    setReviewRating(5);
    setReviewComment('');
    alert("Avis publié.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Formations</h1>
          <p className="text-slate-500 mt-1">Apprenez de nouvelles compétences ou partagez votre savoir.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          Proposer une formation
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('browse')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'browse' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Explorer
            </button>
            <button
              onClick={() => setActiveTab('my-trainings')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'my-trainings' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Mes inscriptions
            </button>
            <button
              onClick={() => setActiveTab('organized')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'organized' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Mes formations
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une formation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Tous les domaines</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Tous les types</option>
            <option value="online">En ligne</option>
            <option value="in_person">Présentiel</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainings.map((training) => (
          <div 
            key={training.id}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={training.imageUrl || `https://picsum.photos/seed/${training.id}/800/600`} 
                alt={training.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm",
                  training.type === 'online' ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
                )}>
                  {training.type === 'online' ? 'En ligne' : 'Présentiel'}
                </span>
                <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {training.domain}
                </span>
              </div>
              {training.price === 0 && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Gratuit
                </div>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <img 
                  src={training.trainerAvatar} 
                  alt={training.trainerName} 
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-xs font-medium text-slate-600">{training.trainerName}</span>
                <div className="flex items-center gap-0.5 ml-auto">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-slate-700">{training.trainerRating?.toFixed(1) || '5.0'}</span>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">{training.title}</h3>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{training.description}</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar size={14} className="text-emerald-600" />
                  <span>{new Date(training.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {training.startDate.split('T')[1]?.substring(0, 5) || '00:00'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} className="text-emerald-600" />
                  <span>{training.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users size={14} className="text-emerald-600" />
                  <span>{training.participants.length} / {training.maxParticipants} inscrits</span>
                </div>
                {training.type === 'in_person' ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={14} className="text-emerald-600" />
                    <span className="truncate">{training.location}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Globe size={14} className="text-emerald-600" />
                    <span>Lien de réunion disponible après inscription</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                <div className="text-lg font-bold text-emerald-700">
                  {training.price > 0 ? `${training.price.toLocaleString()} CFA` : 'Gratuit'}
                </div>
                <button 
                  onClick={() => setSelectedTraining(training)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95"
                >
                  Détails
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTrainings.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Aucune formation trouvée</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Essayez de modifier vos filtres ou recherchez un autre domaine.
          </p>
        </div>
      )}

      {/* Details Modal */}
      {selectedTraining && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative h-64">
              <img 
                src={selectedTraining.imageUrl || `https://picsum.photos/seed/${selectedTraining.id}/800/600`} 
                alt={selectedTraining.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setSelectedTraining(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedTraining.domain}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedTraining.type === 'online' ? 'En ligne' : 'Présentiel'}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold text-slate-700">{selectedTraining.trainerRating?.toFixed(1) || '5.0'}</span>
                  <span className="text-slate-400 text-sm">({selectedTraining.trainerTrainingsCount || 0} formations)</span>
                </div>
              </div>

              <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">{selectedTraining.title}</h2>
              
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-8">
                <img 
                  src={selectedTraining.trainerAvatar} 
                  alt={selectedTraining.trainerName} 
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedTraining.trainerName}</p>
                  <p className="text-xs text-slate-500">{selectedTraining.trainerUniversity}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prix</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {selectedTraining.price > 0 ? `${selectedTraining.price.toLocaleString()} CFA` : 'Gratuit'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Info size={18} className="text-emerald-600" />
                      Description
                    </h4>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedTraining.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Calendar size={18} className="text-emerald-600" />
                      Détails logistiques
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm text-slate-500">Date de début</span>
                        <span className="text-sm font-bold text-slate-900">
                          {new Date(selectedTraining.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm text-slate-500">Heure</span>
                        <span className="text-sm font-bold text-slate-900">{selectedTraining.startDate.split('T')[1]?.substring(0, 5) || '00:00'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm text-slate-500">Durée</span>
                        <span className="text-sm font-bold text-slate-900">{selectedTraining.duration}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm text-slate-500">Capacité</span>
                        <span className="text-sm font-bold text-slate-900">{selectedTraining.maxParticipants} participants max</span>
                      </div>
                    </div>
                  </div>

                  {selectedTraining.type === 'in_person' ? (
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <MapPin size={18} className="text-emerald-600" />
                        Lieu
                      </h4>
                      <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                        {selectedTraining.location}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <Globe size={18} className="text-emerald-600" />
                        Lien de réunion
                      </h4>
                      <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic">
                        {selectedTraining.participants.includes(user?.id || '') 
                          ? selectedTraining.meetingLink 
                          : "Le lien sera visible après votre inscription."}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
                {selectedTraining.participants.includes(user?.id || '') ? (
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
                    <CheckCircle size={20} />
                    Vous êtes inscrit
                  </div>
                ) : (
                  <button 
                    onClick={() => handleEnroll(selectedTraining.id)}
                    disabled={selectedTraining.participants.length >= selectedTraining.maxParticipants}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedTraining.participants.length >= selectedTraining.maxParticipants ? 'Complet' : "S'inscrire à la formation"}
                  </button>
                )}
                
                <div className="flex gap-2">
                  {selectedTraining.participants.includes(user?.id || '') && (
                    <button 
                      onClick={() => setShowReviewModal(true)}
                      className="px-6 py-3 border-2 border-amber-500 text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition-all"
                    >
                      Laisser un avis
                    </button>
                  )}
                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Signaler"
                  >
                    <Flag size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Proposer une formation</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTraining} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Titre de la formation</label>
                  <input
                    required
                    type="text"
                    value={newTraining.title}
                    onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Ex: Introduction au Développement Web"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Description détaillée</label>
                  <textarea
                    required
                    rows={4}
                    value={newTraining.description}
                    onChange={(e) => setNewTraining({...newTraining, description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Objectifs, prérequis, programme..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Domaine</label>
                  <select
                    value={newTraining.domain}
                    onChange={(e) => setNewTraining({...newTraining, domain: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Type</label>
                  <select
                    value={newTraining.type}
                    onChange={(e) => setNewTraining({...newTraining, type: e.target.value as any})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="online">En ligne</option>
                    <option value="in_person">Présentiel</option>
                  </select>
                </div>

                {newTraining.type === 'in_person' ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Lieu de rencontre</label>
                    <input
                      required
                      type="text"
                      value={newTraining.location}
                      onChange={(e) => setNewTraining({...newTraining, location: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Ex: Université Joseph Ki-Zerbo, Salle 10"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Lien de réunion (Zoom, Meet, etc.)</label>
                    <input
                      required
                      type="url"
                      value={newTraining.meetingLink}
                      onChange={(e) => setNewTraining({...newTraining, meetingLink: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Prix (CFA, 0 si gratuit)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={newTraining.price}
                    onChange={(e) => setNewTraining({...newTraining, price: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nombre max de participants</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newTraining.maxParticipants}
                    onChange={(e) => setNewTraining({...newTraining, maxParticipants: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Date et heure de début</label>
                  <input
                    required
                    type="datetime-local"
                    value={newTraining.startDate}
                    onChange={(e) => setNewTraining({...newTraining, startDate: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Durée</label>
                  <input
                    required
                    type="text"
                    value={newTraining.duration}
                    onChange={(e) => setNewTraining({...newTraining, duration: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Ex: 2 heures, 3 jours..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">URL de l'image (optionnel)</label>
                  <input
                    type="url"
                    value={newTraining.imageUrl}
                    onChange={(e) => setNewTraining({...newTraining, imageUrl: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  En publiant cette formation, vous vous engagez à fournir un contenu de qualité et à respecter les participants. 
                  Toute formation frauduleuse entraînera la suspension de votre compte.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
              >
                Soumettre la formation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Signaler la formation</h2>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Raison</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Sélectionnez une raison</option>
                  <option value="fraud">Fraude / Arnaque</option>
                  <option value="inappropriate">Contenu inapproprié</option>
                  <option value="spam">Spam</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Détails</label>
                <textarea
                  rows={4}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Décrivez le problème..."
                />
              </div>
              <button
                onClick={handleReport}
                disabled={!reportReason || !reportDetails}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Envoyer le signalement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Laisser un avis</h2>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-all hover:scale-110"
                  >
                    <Star 
                      size={32} 
                      className={cn(
                        "transition-colors",
                        star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-slate-200"
                      )}
                    />
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Votre commentaire</label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Qu'avez-vous pensé de cette formation ?"
                />
              </div>
              <button
                onClick={handleReview}
                disabled={!reviewComment}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                Publier l'avis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

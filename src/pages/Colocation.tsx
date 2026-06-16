import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Search, 
  Filter, 
  Plus, 
  MapPin, 
  Users, 
  DollarSign, 
  GraduationCap, 
  Clock, 
  ChevronRight, 
  Heart, 
  Share2, 
  MessageCircle, 
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { Colocation, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const AGE_RANGES = ['18-22', '23-26', '27-30', '30+'];
const STUDY_LEVELS = ['L1', 'L2', 'L3', 'Master', 'Doctorat'];
const GENDERS = [
  { id: 'any', label: 'Indifférent' },
  { id: 'male', label: 'Homme' },
  { id: 'female', label: 'Femme' }
];

export default function ColocationPage() {
  const { user, colocations, createColocation, sendColocationRequest, openAuthModal } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedColoc, setSelectedColoc] = useState<Colocation | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    city: '',
    university: '',
    gender: 'any',
    maxPrice: '',
    level: ''
  });

  const filteredColocations = useMemo(() => {
    return colocations.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = !filters.city || c.city === filters.city;
      const matchesUni = !filters.university || c.university.toLowerCase().includes(filters.university.toLowerCase());
      const matchesGender = filters.gender === 'any' || c.preferredGender === filters.gender;
      const matchesPrice = !filters.maxPrice || c.price <= parseInt(filters.maxPrice);
      const matchesLevel = !filters.level || c.studyLevel === filters.level;

      return matchesSearch && matchesCity && matchesUni && matchesGender && matchesPrice && matchesLevel && c.status === 'active';
    });
  }, [colocations, searchTerm, filters]);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedColoc) return;

    const formData = new FormData(e.currentTarget);
    try {
      await sendColocationRequest({
        colocationId: selectedColoc.id,
        message: formData.get('message') as string
      });
      setShowRequestModal(false);
      alert('Votre demande a été envoyée avec succès !');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Home className="text-emerald-600" />
            Colocation CampusBF
          </h1>
          <p className="text-slate-500 mt-1">Trouvez vos futurs colocataires parmi la communauté étudiante.</p>
        </div>
        <button 
          onClick={() => {
            if (!user) {
              openAuthModal();
            } else {
              setShowAddModal(true);
            }
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 cursor-pointer"
        >
          <Plus size={20} />
          Publier une annonce
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Rechercher par titre, quartier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
              showFilters ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <Filter size={20} />
            Filtres
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ville</label>
                  <input 
                    type="text"
                    placeholder="Ex: Ouagadougou"
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Budget Max (CFA)</label>
                  <input 
                    type="number"
                    placeholder="Ex: 50000"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sexe préféré</label>
                  <select 
                    value={filters.gender}
                    onChange={(e) => setFilters({...filters, gender: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {GENDERS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Niveau d'étude</label>
                  <select 
                    value={filters.level}
                    onChange={(e) => setFilters({...filters, level: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Tous les niveaux</option>
                    {STUDY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredColocations.map((coloc) => (
          <motion.div 
            key={coloc.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="relative h-48">
              <img 
                src={coloc.imageUrls[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'} 
                alt={coloc.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-emerald-600 font-bold text-sm">
                {coloc.price.toLocaleString()} CFA/mois
              </div>
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                  {coloc.city}
                </span>
                <span className="bg-emerald-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                  {coloc.neighborhood}
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-900 line-clamp-1">{coloc.title}</h3>
                <button className="text-slate-300 hover:text-rose-500 transition-colors">
                  <Heart size={20} />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <MapPin size={14} />
                <span className="line-clamp-1">{coloc.university}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                  <Users size={14} className="text-emerald-500" />
                  <span>{coloc.roommatesNeeded} colocs recherchés</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                  <GraduationCap size={14} className="text-emerald-500" />
                  <span>Préféré: {coloc.studyLevel}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                    <img 
                      src={coloc.ownerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${coloc.ownerId}`} 
                      alt={coloc.ownerName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-[10px]">
                    <p className="font-bold text-slate-900">{coloc.ownerName}</p>
                    <p className="text-slate-400">Propriétaire</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!user) {
                      openAuthModal();
                    } else {
                      setSelectedColoc(coloc);
                      setShowRequestModal(true);
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Postuler
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredColocations.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Aucune annonce trouvée</h3>
            <p className="text-slate-500 mt-2">Essayez de modifier vos filtres ou votre recherche.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto shadow-2xl relative"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-slate-900">Publier une annonce</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;
                const formData = new FormData(e.currentTarget);
                try {
                  await createColocation({
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    city: formData.get('city') as string,
                    neighborhood: formData.get('neighborhood') as string,
                    university: formData.get('university') as string,
                    distanceFromUni: parseFloat(formData.get('distanceFromUni') as string),
                    roomsCount: parseInt(formData.get('roomsCount') as string),
                    roommatesNeeded: parseInt(formData.get('roommatesNeeded') as string),
                    price: parseInt(formData.get('price') as string),
                    imageUrls: [], // For now
                    preferredGender: formData.get('preferredGender') as any,
                    ageRange: formData.get('ageRange') as string,
                    studyLevel: formData.get('studyLevel') as string,
                    lifestyleHabits: (formData.get('lifestyleHabits') as string).split(',').map(s => s.trim()),
                    status: 'active'
                  });
                  setShowAddModal(false);
                  alert('Annonce publiée avec succès !');
                } catch (error: any) {
                  alert(error.message);
                }
              }} className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Titre de l'annonce</label>
                    <input name="title" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: Chambre spacieuse près de l'UJKZ" />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                    <textarea name="description" required rows={2} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Décrivez le logement et l'ambiance..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Ville</label>
                    <input name="city" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: Ouagadougou" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Quartier</label>
                    <input name="neighborhood" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: Zogona" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Université proche</label>
                    <input name="university" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: Université Joseph Ki-Zerbo" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Distance de l'université (km)</label>
                    <input name="distanceFromUni" type="number" step="0.1" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: 0.5" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Prix mensuel (CFA)</label>
                    <input name="price" type="number" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: 35000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Colocataires recherchés</label>
                    <input name="roommatesNeeded" type="number" required className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm focus:bg-white transition-all outline-none" placeholder="Ex: 1" />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users size={16} className="text-emerald-600" />
                    Profil recherché
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sexe préféré</label>
                      <select name="preferredGender" className="w-full px-3 py-1.5 bg-white border border-slate-200/60 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                        {GENDERS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Niveau d'étude</label>
                      <select name="studyLevel" className="w-full px-3 py-1.5 bg-white border border-slate-200/60 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                        {STUDY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tranche d'âge</label>
                      <select name="ageRange" className="w-full px-3 py-1.5 bg-white border border-slate-200/60 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none">
                        {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Habitudes</label>
                      <input name="lifestyleHabits" className="w-full px-3 py-1.5 bg-white border border-slate-200/60 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: calme, non-fumeur" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm shadow-sm shadow-emerald-600/10">
                    Publier l'annonce
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && selectedColoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Postuler pour la colocation</h2>
                <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRequest} className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Home size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{selectedColoc.title}</h3>
                    <p className="text-xs text-slate-500">{selectedColoc.price.toLocaleString()} CFA/mois</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Votre message de présentation</label>
                  <textarea 
                    name="message" 
                    required 
                    rows={4} 
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" 
                    placeholder="Présentez-vous brièvement (habitudes, études...)"
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
                  <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Votre profil étudiant (université, niveau) sera automatiquement partagé avec le propriétaire de l'annonce.
                  </p>
                </div>

                <button type="submit" className="w-full px-6 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                  Envoyer ma demande
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

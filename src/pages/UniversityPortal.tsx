import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { School, Users, FileText, Calendar, Plus, Trophy, Award, MessageCircle, Briefcase, X } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

export default function UniversityPortal() {
  const { user, events, users, internships, addInternship, addEvent } = useAuth();
  
  const universityEvents = events.filter(e => e.organizerId === user?.id);
  const universityOffers = internships.filter(i => i.authorId === user?.id);
  const registeredStudents = users.filter((u: any) => u.university === user?.institutionProfile?.type); // Assuming matching name or logic

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for offer
  const [newOffer, setNewOffer] = useState({
    title: '',
    company: user?.university || (user ? `${user.firstName} ${user.lastName}` : ''),
    location: '',
    type: 'Stage' as 'Stage' | 'Bourse' | 'Emploi' | 'Job Etudiant',
    description: '',
    applicationMethod: 'email' as 'email' | 'url',
    applicationValue: '',
    deadline: ''
  });

  // Form state for event
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'Soutenance' as 'conference' | 'defense' | 'competition' | 'cultural' | 'Soutenance' | 'Atelier' | 'Séminaire' | 'Colloque' | 'Réunion' | 'other',
    location: '',
    date: '',
    time: ''
  });

  const handlePostOffer = () => {
    setNewOffer({
      title: '',
      company: user?.university || (user ? `${user.firstName} ${user.lastName}` : ''),
      location: '',
      type: 'Stage',
      description: '',
      applicationMethod: 'email',
      applicationValue: '',
      deadline: ''
    });
    setShowOfferModal(true);
  };

  const handlePostEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      type: 'Soutenance',
      location: '',
      date: '',
      time: ''
    });
    setShowEventModal(true);
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addInternship({
        ...newOffer,
        authorId: user.id,
        postedAt: serverTimestamp(),
      } as any);
      alert('Offre publiée avec succès !');
      setShowOfferModal(false);
    } catch (error) {
      alert('Une erreur est survenue lors de la publication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addEvent({
        ...newEvent,
        organizerId: user.id,
        organizer: user,
        attendees: [],
        createdAt: new Date().toISOString(),
      } as any);
      alert('Événement publié avec succès !');
      setShowEventModal(false);
    } catch (error) {
      alert('Une erreur est survenue lors de la publication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <School size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portail Institution</h1>
            <p className="text-slate-500">Gérez votre présence et interagissez avec vos étudiants</p>
          </div>
        </div>
        <div className="flex gap-4 border-l border-slate-200 pl-6 ml-6">
          <button 
            onClick={handlePostOffer}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors shadow-sm font-medium"
          >
            <Briefcase size={18} />
            <span className="text-sm">Créer une offre</span>
          </button>
          <button 
            onClick={handlePostEvent}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm font-medium"
          >
            <Calendar size={18} />
            <span className="text-sm">Créer un événement</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Étudiants inscrits</p>
            <p className="text-2xl font-black text-slate-900">{registeredStudents.length > 0 ? registeredStudents.length : '--'}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Événements organisés</p>
            <p className="text-2xl font-black text-slate-900">{universityEvents.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Offres publiées</p>
            <p className="text-xl font-bold text-slate-900">{universityOffers.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Vos événements récents
            </h2>
          </div>
          <div className="p-6">
            {universityEvents.length > 0 ? (
              <div className="space-y-4">
                {universityEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">{event.title}</h3>
                      <p className="text-sm text-slate-500 capitalize">{event.type} • {event.date} à {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">Organisez des journées portes ouvertes, des séminaires, etc.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              Vos offres (Stages, Bourses...)
            </h2>
          </div>
          <div className="p-6">
             {universityOffers.length > 0 ? (
              <div className="space-y-4">
                {universityOffers.slice(0, 3).map(offer => (
                  <div key={offer.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">{offer.title}</h3>
                      <p className="text-sm text-slate-500">{offer.type} • {offer.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">Aucune offre publiée pour le moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowOfferModal(false)} />
          <div className="bg-white relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Publier une offre</h2>
                <p className="text-slate-500 text-sm mt-1">Stages, emplois, et bourses pour vos étudiants.</p>
              </div>
              <button 
                onClick={() => setShowOfferModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto">
               <form className="space-y-6" onSubmit={handleSubmitOffer}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Titre de l'offre</label>
                      <input 
                        type="text" 
                        required 
                        value={newOffer.title}
                        onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                        placeholder="Ex: Bourse d'excellence 2025" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Organisme / Institution</label>
                      <input 
                        type="text" 
                        required 
                        value={newOffer.company}
                        onChange={(e) => setNewOffer({ ...newOffer, company: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Lieu</label>
                      <input 
                        type="text" 
                        required 
                        value={newOffer.location}
                        onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })}
                        placeholder="Ex: Campus Principal / Paris" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-900">Type d'offre</label>
                       <select 
                         value={newOffer.type}
                         onChange={(e) => setNewOffer({ ...newOffer, type: e.target.value as any })}
                         className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                       >
                         <option value="Stage">Stage</option>
                         <option value="Bourse">Bourse d'études</option>
                         <option value="Emploi">Emploi</option>
                         <option value="Job Etudiant">Job Étudiant</option>
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Mode de candidature</label>
                      <select 
                        value={newOffer.applicationMethod || 'email'}
                        onChange={(e) => setNewOffer({ ...newOffer, applicationMethod: e.target.value as 'email' | 'url', applicationValue: '' })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                      >
                        <option value="email">Email</option>
                        <option value="url">Lien web</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-semibold text-slate-900">
                        {newOffer.applicationMethod === 'url' ? 'Lien de candidature' : 'Email de réception'}
                      </label>
                      <input 
                        type={newOffer.applicationMethod === 'url' ? 'url' : 'email'}
                        required 
                        value={newOffer.applicationValue || ''}
                        onChange={(e) => setNewOffer({ ...newOffer, applicationValue: e.target.value })}
                        placeholder={newOffer.applicationMethod === 'url' ? 'Ex: https://...' : 'Ex: admissions@univ.edu'}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Date limite</label>
                    <input 
                      type="date" 
                      value={newOffer.deadline}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewOffer({ ...newOffer, deadline: e.target.value })}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Description détaillée</label>
                    <textarea 
                      required 
                      value={newOffer.description}
                      onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                      placeholder="Décrivez les critères d'éligibilité, la mission..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all min-h-[150px]"
                      rows={5}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setShowOfferModal(false)}
                      className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70"
                    >
                      {isSubmitting ? 'Publication en cours...' : 'Publier l\'offre'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEventModal(false)} />
          <div className="bg-white relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Créer un événement</h2>
                <p className="text-slate-500 text-sm mt-1">Soutenances, séminaires, colloques et réunions.</p>
              </div>
              <button 
                onClick={() => setShowEventModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto">
               <form className="space-y-6" onSubmit={handleSubmitEvent}>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Titre de l'événement</label>
                    <input 
                      type="text" 
                      required 
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Ex: Soutenance de Thèse - M. Dupont" 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-900">Type d'événement</label>
                       <select 
                         value={newEvent.type}
                         onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                         className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all capitalize"
                       >
                         <option value="Soutenance">Soutenance</option>
                         <option value="Atelier">Atelier</option>
                         <option value="Séminaire">Séminaire</option>
                         <option value="Colloque">Colloque</option>
                         <option value="Réunion">Réunion</option>
                         <option value="conference">Conférence</option>
                         <option value="cultural">Événement Culturel</option>
                         <option value="other">Autre / Portes Ouvertes</option>
                       </select>
                    </div>
                     <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Lieu (Salle / Amphi / Lien)</label>
                      <input 
                        type="text" 
                        required 
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="Ex: Amphi 400 ou Lien Zoom" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Date</label>
                      <input 
                        type="date" 
                        required 
                        value={newEvent.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Heure</label>
                      <input 
                        type="time" 
                        required 
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Description / Intervenants</label>
                    <textarea 
                      required 
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Décrivez l'ordre du jour, les intervenants attendus..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all min-h-[120px]"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70"
                    >
                      {isSubmitting ? 'Création en cours...' : 'Publier l\'événement'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Briefcase, Users, FileText, CheckCircle2, Plus, Clock, Search, MapPin, X, AlertCircle } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

export default function EnterprisePortal() {
  const { user, isAdmin, internships, addInternship } = useAuth();
  
  const companyInternships = internships.filter(i => i.authorId === user?.id);

  const [showPostModal, setShowPostModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  // Form state for new internship
  const [newInternship, setNewInternship] = useState({
    title: '',
    company: user?.companyName || '',
    location: '',
    type: 'Stage' as 'Stage' | 'Bourse' | 'Emploi' | 'Job Etudiant',
    description: '',
    applicationMethod: 'email' as 'email' | 'url',
    applicationValue: '',
    deadline: ''
  });

  const isSubscriptionActive = user?.premiumSubscriptionStatus === 'active';
  const isSubscriptionPending = user?.premiumSubscriptionStatus === 'pending';

  const handlePostInternship = () => {
    if (!user) {
      alert('Veuillez vous connecter pour publier une offre.');
      return;
    }
    setNewInternship({
      title: '',
      company: user.companyName || '',
      location: '',
      type: 'Stage',
      description: '',
      applicationMethod: 'email',
      applicationValue: '',
      deadline: ''
    });
    setShowPostModal(true);
  };

  const handleSubmitInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addInternship({
        ...newInternship,
        authorId: user.id,
        postedAt: serverTimestamp(),
      } as any);
      alert('Offre publiée avec succès !');
      setShowPostModal(false);
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
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portail Entreprise</h1>
            <p className="text-slate-500">Gérez vos offres et recrutez des talents de CampusBF</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Offres publiées</p>
            <p className="text-2xl font-black text-slate-900">{companyInternships.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Candidatures reçues</p>
            <p className="text-2xl font-black text-slate-900">--</p>
          </div>
        </div>


      </div>

      <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Besoin de missions freelance ponctuelles ?</h2>
          <p className="text-emerald-100 text-sm mt-1">Publiez des missions de rédaction, design, dev ou saisie pour nos étudiants talentueux.</p>
        </div>
        <a 
          href="/missions"
          className="px-5 py-3 bg-white text-emerald-800 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm whitespace-nowrap"
        >
          Gérer les missions freelance 🚀
        </a>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            Mes offres récentes
          </h2>
          <button onClick={handlePostInternship} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus size={18} />
            <span className="text-sm font-medium">Créer une offre</span>
          </button>
        </div>
        <div className="p-6">
          {companyInternships.length > 0 ? (
            <div className="space-y-4">
              {companyInternships.map(internship => (
                <div key={internship.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900">{internship.title}</h3>
                    <p className="text-sm text-slate-500">{internship.type} • {internship.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">Vous n'avez pas encore publié d'offres.</p>
            </div>
          )}
        </div>
      </div>

      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPostModal(false)} />
          <div className="bg-white relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Publier une offre</h2>
                <p className="text-slate-500 text-sm mt-1">Remplissez les détails de l'offre ci-dessous.</p>
              </div>
              <button 
                onClick={() => setShowPostModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto">
                <form className="space-y-6" onSubmit={handleSubmitInternship}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Titre du poste</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.title}
                        onChange={(e) => setNewInternship({ ...newInternship, title: e.target.value })}
                        placeholder="Ex: Développeur Web Junior" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Entreprise</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.company}
                        onChange={(e) => setNewInternship({ ...newInternship, company: e.target.value })}
                        placeholder="Nom de votre entreprise" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Lieu</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.location}
                        onChange={(e) => setNewInternship({ ...newInternship, location: e.target.value })}
                        placeholder="Ex: Ouagadougou, Burkina Faso" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Type de contrat</label>
                      <select 
                        value={newInternship.type}
                        onChange={(e) => setNewInternship({ ...newInternship, type: e.target.value as any })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      >
                        <option value="Stage">Stage</option>
                        <option value="Bourse">Bourse</option>
                        <option value="Emploi">Emploi</option>
                        <option value="Job Etudiant">Job Etudiant</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Mode de réception</label>
                      <select 
                        value={newInternship.applicationMethod || 'email'}
                        onChange={(e) => setNewInternship({ ...newInternship, applicationMethod: e.target.value as 'email' | 'url', applicationValue: '' })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      >
                        <option value="email">Email</option>
                        <option value="url">Lien web</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-semibold text-slate-900">
                        {newInternship.applicationMethod === 'url' ? 'Lien du site web' : 'Email de réception'}
                      </label>
                      <input 
                        type={newInternship.applicationMethod === 'url' ? 'url' : 'email'}
                        required 
                        value={newInternship.applicationValue || ''}
                        onChange={(e) => setNewInternship({ ...newInternship, applicationValue: e.target.value })}
                        placeholder={newInternship.applicationMethod === 'url' ? 'Ex: https://entreprise.com/jobs' : 'Ex: rh@entreprise.com'}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Date limite (Optionnel)</label>
                    <input 
                      type="date" 
                      value={newInternship.deadline}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewInternship({ ...newInternship, deadline: e.target.value })}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Description du poste</label>
                    <textarea 
                      required 
                      value={newInternship.description}
                      onChange={(e) => setNewInternship({ ...newInternship, description: e.target.value })}
                      placeholder="Décrivez les missions, le profil recherché..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[150px]"
                      rows={5}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setShowPostModal(false)}
                      className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Publication en cours...
                        </>
                      ) : (
                        <>Publier l'offre</>
                      )}
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

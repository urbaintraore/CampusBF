import React, { useState, useRef } from 'react';
import { Briefcase, MapPin, Clock, Building2, Plus, X, Send, CheckCircle2, AlertCircle, FileUp, Edit } from 'lucide-react';
import { MOCK_INTERNSHIPS } from '@/data/mock';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { cn } from '@/lib/utils';

export default function Internships() {
  const { user } = useAuth();
  const [internships, setInternships] = useState(MOCK_INTERNSHIPS);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showApplySuccess, setShowApplySuccess] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [applyFile, setApplyFile] = useState<File | null>(null);
  const applyFileInputRef = useRef<HTMLInputElement>(null);

  // Form state for new internship
  const [newInternship, setNewInternship] = useState({
    title: '',
    company: '',
    location: '',
    type: 'internship' as 'internship' | 'job',
    description: '',
    applicationEmail: '',
    deadline: ''
  });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const isSubscriptionActive = user?.premiumSubscriptionStatus === 'active';
  const isAdmin = user?.role === 'admin';

  const handlePostInternship = () => {
    if (!user) {
      alert('Veuillez vous connecter pour publier un stage.');
      return;
    }
    setEditingId(null);
    setNewInternship({
      title: '',
      company: '',
      location: '',
      type: 'internship',
      description: '',
      applicationEmail: '',
      deadline: ''
    });
    setShowPostModal(true);
  };

  const openApplyModal = (jobTitle: string) => {
    if (!user) {
      alert('Veuillez vous connecter pour postuler.');
      return;
    }
    setSelectedJob(jobTitle);
    setShowApplyModal(true);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyFile) {
      alert('Veuillez charger votre dossier (CV/Lettre de motivation).');
      return;
    }
    
    // Simulate upload and submission
    setShowApplyModal(false);
    setShowApplySuccess(true);
    setApplyFile(null);
    setTimeout(() => setShowApplySuccess(false), 3000);
  };

  const handleSubmitInternship = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setInternships(prev => prev.map(item => 
        item.id === editingId ? { ...item, ...newInternship } : item
      ));
      alert('Offre modifiée avec succès !');
    } else {
      const internship = {
        id: `i-${Date.now()}`,
        ...newInternship,
        postedAt: new Date().toISOString().split('T')[0]
      };
      setInternships([internship, ...internships]);
      alert('Offre publiée avec succès !');
    }
    setShowPostModal(false);
  };

  const handleDeleteInternship = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) {
      setInternships(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleEditInternship = (job: any) => {
    setEditingId(job.id);
    setNewInternship({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      description: job.description,
      applicationEmail: job.applicationEmail || '',
      deadline: job.deadline || ''
    });
    setShowPostModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stages & Emplois</h1>
          <p className="text-gray-500 text-sm">Lancez votre carrière professionnelle dès maintenant.</p>
        </div>
        <button 
          onClick={handlePostInternship}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={18} />
          Publier un stage
        </button>
      </div>

      {/* Subscription Status Banner */}
      {user && !isSubscriptionActive && !isAdmin && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-amber-600" size={20} />
          <p className="text-sm text-amber-800">
            Vous devez avoir un abonnement actif (5 000 CFA / 30 jours) pour publier des offres de stage.
          </p>
        </div>
      )}

      {showApplySuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
            <CheckCircle2 size={20} />
            <span className="font-medium">Candidature envoyée avec succès pour : {selectedJob}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {internships.map((job) => (
          <div key={job.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
            {isAdmin && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleEditInternship(job)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteInternship(job.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm">
                {job.company.slice(0, 2).toUpperCase()}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors pr-20">{job.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${
                    job.type === 'internship' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {job.type === 'internship' ? 'Stage' : 'Job Étudiant'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1.5"><Building2 size={16} /> {job.company}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={16} /> {job.location}</span>
                  <span className="flex items-center gap-1.5"><Clock size={16} /> Publié le {job.postedAt}</span>
                  {job.deadline && (
                    <span className="flex items-center gap-1.5 text-amber-600 font-medium"><Clock size={16} /> Limite: {job.deadline}</span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => openApplyModal(job.title)}
                    className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Postuler
                  </button>
                  <button className="px-6 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    En savoir plus
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Postuler : {selectedJob}</h2>
              <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Votre dossier (CV + Lettre de motivation)</label>
                <input 
                  type="file" 
                  ref={applyFileInputRef}
                  onChange={(e) => setApplyFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                <div 
                  onClick={() => applyFileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                    applyFile ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-500 hover:bg-emerald-50"
                  )}
                >
                  <FileUp size={32} className={cn("mx-auto mb-2", applyFile ? "text-emerald-600" : "text-gray-400")} />
                  <p className="text-sm font-medium text-gray-600">
                    {applyFile ? applyFile.name : "Cliquez pour charger votre dossier"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Format PDF ou Word uniquement</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  En postulant, votre profil académique et votre dossier seront transmis directement au recruteur.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Envoyer ma candidature
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Post Internship Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Modifier l\'offre de stage' : 'Publier une offre de stage'}</h2>
              <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {!isSubscriptionActive && !isAdmin ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
                      <Briefcase size={20} />
                      Abonnement Entreprise Requis
                    </h3>
                    <p className="text-blue-700 text-sm mb-4">
                      Pour publier des offres de stage sur CampusBF, vous devez souscrire à un abonnement de 30 jours.
                    </p>
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-200">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Prix de l'abonnement</p>
                        <p className="text-2xl font-black text-gray-900">5 000 CFA <span className="text-sm font-normal text-gray-400">/ 30 jours</span></p>
                      </div>
                      <button 
                        onClick={() => setShowPayment(true)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                      >
                        S'abonner maintenant
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmitInternship}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Titre du poste</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.title}
                        onChange={(e) => setNewInternship({ ...newInternship, title: e.target.value })}
                        placeholder="Ex: Développeur Web Junior" 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Entreprise</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.company}
                        onChange={(e) => setNewInternship({ ...newInternship, company: e.target.value })}
                        placeholder="Nom de votre entreprise" 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Lieu</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.location}
                        onChange={(e) => setNewInternship({ ...newInternship, location: e.target.value })}
                        placeholder="Ex: Ouagadougou, Burkina Faso" 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Type de contrat</label>
                      <select 
                        value={newInternship.type}
                        onChange={(e) => setNewInternship({ ...newInternship, type: e.target.value as any })}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      >
                        <option value="internship">Stage</option>
                        <option value="job">Job Étudiant</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Email de réception des candidatures</label>
                      <input 
                        type="email" 
                        required 
                        value={newInternship.applicationEmail}
                        onChange={(e) => setNewInternship({ ...newInternship, applicationEmail: e.target.value })}
                        placeholder="Ex: rh@entreprise.com" 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                      />
                      <p className="text-[10px] text-gray-400 italic">Les dossiers des étudiants seront envoyés automatiquement à cette adresse.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Date limite de candidature (Optionnel)</label>
                      <input 
                        type="date" 
                        value={newInternship.deadline}
                        onChange={(e) => setNewInternship({ ...newInternship, deadline: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Description du poste</label>
                    <textarea 
                      required 
                      value={newInternship.description}
                      onChange={(e) => setNewInternship({ ...newInternship, description: e.target.value })}
                      placeholder="Décrivez les missions, les prérequis et les avantages..." 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-32" 
                    />
                  </div>

                  <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                    <Send size={18} />
                    {editingId ? 'Enregistrer les modifications' : 'Publier l\'offre'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <ManualPaymentModal 
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        type="premium"
        amount={5000}
        title="Abonnement Recruteur CampusBF"
        description="Accédez aux fonctionnalités de publication pendant 30 jours."
      />
    </div>
  );
}

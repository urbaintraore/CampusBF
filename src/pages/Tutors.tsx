import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, MessageCircle, Calendar, CheckCircle, X, GraduationCap, FileUp, CheckCircle2, AlertCircle, CreditCard, Phone, Mail, Loader2 } from 'lucide-react';
import { MOCK_TUTORS } from '@/data/mock';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Tutor } from '@/types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFile } from '@/services/storageService';

export default function Tutors() {
  const { user, isAdmin, tutors, submitTutorApplication } = useAuth();
  const navigate = useNavigate();
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hourlyRates, setHourlyRates] = useState({
    college: 0,
    lycee: 0,
    licence: 0,
    master: 0
  });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !selectedFile || !subjects) {
      setError('Veuillez remplir tous les champs et sélectionner un fichier.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const { url } = await uploadFile(selectedFile);
      
      await submitTutorApplication(
        description, 
        url,
        subjects.split(',').map(s => s.trim()).filter(Boolean),
        hourlyRates
      );
      
      setShowApplicationForm(false);
      setIsSubmitted(true);
      setDescription('');
    } catch (err: any) {
      console.error('Error submitting tutor application:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi de votre demande.');
    } finally {
      setIsUploading(false);
    }
  };

  const realTutors: Tutor[] = tutors
    .filter(u => {
      if (isAdmin) return u.tutorStatus && u.tutorStatus !== 'none';
      return u.tutorStatus === 'approved';
    })
    .map(u => ({
      id: u.id,
      userId: u.id,
      user: u,
      subjects: u.tutorSubjects || [],
      hourlyRate: u.tutorHourlyRates?.college || 2000, // Default or fallback
      hourlyRates: u.tutorHourlyRates,
      description: u.tutorDescription || '',
      rating: 5.0,
      reviewsCount: 0,
      university: u.university
    }));

  const allTutors = [...realTutors];

  const handleContact = (tutorUserId: string) => {
    navigate(`/messages?chat=${tutorUserId}`);
  };

  const renderTutorStatus = () => {
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'parent') return null;

    if (!user.tutorStatus || user.tutorStatus === 'none') {
      const isTeacher = user.role === 'teacher';
      return (
        <div className="glass border-emerald-200/50 p-6 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
              <GraduationCap size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-900">
                {isTeacher ? 'Proposez vos services de Répétiteur' : 'Devenez Répétiteur sur CampusBF'}
              </h2>
              <p className="text-emerald-800/80 text-sm mt-1">
                {isTeacher 
                  ? 'En tant qu\'enseignant, partagez votre expertise avec les étudiants.' 
                  : 'Partagez vos connaissances et gagnez de l\'argent.'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowApplicationForm(true)}
            className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap active:scale-95"
          >
            Faire une demande
          </button>
        </div>
      );
    }

    if (user.tutorStatus === 'pending' || isSubmitted) {
      return (
        <div className="glass border-amber-200/50 p-6 rounded-3xl mb-8 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-14 h-14 bg-amber-100/50 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0 shadow-inner">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900">Demande en cours de traitement</h2>
            <p className="text-amber-800/80 text-sm mt-1">Votre dossier est en cours d'examen par nos administrateurs. Vous recevrez une notification dès qu'une décision sera prise.</p>
          </div>
        </div>
      );
    }

    if (user.tutorStatus === 'rejected') {
      return (
        <div className="glass border-red-200/50 p-6 rounded-3xl mb-8 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-14 h-14 bg-red-100/50 rounded-2xl flex items-center justify-center text-red-600 flex-shrink-0 shadow-inner">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-900">Demande refusée</h2>
            <p className="text-red-800/80 text-sm mt-1">Malheureusement, votre demande n'a pas été retenue. Vous pouvez nous contacter pour plus d'informations.</p>
          </div>
        </div>
      );
    }

    if (user.tutorStatus === 'approved') {
      return (
        <div className="glass border-emerald-200/50 p-6 rounded-3xl mb-8 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-14 h-14 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-900">Profil Répétiteur Actif</h2>
            <p className="text-emerald-800/80 text-sm mt-1">Vous êtes désormais visible par les étudiants dans la liste des répétiteurs.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const createMockTutor = async () => {
    try {
      const mockId = 'mock-tutor-' + Date.now();
      const mockUser = {
        id: mockId,
        firstName: 'Test',
        lastName: 'Répétiteur',
        email: `test.tutor.${Date.now()}@example.com`,
        university: 'Université de Test',
        major: 'Mathématiques',
        level: 'Master 1',
        role: 'tutor',
        tutorStatus: 'approved',
        tutorSubjects: ['Mathématiques', 'Physique'],
        tutorHourlyRates: {
          college: 2000,
          lycee: 2500,
          licence: 3000,
          master: 4000
        },
        tutorDescription: 'Je suis un répétiteur de test créé automatiquement.',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockId}`
      };
      
      await setDoc(doc(db, 'users', mockId), mockUser);
      alert('Répétiteur de test créé avec succès !');
    } catch (error) {
      console.error('Error creating mock tutor:', error);
      alert('Erreur lors de la création du répétiteur de test.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Trouver un Répétiteur</h1>
          <p className="text-slate-500 mt-1">Des étudiants brillants prêts à vous aider.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={createMockTutor}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
          >
            Créer un répétiteur de test
          </button>
        )}
      </div>

      {renderTutorStatus()}

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowApplicationForm(false)} />
          <div className="glass relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-white/20 flex items-center justify-between bg-white/40 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Demande de statut Répétiteur</h2>
                <p className="text-slate-500 text-sm mt-1">Remplissez le formulaire ci-dessous pour postuler.</p>
              </div>
              <button 
                onClick={() => setShowApplicationForm(false)}
                className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto bg-white/20">
              <form onSubmit={handleApply} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">Matières (séparées par des virgules)</label>
                  <input 
                    type="text"
                    required
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                    placeholder="Ex: Mathématiques, Physique, Anglais"
                    className="w-full px-4 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-900">Taux horaire (FCFA)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block font-medium">Collège</label>
                      <input 
                        type="number"
                        min="0"
                        value={hourlyRates.college}
                        onChange={(e) => setHourlyRates({...hourlyRates, college: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block font-medium">Lycée</label>
                      <input 
                        type="number"
                        min="0"
                        value={hourlyRates.lycee}
                        onChange={(e) => setHourlyRates({...hourlyRates, lycee: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block font-medium">Licence</label>
                      <input 
                        type="number"
                        min="0"
                        value={hourlyRates.licence}
                        onChange={(e) => setHourlyRates({...hourlyRates, licence: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1.5 block font-medium">Master</label>
                      <input 
                        type="number"
                        min="0"
                        value={hourlyRates.master}
                        onChange={(e) => setHourlyRates({...hourlyRates, master: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">Description de vos compétences</label>
                  <textarea 
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Expliquez pourquoi vous êtes un bon répétiteur, vos matières de prédilection, etc."
                    className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all h-32 resize-none"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-900">Dossier unique (Diplôme, Relevés, CV)</label>
                  <div className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white/50",
                    selectedFile ? "border-emerald-500 bg-emerald-50/50 shadow-inner" : "border-slate-200 hover:border-emerald-400 hover:bg-white"
                  )}>
                    <input 
                      type="file" 
                      id="tutor-docs" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf"
                    />
                    <label htmlFor="tutor-docs" className="cursor-pointer flex flex-col items-center gap-3">
                      <div className={cn(
                        "w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors",
                        selectedFile ? "bg-emerald-100" : "bg-slate-100"
                      )}>
                        <FileUp size={28} className={selectedFile ? "text-emerald-600" : "text-slate-400"} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        {selectedFile ? selectedFile.name : "Cliquez pour déposer votre fichier (PDF)"}
                      </span>
                      <span className="text-xs text-slate-500">Un seul fichier contenant tous les documents (Max 5MB)</span>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100/50 p-5 rounded-2xl text-sm text-blue-800 flex gap-3">
                  <AlertCircle className="text-blue-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-bold mb-1">Information importante</p>
                    <p className="leading-relaxed">Votre demande sera examinée par nos administrateurs avant d'être approuvée.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/20">
                  <button 
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="flex-1 py-4 bg-white/50 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-white transition-all hover:shadow-md"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      'Envoyer ma demande'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tutors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {allTutors.map((tutor) => (
          <div key={tutor.id} className="glass p-6 rounded-3xl border border-white/40 shadow-sm hover:shadow-xl hover:border-emerald-200/50 transition-all duration-300 group flex flex-col h-full">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={tutor.user.avatarUrl} alt={tutor.user.firstName} className="w-16 h-16 rounded-2xl bg-slate-100 object-cover ring-4 ring-white shadow-sm group-hover:ring-emerald-50 transition-all" />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                    <CheckCircle size={12} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{tutor.user.firstName} {tutor.user.lastName}</h3>
                    <div 
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shadow-sm",
                        tutor.user.tutorStatus === 'approved' ? "bg-emerald-500" :
                        tutor.user.tutorStatus === 'pending' ? "bg-amber-500" :
                        "bg-red-500"
                      )} 
                      title={
                        tutor.user.tutorStatus === 'approved' ? 'Approuvé' :
                        tutor.user.tutorStatus === 'pending' ? 'En attente' : 'Refusé'
                      }
                    />
                    {(isAdmin || user?.id === tutor.user.id) && (
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        tutor.user.tutorStatus === 'approved' ? "bg-emerald-100 text-emerald-700" :
                        tutor.user.tutorStatus === 'pending' ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {tutor.user.tutorStatus === 'approved' ? 'Approuvé' :
                         tutor.user.tutorStatus === 'pending' ? 'En attente' : 'Refusé'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{tutor.user.major}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <button 
                  onClick={() => setRatingModal(tutor.id)}
                  className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors border border-amber-200/50"
                >
                  <Star size={14} fill="currentColor" />
                  {tutor.rating}
                </button>
                <span className="text-[11px] text-slate-400 mt-1.5 font-medium">{tutor.reviewsCount} avis</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 line-clamp-3 mb-5 leading-relaxed flex-grow">
              {tutor.description}
            </p>

            <div className="mb-6">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Matières enseignées</h4>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((sub) => (
                  <span key={sub} className="px-3 py-1.5 bg-white/60 border border-slate-200/60 text-slate-700 text-xs rounded-xl font-medium group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200/50 transition-colors shadow-sm">
                    {sub}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 mb-6 bg-white/40 p-4 rounded-2xl border border-white/50">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin size={16} className="text-slate-400" />
                <span className="font-medium">{tutor.university}</span>
              </div>
              {(tutor.user.city || tutor.user.neighborhood) && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400 opacity-0" /> {/* Spacer */}
                  <span>
                    {[tutor.user.city, tutor.user.neighborhood].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {tutor.user.email && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400" />
                  <span>{tutor.user.email}</span>
                </div>
              )}
              {tutor.user.phone && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{tutor.user.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-white/40 mt-auto">
              {tutor.hourlyRates ? (() => {
                const rates = Object.values(tutor.hourlyRates).filter(v => typeof v === 'number' && v > 0) as number[];
                const minRate = rates?.length ? Math.min(...rates) : 0;
                const maxRate = rates?.length ? Math.max(...rates) : 0;
                return (
                  <div className="flex flex-col">
                    <span className="font-black text-emerald-700 text-xl tracking-tight">
                      {minRate} - {maxRate}
                      <span className="text-xs font-semibold text-slate-500 ml-1">CFA/h</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Col:{tutor.hourlyRates.college || '-'} Lyc:{tutor.hourlyRates.lycee || '-'} Lic:{tutor.hourlyRates.licence || '-'} Mas:{tutor.hourlyRates.master || '-'}
                    </span>
                  </div>
                );
              })() : (
                <span className="font-black text-emerald-700 text-2xl tracking-tight">{tutor.hourlyRate} <span className="text-sm font-semibold text-slate-500">CFA/h</span></span>
              )}
              <div className="flex gap-2.5">
                <button 
                  onClick={() => handleContact(tutor.user.id)}
                  className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors bg-white/50 border border-slate-200/50 shadow-sm"
                  title="Envoyer un message"
                >
                  <MessageCircle size={20} />
                </button>
                <button 
                  onClick={() => handleContact(tutor.user.id)}
                  className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                >
                  Réserver
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRatingModal(null)} />
          <div className="glass relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 space-y-6 bg-white/40">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Noter ce répétiteur</h3>
                <button onClick={() => setRatingModal(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100/50 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex justify-center gap-3 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} className="text-slate-300 hover:text-amber-400 transition-colors hover:scale-110 active:scale-95">
                    <Star size={36} fill="currentColor" />
                  </button>
                ))}
              </div>
              
              <textarea 
                placeholder="Laissez un commentaire (optionnel)..." 
                className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none h-32 transition-all"
              />
              
              <button 
                onClick={() => setRatingModal(null)}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                Envoyer la note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, MessageCircle, Calendar, CheckCircle, X, GraduationCap, FileUp, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { MOCK_TUTORS } from '@/data/mock';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MobileMoneyPayment from '@/components/shared/MobileMoneyPayment';

export default function Tutors() {
  const { user, submitTutorApplication, paySubscription } = useAuth();
  const navigate = useNavigate();
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [description, setDescription] = useState('');
  const [fileSelected, setFileSelected] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (description && fileSelected) {
      submitTutorApplication(description, 'mock-file-url');
      setShowApplicationForm(false);
      setDescription('');
      setFileSelected(false);
    }
  };

  const handlePaymentSuccess = () => {
    paySubscription();
    setShowPayment(false);
  };

  const handleContact = (tutorUserId: string) => {
    navigate(`/messages?chat=${tutorUserId}`);
  };

  const renderTutorStatus = () => {
    if (!user) return null;
    if (user.role === 'admin') return null;

    if (!user.tutorStatus || user.tutorStatus === 'none') {
      return (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Devenez Répétiteur sur CampusBF</h2>
              <p className="text-emerald-700 text-sm">Partagez vos connaissances et gagnez de l'argent en aidant d'autres étudiants.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowApplicationForm(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 whitespace-nowrap"
          >
            Faire une demande
          </button>
        </div>
      );
    }

    if (user.tutorStatus === 'pending') {
      return (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-900">Demande en cours de traitement</h2>
            <p className="text-amber-700 text-sm">Votre dossier est en cours d'examen par nos administrateurs. Vous recevrez une notification dès qu'une décision sera prise.</p>
          </div>
        </div>
      );
    }

    if (user.tutorStatus === 'rejected') {
      return (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-900">Demande refusée</h2>
            <p className="text-red-700 text-sm">Malheureusement, votre demande n'a pas été retenue. Vous pouvez nous contacter pour plus d'informations.</p>
          </div>
        </div>
      );
    }

    if (user.tutorStatus === 'approved' && user.subscriptionStatus !== 'active') {
      return (
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-900">Demande approuvée !</h2>
              <p className="text-blue-700 text-sm">Pour commencer à être contacté par des étudiants, veuillez activer votre abonnement trimestriel (2000 FCFA).</p>
            </div>
          </div>
          <button 
            onClick={() => setShowPayment(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 whitespace-nowrap"
          >
            <CreditCard size={18} />
            Payer 2000 FCFA via Mobile Money
          </button>
        </div>
      );
    }

    if (user.subscriptionStatus === 'active') {
      return (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Abonnement Actif</h2>
            <p className="text-emerald-700 text-sm">Vous êtes désormais visible par les étudiants. Votre abonnement expire le {new Date(user.subscriptionExpiry!).toLocaleDateString()}.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trouver un Répétiteur</h1>
          <p className="text-slate-500 text-sm">Des étudiants brillants prêts à vous aider.</p>
        </div>
      </div>

      {renderTutorStatus()}

      {showApplicationForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Demande de statut Répétiteur</h2>
            <form onSubmit={handleApply} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Description de vos compétences</label>
                <textarea 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expliquez pourquoi vous êtes un bon répétiteur, vos matières de prédilection, etc."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-32"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Dossier unique (Diplôme, Relevés, CV)</label>
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                  fileSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-500 hover:bg-emerald-50"
                )}>
                  <input 
                    type="file" 
                    id="tutor-docs" 
                    className="hidden" 
                    onChange={() => setFileSelected(true)}
                  />
                  <label htmlFor="tutor-docs" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileUp size={32} className={fileSelected ? "text-emerald-600" : "text-gray-400"} />
                    <span className="text-sm font-medium text-gray-600">
                      {fileSelected ? "Fichier sélectionné" : "Cliquez pour déposer votre fichier (PDF)"}
                    </span>
                    <span className="text-xs text-gray-400">Un seul fichier contenant tous les documents</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowApplicationForm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Envoyer ma demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MobileMoneyPayment 
            amount={2000} 
            onSuccess={handlePaymentSuccess} 
            onCancel={() => setShowPayment(false)}
            title="Abonnement Répétiteur CampusBF"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_TUTORS.map((tutor) => (
          <div key={tutor.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:border-emerald-200 transition-all group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={tutor.user.avatarUrl} alt={tutor.user.firstName} className="w-14 h-14 rounded-full bg-slate-100 object-cover ring-4 ring-slate-50 group-hover:ring-emerald-50 transition-all" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white">
                      <CheckCircle size={10} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{tutor.user.firstName} {tutor.user.lastName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{tutor.user.major}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <button 
                    onClick={() => setRatingModal(tutor.id)}
                    className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    <Star size={12} fill="currentColor" />
                    {tutor.rating}
                  </button>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">{tutor.reviewsCount} avis</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                {tutor.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {tutor.subjects.map((sub) => (
                  <span key={sub} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                    {sub}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                <MapPin size={14} />
                {tutor.university}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="font-bold text-emerald-700 text-xl">{tutor.hourlyRate} <span className="text-xs font-normal text-slate-500">CFA/h</span></span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleContact(tutor.user.id)}
                    className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">
                    Réserver
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Noter ce répétiteur</h3>
              <button onClick={() => setRatingModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} className="text-slate-200 hover:text-amber-400 transition-colors hover:scale-110">
                  <Star size={32} fill="currentColor" />
                </button>
              ))}
            </div>
            <textarea 
              placeholder="Laissez un commentaire (optionnel)..." 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none h-24"
            />
            <button 
              onClick={() => setRatingModal(null)}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Envoyer la note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, MapPin, BookOpen, LogOut, Edit, Save, X, GraduationCap, Calendar, CreditCard, Clock, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileMoneyPayment from '@/components/shared/MobileMoneyPayment';

export default function Profile() {
  const { user, logout, updateUser, paySubscription, submitTutorApplication } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showTutorForm, setShowTutorForm] = useState(false);
  const [tutorDescription, setTutorDescription] = useState('');
  const [fileSelected, setFileSelected] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    university: user?.university || '',
    major: user?.major || '',
    level: user?.level || '',
  });

  if (!user) return null;

  const handleSave = () => {
    updateUser(formData);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSuccess = () => {
    paySubscription();
    setShowPayment(false);
    alert('Votre abonnement a été renouvelé avec succès pour 3 mois !');
  };

  const handleTutorApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (tutorDescription && fileSelected) {
      submitTutorApplication(tutorDescription, 'mock-file-url');
      setShowTutorForm(false);
      setTutorDescription('');
      setFileSelected(false);
      alert('Votre demande a été envoyée avec succès !');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-colors"
          >
            <Edit size={16} />
            Modifier le profil
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <X size={16} />
              Annuler
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <img 
              src={user.avatarUrl} 
              alt={user.firstName} 
              className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-md"
            />
          </div>
          
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Prénom</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Nom</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
              <p className="text-gray-500 font-medium">{user.major} • {user.level}</p>
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                <MapPin size={14} />
                {user.university}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 mb-4">Coordonnées</h3>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              <Mail size={16} />
            </div>
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              <Phone size={16} />
            </div>
            {isEditing ? (
              <input 
                type="text" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+226 00 00 00 00"
                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            ) : (
              <span className="text-sm">{user.phone || '+226 00 00 00 00'}</span>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 mb-4">Cursus Académique</h3>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              <BookOpen size={16} />
            </div>
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <input 
                  type="text" 
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  placeholder="Université"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                <input 
                  type="text" 
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  placeholder="Filière"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                <select 
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                  <option value="Licence 1">Licence 1</option>
                  <option value="Licence 2">Licence 2</option>
                  <option value="Licence 3">Licence 3</option>
                  <option value="Master 1">Master 1</option>
                  <option value="Master 2">Master 2</option>
                  <option value="Doctorat">Doctorat</option>
                </select>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900">{user.major}</p>
                <p className="text-xs text-gray-500">{user.university}</p>
                <p className="text-xs text-gray-400 mt-1">{user.level}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tutor Status Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-emerald-600" size={20} />
            Mon statut de Répétiteur
          </h3>
          <span className={cn(
            "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
            user.tutorStatus === 'approved' ? "bg-emerald-50 text-emerald-700" :
            user.tutorStatus === 'pending' ? "bg-amber-50 text-amber-700" :
            user.tutorStatus === 'rejected' ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
          )}>
            {user.tutorStatus === 'approved' ? 'Validé' : 
             user.tutorStatus === 'pending' ? 'En attente' :
             user.tutorStatus === 'rejected' ? 'Refusé' : 'Non inscrit'}
          </span>
        </div>

        {user.tutorStatus === 'approved' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Abonnement</p>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-emerald-600" />
                  <span className={cn(
                    "text-sm font-bold",
                    user.subscriptionStatus === 'active' ? "text-emerald-700" : "text-red-600"
                  )}>
                    {user.subscriptionStatus === 'active' ? 'Actif (Trimestriel)' : 'Expiré'}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Date d'expiration</p>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  <span className="text-sm font-bold text-slate-700">
                    {user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowPayment(true)}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard size={18} />
                Renouveler l'abonnement (2 000 CFA / Trimestre)
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center italic">
              Le renouvellement prolonge votre visibilité dans la liste des répétiteurs pour une durée de 3 mois.
            </p>
          </div>
        )}

        {user.tutorStatus === 'none' && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-4">Vous n'êtes pas encore inscrit comme répétiteur.</p>
            <button 
              onClick={() => setShowTutorForm(true)}
              className="px-6 py-2 border-2 border-emerald-600 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors"
            >
              Devenir Répétiteur
            </button>
          </div>
        )}
      </div>

      {/* Tutor Application Modal */}
      {showTutorForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Demande de statut Répétiteur</h2>
            <form onSubmit={handleTutorApply} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Description de vos compétences</label>
                <textarea 
                  required
                  value={tutorDescription}
                  onChange={(e) => setTutorDescription(e.target.value)}
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
                    id="profile-tutor-docs" 
                    className="hidden" 
                    onChange={() => setFileSelected(true)}
                  />
                  <label htmlFor="profile-tutor-docs" className="cursor-pointer flex flex-col items-center gap-2">
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
                  onClick={() => setShowTutorForm(false)}
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

      {/* Settings / Actions */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <button 
          onClick={logout}
          className="w-full p-4 flex items-center gap-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
        >
          <LogOut size={20} />
          <span className="font-medium">Se déconnecter</span>
        </button>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MobileMoneyPayment 
            amount={2000} 
            onSuccess={handlePaymentSuccess} 
            onCancel={() => setShowPayment(false)}
            title="Renouvellement Abonnement Répétiteur"
          />
        </div>
      )}
    </div>
  );
}

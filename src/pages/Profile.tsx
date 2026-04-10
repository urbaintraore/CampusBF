import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, MapPin, BookOpen, LogOut, Edit, Save, X, GraduationCap, Calendar, CreditCard, Clock, FileUp, Shield, Star, Camera, Bike, Building2, Map, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { uploadFile } from '@/services/storageService';

export default function Profile() {
  const { user, logout, updateUser, submitTutorApplication, submitTeacherApplication, logAction } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPremiumPayment, setShowPremiumPayment] = useState(false);
  const [showEventPayment, setShowEventPayment] = useState(false);
  const [showTutorForm, setShowTutorForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [tutorDescription, setTutorDescription] = useState('');
  const [tutorSubjects, setTutorSubjects] = useState('');
  const [tutorRates, setTutorRates] = useState({
    college: '',
    lycee: '',
    licence: '',
    master: ''
  });
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [teacherFiles, setTeacherFiles] = useState<{ cv?: File, diploma?: File, rankProof?: File }>({});
  const [teacherFormData, setTeacherFormData] = useState({
    biography: '',
    specialties: '',
    domains: '',
    courses: '',
    experienceYears: '0',
    academicRank: 'Assistant' as any
  });
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    ine: user?.ine || '',
    university: user?.university || '',
    major: user?.major || '',
    level: user?.level || '',
    city: user?.city || '',
    neighborhood: user?.neighborhood || '',
    avatarUrl: user?.avatarUrl || '',
    promotion: user?.promotion || '',
  });

  // Supabase config check
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!user) return null;

  const handleSave = async () => {
    await updateUser(formData);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        setIsUploading(true);
        const { url: downloadUrl } = await uploadFile(file, 'avatars');
        setFormData(prev => ({ ...prev, avatarUrl: downloadUrl }));
        // Update user immediately for avatar
        await updateUser({ avatarUrl: downloadUrl });
      } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Erreur lors du téléchargement de l'image.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleTutorApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tutorDescription && fileSelected && user) {
      try {
        setIsUploading(true);
        const { url: downloadUrl } = await uploadFile(fileSelected, 'tutors');
        await submitTutorApplication(
          tutorDescription, 
          downloadUrl,
          tutorSubjects.split(',').map(s => s.trim()),
          {
            college: tutorRates.college ? parseInt(tutorRates.college) : undefined,
            lycee: tutorRates.lycee ? parseInt(tutorRates.lycee) : undefined,
            licence: tutorRates.licence ? parseInt(tutorRates.licence) : undefined,
            master: tutorRates.master ? parseInt(tutorRates.master) : undefined,
          }
        );
        setShowTutorForm(false);
        setTutorDescription('');
        setTutorSubjects('');
        setTutorRates({ college: '', lycee: '', licence: '', master: '' });
        setFileSelected(null);
        alert('Votre demande a été envoyée avec succès !');
      } catch (error) {
        console.error("Error submitting application:", error);
        alert("Erreur lors de l'envoi de la demande.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleTeacherApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && teacherFiles.cv && teacherFiles.diploma && teacherFiles.rankProof) {
      try {
        setIsUploading(true);
        const { url: cvUrl } = await uploadFile(teacherFiles.cv, 'teachers');
        const { url: diplomaUrl } = await uploadFile(teacherFiles.diploma, 'teachers');
        const { url: rankProofUrl } = await uploadFile(teacherFiles.rankProof, 'teachers');
        
        await submitTeacherApplication({
          cvUrl,
          diplomaUrl,
          rankProofUrl,
          biography: teacherFormData.biography,
          specialties: teacherFormData.specialties.split(',').map(s => s.trim()),
          domains: teacherFormData.domains.split(',').map(d => d.trim()),
          courses: teacherFormData.courses.split(',').map(c => c.trim()),
          experienceYears: parseInt(teacherFormData.experienceYears) || 0,
          academicRank: teacherFormData.academicRank
        });
        
        setShowTeacherForm(false);
        alert('Votre dossier enseignant a été envoyé avec succès !');
      } catch (error) {
        console.error("Error submitting teacher application:", error);
        alert("Erreur lors de l'envoi du dossier.");
      } finally {
        setIsUploading(false);
      }
    } else {
      alert("Veuillez remplir tous les champs et joindre tous les documents requis.");
    }
  };

  const handleUpdateTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && user.teacherProfile) {
      try {
        setIsUploading(true);
        const updatedProfile = {
          ...user.teacherProfile,
          biography: teacherFormData.biography,
          specialties: teacherFormData.specialties.split(',').map(s => s.trim()),
          domains: teacherFormData.domains.split(',').map(d => d.trim()),
          courses: teacherFormData.courses.split(',').map(c => c.trim()),
          yearsOfExperience: parseInt(teacherFormData.experienceYears) || 0,
          academicRank: teacherFormData.academicRank
        };
        await updateUser({ teacherProfile: updatedProfile });
        await logAction('Mise à jour profil enseignant', 'Modification des informations professionnelles');
        setIsEditingTeacher(false);
        alert('Profil enseignant mis à jour !');
      } catch (error) {
        console.error("Error updating teacher profile:", error);
        alert("Erreur lors de la mise à jour.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const startEditingTeacher = () => {
    if (user?.teacherProfile) {
      setTeacherFormData({
        biography: user.teacherProfile.biography,
        specialties: user.teacherProfile.specialties.join(', '),
        domains: user.teacherProfile.domains.join(', '),
        courses: user.teacherProfile.courses.join(', '),
        experienceYears: user.teacherProfile.yearsOfExperience.toString(),
        academicRank: user.teacherProfile.academicRank
      });
      setIsEditingTeacher(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mon Profil</h1>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Edit size={16} />
            Modifier le profil
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-white/50 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white flex items-center gap-2 transition-all shadow-sm"
            >
              <X size={16} />
              Annuler
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="glass rounded-3xl border border-white/40 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="h-40 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-16 mb-6">
            <div className="relative group">
              {!isSupabaseConfigured && isEditing && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded-xl text-[10px] leading-tight z-10 shadow-lg">
                  Stockage non configuré. Veuillez contacter l'administrateur.
                </div>
              )}
              <img 
                src={isEditing ? formData.avatarUrl : user.avatarUrl} 
                alt={user.firstName} 
                className={cn(
                  "w-32 h-32 rounded-3xl border-4 border-white bg-white shadow-xl object-cover transition-all",
                  isUploading && "opacity-50 blur-sm"
                )}
              />
              {isEditing && (
                <label className={cn(
                  "absolute inset-0 bg-slate-900/40 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all duration-300 border-4 border-transparent",
                  isSupabaseConfigured ? "cursor-pointer opacity-0 group-hover:opacity-100" : "cursor-not-allowed opacity-40"
                )}>
                  {isUploading ? (
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <div className="flex flex-col items-center text-white">
                      <Camera size={28} className="mb-1" />
                      <span className="text-xs font-bold">Modifier</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                    disabled={isUploading || !isSupabaseConfigured}
                  />
                </label>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prénom</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nom</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{user.firstName} {user.lastName}</h2>
              <p className="text-slate-500 font-medium mt-1 text-lg">{user.major} • {user.level}</p>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-2 font-medium">
                <MapPin size={16} />
                {user.university}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-3xl border border-white/40 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Phone size={16} />
            </div>
            Coordonnées
          </h3>
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-slate-600">
              <div className="w-10 h-10 rounded-2xl bg-white/60 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                <Mail size={18} />
              </div>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="w-10 h-10 rounded-2xl bg-white/60 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                <Phone size={18} />
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+226 00 00 00 00"
                  className="flex-1 p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              ) : (
                <span className="text-sm font-medium">{user.phone || '+226 00 00 00 00'}</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="w-10 h-10 rounded-2xl bg-white/60 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                <Building2 size={18} />
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ville (ex: Ouagadougou)"
                  className="flex-1 p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              ) : (
                <span className="text-sm font-medium">{user.city || 'Ville non renseignée'}</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="w-10 h-10 rounded-2xl bg-white/60 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                <Map size={18} />
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  placeholder="Quartier (ex: Dassasgho)"
                  className="flex-1 p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              ) : (
                <span className="text-sm font-medium">{user.neighborhood || 'Quartier non renseigné'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/40 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '150ms' }}>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <BookOpen size={16} />
            </div>
            Cursus Académique
          </h3>
          <div className="flex items-start gap-4 text-slate-600">
            <div className="w-10 h-10 rounded-2xl bg-white/60 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm mt-1">
              <GraduationCap size={18} />
            </div>
            {isEditing ? (
              <div className="flex-1 space-y-3">
                <input 
                  type="text" 
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  placeholder="Université"
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <input 
                  type="text" 
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  placeholder="Filière"
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <input 
                  type="text" 
                  name="ine"
                  value={formData.ine}
                  onChange={handleChange}
                  placeholder="INE / Matricule"
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <select 
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="Licence 1">Licence 1</option>
                  <option value="Licence 2">Licence 2</option>
                  <option value="Licence 3">Licence 3</option>
                  <option value="Master 1">Master 1</option>
                  <option value="Master 2">Master 2</option>
                  <option value="Doctorat">Doctorat</option>
                </select>
                <input 
                  type="text" 
                  name="promotion"
                  value={formData.promotion}
                  onChange={handleChange}
                  placeholder="Promotion (ex: 2024)"
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            ) : (
              <div className="bg-white/40 p-4 rounded-2xl border border-white/50 w-full">
                <p className="text-base font-bold text-slate-900">{user.major}</p>
                <p className="text-sm text-slate-500 font-medium mt-1">{user.university}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                    {user.level}
                  </div>
                  {user.promotion && (
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                      Promotion {user.promotion}
                    </div>
                  )}
                  {user.ine && (
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                      INE: {user.ine}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="text-indigo-600" size={20} />
          Mes Abonnements
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Premium Subscription */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Star size={16} className="text-purple-600" />
                  Accès Premium
                </p>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                  user.premiumSubscriptionStatus === 'active' ? "bg-emerald-50 text-emerald-700" :
                  user.premiumSubscriptionStatus === 'pending' ? "bg-amber-50 text-amber-700" :
                  "bg-gray-100 text-gray-500"
                )}>
                  {user.premiumSubscriptionStatus === 'active' ? 'Actif' : 
                   user.premiumSubscriptionStatus === 'pending' ? 'En attente' : 'Inactif'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">Stages, Communauté</p>
              {user.premiumSubscriptionStatus === 'active' && user.premiumSubscriptionExpiry && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <Calendar size={12} />
                  Expire le {new Date(user.premiumSubscriptionExpiry).toLocaleDateString()}
                </p>
              )}
              {user.premiumSubscriptionStatus === 'pending' && (
                <p className="text-xs text-amber-600 mt-2">
                  Vérification du paiement en cours...
                </p>
              )}
            </div>
            {user.premiumSubscriptionStatus !== 'active' && user.premiumSubscriptionStatus !== 'pending' && (
              <button 
                onClick={() => setShowPremiumPayment(true)}
                className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors"
              >
                S'abonner (5 000 CFA / mois)
              </button>
            )}
          </div>

          {/* Event Subscription */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  Événements
                </p>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                  user.eventSubscriptionStatus === 'active' ? "bg-emerald-50 text-emerald-700" :
                  user.eventSubscriptionStatus === 'pending' ? "bg-amber-50 text-amber-700" :
                  "bg-gray-100 text-gray-500"
                )}>
                  {user.eventSubscriptionStatus === 'active' ? 'Actif' : 
                   user.eventSubscriptionStatus === 'pending' ? 'En attente' : 'Inactif'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">Publier des conférences et activités</p>
              {user.eventSubscriptionStatus === 'active' && user.eventSubscriptionExpiry && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <Calendar size={12} />
                  Expire le {new Date(user.eventSubscriptionExpiry).toLocaleDateString()}
                </p>
              )}
              {user.eventSubscriptionStatus === 'pending' && (
                <p className="text-xs text-amber-600 mt-2">
                  Vérification du paiement en cours...
                </p>
              )}
            </div>
            {user.eventSubscriptionStatus !== 'active' && user.eventSubscriptionStatus !== 'pending' && (
              <button 
                onClick={() => setShowEventPayment(true)}
                className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                S'abonner (2 000 CFA / mois)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tutor Status Section */}
      {user.role !== 'parent' && (
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
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">
                Vous êtes visible dans la liste des répétiteurs.
              </p>
            </div>
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
      )}

      {/* Teacher Status Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-blue-600" size={20} />
            Mon statut d'Enseignant
          </h3>
          <span className={cn(
            "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
            user.teacherStatus === 'approved' ? "bg-blue-50 text-blue-700" :
            user.teacherStatus === 'pending_approval' ? "bg-amber-50 text-amber-700" :
            user.teacherStatus === 'rejected' ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
          )}>
            {user.teacherStatus === 'approved' ? 'Validé' : 
             user.teacherStatus === 'pending_approval' ? 'En attente' :
             user.teacherStatus === 'rejected' ? 'Refusé' : 'Non inscrit'}
          </span>
        </div>

        {user.teacherStatus === 'approved' && user.teacherProfile && (
          <div className="space-y-4">
            {isEditingTeacher ? (
              <form onSubmit={handleUpdateTeacherProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Biographie</label>
                  <textarea 
                    value={teacherFormData.biography}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, biography: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Spécialités</label>
                    <input 
                      type="text"
                      value={teacherFormData.specialties}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, specialties: e.target.value })}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Cours</label>
                    <input 
                      type="text"
                      value={teacherFormData.courses}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, courses: e.target.value })}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsEditingTeacher(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 mb-2">Grade Académique : {user.teacherProfile.academicRank}</p>
                  <p className="text-sm text-blue-700 line-clamp-3">{user.teacherProfile.biography}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Spécialités</p>
                    <p className="text-xs font-medium text-gray-700">{user.teacherProfile.specialties.join(', ')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Cours</p>
                    <p className="text-xs font-medium text-gray-700">{user.teacherProfile.courses.join(', ')}</p>
                  </div>
                </div>
                <button 
                  onClick={startEditingTeacher}
                  className="w-full py-2 border border-blue-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors"
                >
                  Modifier mon profil enseignant
                </button>
              </>
            )}
          </div>
        )}

        {(!user.teacherStatus || user.teacherStatus === 'none') && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-4">Vous n'êtes pas encore inscrit dans l'annuaire des enseignants.</p>
            <button 
              onClick={() => setShowTeacherForm(true)}
              className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              Soumettre mon dossier Enseignant
            </button>
          </div>
        )}
      </div>

      {/* MotoRide Status Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Bike className="text-orange-600" size={20} />
            Mon statut MotoRide
          </h3>
          <div className="flex gap-2">
            {user.isVerified && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                <CheckCircle size={10} /> Utilisateur Vérifié
              </span>
            )}
            {user.isDriverVerified && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                <Shield size={10} /> Conducteur Vérifié
              </span>
            )}
            {user.motoRideStatus === 'suspended' && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-red-50 text-red-700 flex items-center gap-1">
                <AlertTriangle size={10} /> Suspendu
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-gray-900">{user.motoRideStats?.ridesCompleted || 0}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Trajets</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl font-bold text-gray-900">{user.motoRideStats?.averageRating?.toFixed(1) || '0.0'}</p>
              <Star size={16} className="text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Note moyenne</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-gray-900">{user.motoRideStats?.totalReports || 0}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Signalements</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-sm font-bold text-gray-900 capitalize">{user.motoRideStatus || 'Actif'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Statut</p>
          </div>
        </div>

        {!user.isVerified && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Compte non vérifié</p>
              <p className="text-xs text-amber-700 mt-1">
                Pour utiliser MotoRide, vous devez d'abord vérifier votre profil (Nom réel, Université, Téléphone, Photo).
              </p>
            </div>
          </div>
        )}

        {user.isVerified && !user.isDriverVerified && !user.vehicleDetails && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-4">Vous souhaitez proposer des trajets ?</p>
            <button 
              onClick={() => window.location.href = '/motoride'}
              className="px-6 py-2 border-2 border-orange-600 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 transition-colors"
            >
              Devenir Conducteur
            </button>
          </div>
        )}

        {user.isVerified && !user.isDriverVerified && user.vehicleDetails && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
            <Clock size={20} className="text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Votre demande de vérification conducteur est en cours de traitement par l'administration.
            </p>
          </div>
        )}
      </div>

      {/* Teacher Application Modal */}
      {showTeacherForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Dossier Enseignant</h2>
              <button onClick={() => setShowTeacherForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTeacherApply} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Grade Académique</label>
                  <select 
                    value={teacherFormData.academicRank}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, academicRank: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Assistant">Assistant</option>
                    <option value="Maître Assistant">Maître Assistant</option>
                    <option value="Maître de Conférences">Maître de Conférences</option>
                    <option value="Professeur Titulaire">Professeur Titulaire</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Années d'expérience</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={teacherFormData.experienceYears}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, experienceYears: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Spécialités (séparées par des virgules)</label>
                  <input 
                    type="text" 
                    required
                    value={teacherFormData.specialties}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, specialties: e.target.value })}
                    placeholder="Ex: IA, Réseaux, Sécurité"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Biographie / Parcours</label>
                <textarea 
                  required
                  value={teacherFormData.biography}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, biography: e.target.value })}
                  placeholder="Décrivez votre parcours académique et professionnel..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Domaines d'expertise</label>
                  <input 
                    type="text" 
                    required
                    value={teacherFormData.domains}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, domains: e.target.value })}
                    placeholder="Ex: Informatique, Mathématiques"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Cours enseignés</label>
                  <input 
                    type="text" 
                    required
                    value={teacherFormData.courses}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, courses: e.target.value })}
                    placeholder="Ex: Algorithmique, Base de données"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Documents justificatifs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">CV (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => setTeacherFiles({ ...teacherFiles, cv: e.target.files?.[0] })} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Diplôme (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => setTeacherFiles({ ...teacherFiles, diploma: e.target.files?.[0] })} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Preuve de grade (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => setTeacherFiles({ ...teacherFiles, rankProof: e.target.files?.[0] })} className="text-xs" />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                {isUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Soumettre mon dossier
              </button>
            </form>
          </div>
        </div>
      )}
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
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Matières (séparées par des virgules)</label>
                <input 
                  type="text" 
                  required
                  value={tutorSubjects}
                  onChange={(e) => setTutorSubjects(e.target.value)}
                  placeholder="Ex: Mathématiques, Physique, Anglais"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Tarif Collège (CFA/h)</label>
                  <input 
                    type="number" 
                    value={tutorRates.college}
                    onChange={(e) => setTutorRates({ ...tutorRates, college: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Tarif Lycée (CFA/h)</label>
                  <input 
                    type="number" 
                    value={tutorRates.lycee}
                    onChange={(e) => setTutorRates({ ...tutorRates, lycee: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Tarif Licence (CFA/h)</label>
                  <input 
                    type="number" 
                    value={tutorRates.licence}
                    onChange={(e) => setTutorRates({ ...tutorRates, licence: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Tarif Master (CFA/h)</label>
                  <input 
                    type="number" 
                    value={tutorRates.master}
                    onChange={(e) => setTutorRates({ ...tutorRates, master: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                  />
                </div>
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
                    onChange={(e) => setFileSelected(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="profile-tutor-docs" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileUp size={32} className={fileSelected ? "text-emerald-600" : "text-gray-400"} />
                    <span className="text-sm font-medium text-gray-600">
                      {fileSelected ? fileSelected.name : "Cliquez pour déposer votre fichier (PDF)"}
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

      {/* Statistics Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={20} />
          Mes Statistiques
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-900">0</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Publications</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-900">0</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Événements</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-900">0</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Annonces</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-900">0</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Points</p>
          </div>
        </div>
      </div>

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

      {/* Payment Modals */}
      <ManualPaymentModal 
        isOpen={showPremiumPayment}
        onClose={() => setShowPremiumPayment(false)}
        type="premium"
        amount={5000}
        title="Abonnement Premium"
        description="Accédez aux fonctionnalités de publication (Stages, Communauté) pendant 30 jours."
      />

      <ManualPaymentModal 
        isOpen={showEventPayment}
        onClose={() => setShowEventPayment(false)}
        type="event"
        amount={2000}
        title="Abonnement Événements"
        description="Publiez vos conférences, soutenances et activités culturelles pendant 30 jours."
      />
    </div>
  );
}

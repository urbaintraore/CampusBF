import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff, Loader2, GraduationCap, Building2, Library } from 'lucide-react';

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'student' | 'institution' | 'teacher'>('student');
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleGoogleSignup = async () => {
    setError('');
    // Start login immediately to preserve the browser's "user gesture" for popups
    const loginPromise = loginWithGoogle();
    setIsLoading(true);
    
    try {
      await loginPromise;
      if (auth.currentUser) {
        navigate('/');
      }
    } catch (err: any) {
      if (err.message?.includes('popup-closed-by-user')) {
        setError('La fenêtre a été fermée. Veuillez réessayer.');
      } else if (err.message?.includes('popup-blocked')) {
        setError('Le popup a été bloqué par votre navigateur. Veuillez réessayer ou autoriser les popups.');
      } else if (err.message?.includes('unauthorized-domain')) {
        setError("Ce domaine n'est pas autorisé. Ajoutez-le dans la console Firebase (Authentication > Settings > Authorized domains).");
      } else {
        setError(err.message || 'Erreur de connexion avec Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    university: '',
    major: '',
    level: '',
    // Institution specific
    institutionName: '',
    institutionType: 'Université Publique',
    // Teacher specific
    academicRank: 'Assistant'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const signupData: any = {
        email: formData.email,
        password: formData.password,
        role: accountType,
      };

      if (accountType === 'student') {
        signupData.firstName = formData.firstName;
        signupData.lastName = formData.lastName;
        signupData.university = formData.university;
        signupData.major = formData.major;
        signupData.level = formData.level;
      } else if (accountType === 'teacher') {
        signupData.firstName = formData.firstName;
        signupData.lastName = formData.lastName;
        signupData.university = formData.university;
        signupData.teacherStatus = 'pending_dossier';
      } else {
        // Institution
        signupData.firstName = 'Direction';
        signupData.lastName = formData.institutionName;
        signupData.university = formData.institutionName;
        signupData.institutionProfile = {
          type: formData.institutionType,
          subscriptionStatus: 'none',
          favorites: []
        };
      }

      await signup(signupData);
      if (formData.email.toLowerCase() === 'urbain.traoreurb@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden py-12">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl p-8 sm:p-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white font-display font-bold text-3xl mx-auto mb-6 shadow-lg shadow-emerald-500/30 ring-4 ring-white">
              {accountType === 'student' ? <GraduationCap size={32} /> : accountType === 'teacher' ? <Library size={32} /> : <Building2 size={32} />}
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Créer un compte</h1>
            <p className="text-slate-500 text-sm">Rejoignez la communauté CampusBF dès aujourd'hui.</p>
          </div>

          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-6 flex-wrap md:flex-nowrap border border-slate-200/60">
            <button
              type="button"
              onClick={() => setAccountType('student')}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-xl transition-all ${accountType === 'student' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Étudiant
            </button>
            <button
              type="button"
              onClick={() => setAccountType('teacher')}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-xl transition-all ${accountType === 'teacher' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Enseignant
            </button>
            <button
              type="button"
              onClick={() => setAccountType('institution')}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-xl transition-all ${accountType === 'institution' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              Établissement
            </button>
          </div>

          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {accountType === 'student' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Prénom</label>
                    <input 
                      type="text" 
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Votre prénom"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Nom</label>
                    <input 
                      type="text" 
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Votre nom"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Université / École</label>
                    <input 
                      type="text" 
                      name="university"
                      required
                      value={formData.university}
                      onChange={handleChange}
                      placeholder="Ex: Université Joseph Ki-Zerbo"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Filière</label>
                    <input 
                      type="text" 
                      name="major"
                      required
                      value={formData.major}
                      onChange={handleChange}
                      placeholder="Ex: Informatique"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Niveau d'études</label>
                  <select 
                    name="level"
                    required
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-700"
                  >
                    <option value="">Sélectionner un niveau</option>
                    <option value="Licence 1">Licence 1</option>
                    <option value="Licence 2">Licence 2</option>
                    <option value="Licence 3">Licence 3</option>
                    <option value="Master 1">Master 1</option>
                    <option value="Master 2">Master 2</option>
                    <option value="Doctorat">Doctorat</option>
                  </select>
                </div>
              </>
            ) : accountType === 'teacher' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Prénom</label>
                    <input 
                      type="text" 
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Votre prénom"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Nom</label>
                    <input 
                      type="text" 
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Votre nom"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Université d'attache</label>
                  <input 
                    type="text" 
                    name="university"
                    required
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="Ex: Université Joseph Ki-Zerbo"
                    className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Nom de l'établissement</label>
                  <input 
                    type="text" 
                    name="institutionName"
                    required
                    value={formData.institutionName}
                    onChange={handleChange}
                    placeholder="Ex: Institut Supérieur de Technologies"
                    className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Type d'établissement</label>
                  <select 
                    name="institutionType"
                    required
                    value={formData.institutionType}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-700"
                  >
                    <option value="Université Publique">Université Publique</option>
                    <option value="Université Privée">Université Privée</option>
                    <option value="Institut Privé">Institut Privé</option>
                    <option value="Grande École">Grande École</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Email {accountType === 'student' ? 'étudiant' : 'professionnel'}</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={accountType === 'student' ? "etudiant@campusbf.bf" : "contact@etablissement.bf"}
                className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Mot de passe</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Créer mon compte'}
            </button>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200/60"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Ou s'inscrire avec</span>
            <div className="flex-grow border-t border-slate-200/60"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-3.5 px-4 border border-slate-200/60 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-sm hover:shadow active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>

          <div className="text-center text-sm text-slate-500 pt-2">
            Déjà un compte ? <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

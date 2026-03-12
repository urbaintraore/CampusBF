import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, GraduationCap, Building2, Library } from 'lucide-react';

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'student' | 'institution' | 'teacher'>('student');
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-emerald-200">
            {accountType === 'student' ? <GraduationCap size={32} /> : accountType === 'teacher' ? <Library size={32} /> : <Building2 size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Créer un compte</h1>
          <p className="text-gray-500 mt-2">Rejoignez la communauté CampusBF dès aujourd'hui.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 flex-wrap md:flex-nowrap">
          <button
            type="button"
            onClick={() => setAccountType('student')}
            className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all ${accountType === 'student' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Étudiant
          </button>
          <button
            type="button"
            onClick={() => setAccountType('teacher')}
            className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all ${accountType === 'teacher' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Enseignant
          </button>
          <button
            type="button"
            onClick={() => setAccountType('institution')}
            className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all ${accountType === 'institution' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Établissement
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          {accountType === 'student' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Prénom</label>
                  <input 
                    type="text" 
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Votre prénom"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nom</label>
                  <input 
                    type="text" 
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Université / École</label>
                  <input 
                    type="text" 
                    name="university"
                    required
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="Ex: Université Joseph Ki-Zerbo"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Filière</label>
                  <input 
                    type="text" 
                    name="major"
                    required
                    value={formData.major}
                    onChange={handleChange}
                    placeholder="Ex: Informatique"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Niveau d'études</label>
                <select 
                  name="level"
                  required
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Prénom</label>
                  <input 
                    type="text" 
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Votre prénom"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nom</label>
                  <input 
                    type="text" 
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Université d'attache</label>
                <input 
                  type="text" 
                  name="university"
                  required
                  value={formData.university}
                  onChange={handleChange}
                  placeholder="Ex: Université Joseph Ki-Zerbo"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nom de l'établissement</label>
                <input 
                  type="text" 
                  name="institutionName"
                  required
                  value={formData.institutionName}
                  onChange={handleChange}
                  placeholder="Ex: Institut Supérieur de Technologies"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Type d'établissement</label>
                <select 
                  name="institutionType"
                  required
                  value={formData.institutionType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                >
                  <option value="Université Publique">Université Publique</option>
                  <option value="Université Privée">Université Privée</option>
                  <option value="Institut Privé">Institut Privé</option>
                  <option value="Grande École">Grande École</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email {accountType === 'student' ? 'étudiant' : 'professionnel'}</label>
            <input 
              type="email" 
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder={accountType === 'student' ? "etudiant@campusbf.bf" : "contact@etablissement.bf"}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Créer mon compte'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          Déjà un compte ? <Link to="/login" className="font-bold text-emerald-600 hover:underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent, asAdmin = false) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      login(asAdmin);
      setIsLoading(false);
      navigate(asAdmin ? '/admin' : '/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-emerald-200">
            C
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue sur CampusBF</h1>
          <p className="text-gray-500 mt-2">Connectez-vous pour accéder à votre espace étudiant.</p>
        </div>

        <form onSubmit={(e) => handleLogin(e, false)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email étudiant</label>
            <input 
              type="email" 
              required
              placeholder="etudiant@campusbf.bf"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Mot de passe</label>
              <a href="#" className="text-xs font-medium text-emerald-600 hover:underline">Oublié ?</a>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required
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
            {isLoading ? <Loader2 className="animate-spin" /> : 'Se connecter'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Ou</span>
          </div>
        </div>

        <button 
          onClick={(e) => handleLogin(e, true)}
          disabled={isLoading}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : 'Accès Administrateur (Démo)'}
        </button>

        <div className="text-center text-sm text-gray-500">
          Pas encore de compte ? <a href="#" className="font-bold text-emerald-600 hover:underline">S'inscrire</a>
        </div>
      </div>
    </div>
  );
}

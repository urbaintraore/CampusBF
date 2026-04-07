import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await resetPassword(email);
      setMessage('Un e-mail de réinitialisation a été envoyé à votre adresse. Pensez à vérifier vos courriers indésirables (spams).');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.message?.includes('user-not-found')) {
        setError('Aucun compte ne correspond à cette adresse e-mail.');
      } else if (err.message?.includes('invalid-email')) {
        setError('Adresse e-mail invalide.');
      } else if (err.message?.includes('too-many-requests')) {
        setError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else {
        setError(err.message || 'Une erreur est survenue lors de l\'envoi de l\'e-mail.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-gray-500 mt-2">Entrez votre email pour recevoir un lien de réinitialisation.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Envoyer le lien'}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-emerald-600 hover:underline flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Sparkles, BookOpen, GraduationCap, Building2, Briefcase, Calendar, Users, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InstitutionRestrictedSection() {
  const navigate = useNavigate();

  const allowedModules = [
    { icon: Building2, name: 'Portail Université', desc: 'Gérez votre présence académique et vos départements.', to: '/university-portal' },
    { icon: Briefcase, name: 'Portail Entreprise', desc: 'Collaborez avec le réseau d\'entreprises burkinabè.', to: '/enterprise-portal' },
    { icon: Briefcase, name: 'Stages & Emplois', desc: 'Publiez et suivez vos bourses et offres.', to: '/internships' },
    { icon: Briefcase, name: 'Missions Freelance', desc: 'Publiez et suivez les missions freelance.', to: '/missions' },
    { icon: Calendar, name: 'Événements', desc: 'Organisez des salons, conférences ou JPO.', to: '/events' },
    { icon: Users, name: 'Mentorat', desc: 'Participez à l\'accompagnement de vos diplômés.', to: '/mentorship' },
    { icon: User, name: 'Portfolio', desc: 'Présentez vos réalisations et votre corps professoral.', to: '/portfolio' },
    { icon: GraduationCap, name: 'Financement (Dons)', desc: 'Soutenez les initiatives et les étudiants nécessiteux.', to: '/financing' },
    { icon: BookOpen, name: 'Guide d\'utilisation', desc: 'Consultez notre manuel officiel.', to: '/guide' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden font-sans">
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-4xl bg-white/90 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-12 border border-slate-100 shadow-2xl shadow-emerald-200/50 relative z-10 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-4 mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold tracking-wider uppercase">
            <Sparkles size={12} className="animate-pulse" />
            Compte Établissement CampusBF
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
            Espace non autorisé
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Tu es au bon endroit ! En tant qu'Établissement académique sur CampusBF, tes accès sont concentrés sur la gestion académique, l'interaction avec les étudiants et l'orientation à travers les modules clés ci-dessous.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left mb-10">
          {allowedModules.map((mod, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(mod.to)}
              className="p-5 bg-slate-50/70 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 hover:border-emerald-100 transition-all cursor-pointer flex flex-col justify-between group h-[140px]"
            >
              <div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 group-hover:text-emerald-600 shadow-sm transition-colors mb-3">
                  <mod.icon size={20} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors line-clamp-2">
                  {mod.name}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-emerald-600 font-bold transition-colors mt-2">
                <span>Accéder</span>
                <ArrowRight size={10} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/15 transition-all text-sm active:scale-95 cursor-pointer"
          >
            Retour au Tableau de Bord 🏠
          </button>
        </div>
      </motion.div>
    </div>
  );
}

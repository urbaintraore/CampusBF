import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Sparkles, BookOpen, GraduationCap, Building2, Briefcase, Calendar, Compass, Library, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ParentRestrictedSection() {
  const navigate = useNavigate();

  const allowedModules = [
    { icon: Building2, name: 'Portail Université', desc: 'Consultez les informations des universités.', to: '/university-portal' },
    { icon: Briefcase, name: 'Portail Entreprise', desc: 'Explorez le réseau d\'entreprises partenaires.', to: '/enterprise-portal' },
    { icon: GraduationCap, name: 'Financement (Dons)', desc: 'Soutenez les étudiants burkinabè par des dons.', to: '/financing' },
    { icon: Calendar, name: 'Événements', desc: 'Restez informé de l\'agenda culturel et académique.', to: '/events' },
    { icon: Compass, name: 'Orientation', desc: 'Consultez les guides d\'orientation post-bac.', to: '/orientation' },
    { icon: Sparkles, name: 'CampusBF Talents', desc: 'Répertoire et contact avec les talents, profs et tuteurs.', to: '/talents' },
    { icon: Sparkles, name: 'Bourses & Opportunités', desc: 'Consultez les bourses d\'excellence disponibles.', to: '/scholarships' },
    { icon: Briefcase, name: 'Bourses et Stages', desc: 'Découvrez les offres de stage et d\'emploi.', to: '/internships' },
    { icon: GraduationCap, name: 'Répétiteurs & Profs de maison', desc: 'Trouvez un enseignant de soutien local.', to: '/tutors' },
    { icon: Users, name: 'Mentorat', desc: 'Découvrez le programme d\'accompagnement étudiant.', to: '/mentorship' },
    { icon: BookOpen, name: 'Formations', desc: 'Consultez le catalogue des ateliers courts.', to: '/trainings' },
    { icon: BookOpen, name: 'Guide d\'utilisation', desc: 'Lisez le guide d\'utilisation officiel.', to: '/guide' },
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
            Compte Parent CampusBF
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
            Espace non autorisé
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Tu es au bon endroit ! Mais en tant que Parent d'étudiant sur CampusBF, tes accès sont configurés pour t'aider à accompagner la réussite de ton enfant à travers les services clés ci-dessous.
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

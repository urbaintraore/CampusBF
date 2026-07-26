import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Sparkles, BookOpen, GraduationCap, Building2, Briefcase, Calendar, Library, Users, ShoppingBag, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CompanyRestrictedSection() {
  const navigate = useNavigate();

  const allowedModules = [
    { icon: Briefcase, name: 'Portail Entreprise', desc: 'Gérez vos offres et recrutez des talents.', to: '/enterprise-portal' },
    { icon: Building2, name: 'Portail Université', desc: 'Collaborez avec les universités du Burkina.', to: '/university-portal' },
    { icon: Briefcase, name: 'Stages & Emplois', desc: 'Publiez et suivez vos opportunités.', to: '/internships' },
    { icon: Library, name: 'Portails Enseignants', desc: 'Consultez l\'annuaire des enseignants.', to: '/teachers' },
    { icon: ShoppingBag, name: 'Marketplace', desc: 'Achetez et vendez du matériel scolaire.', to: '/marketplace' },
    { icon: Calendar, name: 'Événements', desc: 'Participez aux événements académiques et pro.', to: '/events' },
    { icon: Users, name: 'Mentorat', desc: 'Accompagnez des étudiants burkinabè.', to: '/mentorship' },
    { icon: User, name: 'Portfolio', desc: 'Présentez votre entreprise et vos projets.', to: '/portfolio' },
    { icon: GraduationCap, name: 'Financement (Dons)', desc: 'Soutenez les étudiants par des dons.', to: '/financing' },
    { icon: BookOpen, name: 'Formations', desc: 'Consultez notre catalogue d\'ateliers.', to: '/trainings' },
    { icon: BookOpen, name: 'Guide d\'utilisation', desc: 'Consultez notre guide d\'utilisation.', to: '/guide' },
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
            Compte Entreprise CampusBF
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
            Espace non autorisé
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Tu es au bon endroit ! Mais en tant que Partenaire Entreprise sur CampusBF, tes accès sont configurés pour te concentrer sur le recrutement, le mentorat et l'accompagnement d'étudiants à travers les services clés ci-dessous.
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

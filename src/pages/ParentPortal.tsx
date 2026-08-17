import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Users, GraduationCap, Compass, BookOpen, MessageCircle, MapPin, ArrowRight, Library, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ParentPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portail Parents</h1>
            <p className="text-slate-500">Accompagnez vos enfants dans leur parcours éducatif : Trouvez des répétiteurs, mentors et experts.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/tutors')}>
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap size={24} />
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-orange-500 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Répétiteurs</h3>
          <p className="text-sm font-medium text-slate-500 mb-4">Trouvez un répétiteur ou professeur de maison certifié pour un soutien scolaire personnalisé.</p>
          <div className="text-sm font-bold text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">
            Rechercher un répétiteur
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/mentorship')}>
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Mentors</h3>
          <p className="text-sm font-medium text-slate-500 mb-4">Connectez votre enfant avec des étudiants en Master/Doctorat ou professionnels pour le guider.</p>
          <div className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
            Trouver un mentor
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/talents')}>
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles size={24} />
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">CampusBF Talents</h3>
          <p className="text-sm font-medium text-slate-500 mb-4">Consultez l'annuaire des compétences (Profs, Alumni, Mentors & Tuteurs) et demandez des consultations.</p>
          <div className="text-sm font-bold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
            Découvrir les Talents
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200/60">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600" />
            Orientation et Accompagnement
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Découvrez nos guides et ressources pour aider votre enfant dans ses choix scolaires et universitaires.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
               <div className="mt-1 p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                 <Compass size={20} />
               </div>
               <div>
                  <h4 className="font-bold text-emerald-900 mb-1">Guide d'Orientation</h4>
                  <p className="text-sm text-emerald-700/80 mb-3">Informations sur les filières et universités du Burkina Faso pour le post-bac.</p>
                  <Link to="/orientation" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    Consulter le guide <ArrowRight size={14}/>
                  </Link>
               </div>
             </div>
             
             <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
               <div className="mt-1 p-2 bg-amber-100 text-amber-600 rounded-lg">
                 <Sparkles size={20} />
               </div>
               <div>
                  <h4 className="font-bold text-amber-900 mb-1">Bourses & Opportunités IA</h4>
                  <p className="text-sm text-amber-700/80 mb-3">Découvrez les offres de bourses d'excellence pour financer les études de votre enfant.</p>
                  <Link to="/scholarships" className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    Voir les bourses <ArrowRight size={14}/>
                  </Link>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

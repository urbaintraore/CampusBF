import React, { useRef } from 'react';
import { User } from '@/types';
import { useReactToPrint } from 'react-to-print';
import { Download, X, Mail, Phone, MapPin, Briefcase, GraduationCap, Award } from 'lucide-react';

interface CVGeneratorProps {
  user: User;
  onClose: () => void;
}

export const CVGenerator: React.FC<CVGeneratorProps> = ({ user, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `CV_${user.firstName}_${user.lastName}`,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-100 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Générateur de CV</h2>
            <p className="text-sm text-slate-500">Aperçu avant téléchargement</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handlePrint()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Download size={16} />
              Télécharger PDF
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200">
          
          {/* CV A4 Page Container */}
          <div 
            ref={componentRef} 
            className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-10 flex flex-col text-slate-800"
            style={{ aspectRatio: '210/297' }}
          >
            {/* CV Header */}
            <div className="flex items-center gap-8 border-b-2 border-emerald-600 pb-8 mb-8">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-slate-100" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center text-4xl font-bold text-slate-300">
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-slate-900 uppercase tracking-tight mb-2">
                  {user.firstName} <span className="text-emerald-600">{user.lastName}</span>
                </h1>
                <h2 className="text-xl text-slate-600 font-medium mb-4">
                  Étudiant(e) en {user.major} - {user.level}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  {user.email && (
                    <div className="flex items-center gap-1.5"><Mail size={14} /> {user.email}</div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-1.5"><Phone size={14} /> {user.phone}</div>
                  )}
                  {(user.city || user.neighborhood) && (
                    <div className="flex items-center gap-1.5"><MapPin size={14} /> {user.neighborhood ? `${user.neighborhood}, ` : ''}{user.city}</div>
                  )}
                </div>
              </div>
            </div>

            {/* CV Body */}
            <div className="flex gap-8 flex-1">
              
              {/* Left Column (Main Content) */}
              <div className="flex-1 space-y-8">
                
                {/* Profil / Bio */}
                {user.bio && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><Award size={18} /></div>
                      Profil
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 text-justify">
                      {user.bio}
                    </p>
                  </section>
                )}

                {/* Formation */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><GraduationCap size={18} /></div>
                    Formation
                  </h3>
                  <div className="space-y-4">
                    <div className="relative pl-4 border-l-2 border-slate-200">
                      <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                      <h4 className="font-bold text-slate-800">{user.major} - {user.level}</h4>
                      <p className="text-sm font-medium text-emerald-600 mb-1">{user.university}</p>
                      {user.promotion && <p className="text-xs text-slate-500">Promotion : {user.promotion}</p>}
                    </div>
                  </div>
                </section>

                {/* Expériences */}
                {user.experiences && user.experiences.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><Briefcase size={18} /></div>
                      Expériences Professionnelles
                    </h3>
                    <div className="space-y-6">
                      {user.experiences.map((exp) => (
                        <div key={exp.id} className="relative pl-4 border-l-2 border-slate-200">
                          <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                          <h4 className="font-bold text-slate-800">{exp.title}</h4>
                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-2">
                            <span>{exp.company}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">{exp.startDate} - {exp.endDate || 'Présent'}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {exp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column (Sidebar) */}
              <div className="w-64 space-y-8">
                
                {/* Compétences */}
                {user.skills && user.skills.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                      Compétences
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Langues (Placeholder if we want to add later) */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                    Langues
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex justify-between"><span>Français</span> <span className="font-medium text-slate-400">Courant</span></li>
                    <li className="flex justify-between"><span>Anglais</span> <span className="font-medium text-slate-400">Intermédiaire</span></li>
                  </ul>
                </section>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
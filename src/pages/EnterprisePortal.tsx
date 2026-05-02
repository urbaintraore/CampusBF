import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Briefcase, Users, FileText, CheckCircle2, Plus, Clock, Search, MapPin } from 'lucide-react';
import { Internships } from './Internships'; // Depending on what we re-use

export default function EnterprisePortal() {
  const { user, internships } = useAuth();
  
  const companyInternships = internships.filter(i => i.authorId === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portail Entreprise</h1>
            <p className="text-slate-500">Gérez vos offres et recrutez des talents de CampusBF</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Offres publiées</p>
            <p className="text-2xl font-black text-slate-900">{companyInternships.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Candidatures reçues</p>
            <p className="text-2xl font-black text-slate-900">--</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Abonnement</p>
            <p className="text-xl font-bold text-slate-900">Actif</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            Mes offres récentes
          </h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
            <Plus size={18} />
            <span className="text-sm font-medium">Créer une offre</span>
          </button>
        </div>
        <div className="p-6">
          {companyInternships.length > 0 ? (
            <div className="space-y-4">
              {companyInternships.map(internship => (
                <div key={internship.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900">{internship.title}</h3>
                    <p className="text-sm text-slate-500">{internship.type} • {internship.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">Vous n'avez pas encore publié d'offres.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

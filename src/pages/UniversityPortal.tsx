import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { School, Users, FileText, Calendar, Plus, Trophy, Award, MessageCircle } from 'lucide-react';

export default function UniversityPortal() {
  const { user, events, users } = useAuth();
  
  const universityEvents = events.filter(e => e.organizerId === user?.id);
  const registeredStudents = users.filter((u: any) => u.university === user?.institutionProfile?.type); // Assuming matching name or logic

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <School size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portail Institution</h1>
            <p className="text-slate-500">Gérez votre présence et interagissez avec vos étudiants</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Étudiants inscrits</p>
            <p className="text-2xl font-black text-slate-900">--</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Événements organisés</p>
            <p className="text-2xl font-black text-slate-900">{universityEvents.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Abonnement</p>
            <p className="text-xl font-bold text-slate-900">{user?.institutionProfile?.subscriptionStatus === 'active' ? 'Premium' : 'Standard'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Vos événements récents
            </h2>
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <Plus size={20} />
            </button>
          </div>
          <div className="p-6">
            {universityEvents.length > 0 ? (
              <div className="space-y-4">
                {universityEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">{event.title}</h3>
                      <p className="text-sm text-slate-500">{event.date} à {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">Organisez des journées portes ouvertes, des séminaires, etc.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Communication
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <button className="w-full p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-colors flex items-center justify-between group">
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Envoyer une annonce</h3>
                  <p className="text-sm text-slate-500 mt-1">Notifier tous vos étudiants sur la plateforme</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Plus size={20} />
                </div>
              </button>
            </div>
            
             <div className="mt-8 text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <p className="text-slate-500 text-sm">Statistiques détaillées disponibles avec l'abonnement Premium.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

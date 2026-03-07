import React from 'react';
import { Search, Bell, Filter } from 'lucide-react';
import { MOCK_DOCUMENTS, MOCK_INTERNSHIPS, MOCK_MARKETPLACE, MOCK_TUTORS, CURRENT_USER } from '@/data/mock';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bonjour, {CURRENT_USER.firstName} 👋</h1>
          <p className="text-gray-500 mt-1">Voici ce qui se passe sur ton campus aujourd'hui.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-white rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats / Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Documents', count: MOCK_DOCUMENTS.length.toString(), color: 'bg-blue-50 text-blue-700' },
          { label: 'Stages & Jobs', count: MOCK_INTERNSHIPS.length.toString(), color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Groupes', count: '5', color: 'bg-purple-50 text-purple-700' },
          { label: 'Messages', count: '3', color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Favoris', count: '8', color: 'bg-amber-50 text-amber-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.color} flex flex-col items-center justify-center text-center`}>
            <span className="text-2xl font-bold">{stat.count}</span>
            <span className="text-xs font-medium uppercase tracking-wide opacity-80">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Main Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Docs & Internships */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Documents */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Documents Récents</h2>
              <Link to="/documents" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {MOCK_DOCUMENTS.slice(0, 3).map((doc) => (
                <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <span className="font-bold text-xs uppercase">{doc.type.slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                    <p className="text-sm text-gray-500">{doc.subject} • {doc.year}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{doc.university}</span>
                      <span>•</span>
                      <span>{doc.downloads} téléchargements</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Internships */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Stages & Jobs</h2>
              <Link to="/internships" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {MOCK_INTERNSHIPS.slice(0, 2).map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                      {job.type === 'internship' ? 'Stage' : 'Job'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{job.company} • {job.location}</p>
                  <button className="w-full py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    Postuler
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Tutors & Marketplace */}
        <div className="space-y-8">
          
          {/* Recommended Tutors */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Répétiteurs</h2>
              <Link to="/tutors" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {MOCK_TUTORS.slice(0, 3).map((tutor) => (
                <div key={tutor.id} className="p-4 flex items-center gap-3">
                  <img src={tutor.user.avatarUrl} alt={tutor.user.firstName} className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm">{tutor.user.firstName} {tutor.user.lastName}</h4>
                    <p className="text-xs text-gray-500 truncate">{tutor.subjects.join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-emerald-600">{tutor.rating} ★</span>
                    <span className="text-[10px] text-gray-400">{tutor.hourlyRate} F/h</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Marketplace Preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Marketplace</h2>
              <Link to="/marketplace" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {MOCK_MARKETPLACE.slice(0, 2).map((item) => (
                <div key={item.id} className="group flex gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{item.price.toLocaleString()} CFA</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      📍 {item.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

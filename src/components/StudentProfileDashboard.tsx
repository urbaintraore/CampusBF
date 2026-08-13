import React, { useState } from 'react';
import { 
  FileText, Calendar, Users, TrendingUp, Sparkles, Download, 
  Eye, CheckCircle2, Award, MessageSquare, BookOpen, Layers, BarChart3, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  CartesianGrid 
} from 'recharts';

export function StudentProfileDashboard() {
  const { user, documents = [], events = [], groups = [] } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'docs' | 'events' | 'community'>('all');
  const [timeframe, setTimeframe] = useState<'month' | 'semester' | 'year'>('semester');

  if (!user) return null;

  // 1. Calculate Shared Documents metrics
  const userDocs = documents.filter((d: any) => 
    d.uploaderId === user.id || 
    d.authorId === user.id || 
    d.createdBy === user.id || 
    (d.author && d.author.toLowerCase() === `${user.firstName} ${user.lastName}`.toLowerCase())
  );

  const sharedDocsCount = userDocs.length > 0 ? userDocs.length : (user.activityStats?.docsViewed || 2);
  const totalDownloads = userDocs.reduce((acc: number, curr: any) => acc + (curr.downloadCount || 0), 0) + (user.activityStats?.docsDownloaded || 5);

  // Document categories breakdown data
  const docCategoriesData = [
    { name: 'Examens & Sujets', count: Math.max(1, Math.round(sharedDocsCount * 0.4)), color: '#059669' },
    { name: 'Cours & Supports', count: Math.max(1, Math.round(sharedDocsCount * 0.3)), color: '#0d9488' },
    { name: 'TD / TP & Corrigés', count: Math.max(1, Math.round(sharedDocsCount * 0.2)), color: '#2563eb' },
    { name: 'Mémoires & Projets', count: Math.max(1, Math.round(sharedDocsCount * 0.1)), color: '#8b5cf6' }
  ];

  // 2. Calculate Events Followed metrics
  const followedEvents = events.filter((e: any) => 
    e.attendees?.includes(user.id) || 
    e.organizerId === user.id || 
    e.creatorId === user.id
  );

  const eventsCount = followedEvents.length > 0 ? followedEvents.length : (user.activityStats?.eventParticipations || 4);

  // Events monthly activity trend
  const eventsTrendData = [
    { month: 'Mars', soutenance: 1, atelier: 2, forum: 1 },
    { month: 'Avril', soutenance: 2, atelier: 1, forum: 2 },
    { month: 'Mai', soutenance: 3, atelier: 3, forum: 1 },
    { month: 'Juin', soutenance: 4, atelier: 2, forum: 3 },
    { month: 'Juillet', soutenance: 2, atelier: 4, forum: 2 },
    { month: 'Août', soutenance: Math.max(1, eventsCount), atelier: 3, forum: 2 }
  ];

  // 3. Calculate Community Interactions metrics
  const userGroups = groups.filter((g: any) => g.members?.includes(user.id));
  const groupMessagesCount = user.activityStats?.groupMessages || 18;
  const quizCompletionsCount = user.activityStats?.quizzesCompleted || 6;
  const forumInteractionsCount = user.hasPostedPresentation ? 8 : 4;
  const totalInteractions = groupMessagesCount + quizCompletionsCount + forumInteractionsCount;

  // Community interaction distribution by channel
  const communityDistributionData = [
    { name: 'Groupes Promo & Filières', value: groupMessagesCount, color: '#059669' },
    { name: 'Quiz & Révisions', value: quizCompletionsCount, color: '#2563eb' },
    { name: 'Forums & Entraide', value: forumInteractionsCount, color: '#d97706' },
    { name: 'Soutien & Mentorat', value: 3, color: '#8b5cf6' }
  ];

  // Combined activity trend over recent weeks
  const combinedWeeklyData = [
    { day: 'Lun', docs: 1, events: 0, interactions: 4 },
    { day: 'Mar', docs: 2, events: 1, interactions: 8 },
    { day: 'Mer', docs: 0, events: 0, interactions: 5 },
    { day: 'Jeu', docs: 3, events: 2, interactions: 12 },
    { day: 'Ven', docs: 1, events: 1, interactions: 7 },
    { day: 'Sam', docs: 4, events: 1, interactions: 10 },
    { day: 'Dim', docs: 2, events: 0, interactions: 6 }
  ];

  return (
    <div className="glass p-6 md:p-8 rounded-3xl border border-white/40 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Tableau de Bord d'Activité & Statistiques
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aperçu visuel de vos documents partagés, événements suivis et interactions sur CampusBF.
              </p>
            </div>
          </div>
        </div>

        {/* View filters */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl self-start md:self-auto border border-slate-200/50 dark:border-slate-700/50">
          {[
            { id: 'all', label: 'Vue Globale' },
            { id: 'docs', label: 'Documents' },
            { id: 'events', label: 'Événements' },
            { id: 'community', label: 'Communauté' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Shared Documents */}
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-800/50 rounded-2xl space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Documents Partagés
            </span>
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <FileText size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {sharedDocsCount} <span className="text-xs font-semibold text-slate-500">fichiers</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <Download size={12} /> {totalDownloads} téléchargement(s) générés
            </p>
          </div>
        </div>

        {/* Card 2: Events Followed */}
        <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-800/50 rounded-2xl space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Événements Suivis
            </span>
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <Calendar size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {eventsCount} <span className="text-xs font-semibold text-slate-500">événements</span>
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 size={12} /> Soutenances, forums & ateliers
            </p>
          </div>
        </div>

        {/* Card 3: Community Interactions */}
        <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/50 rounded-2xl space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Interactions Communauté
            </span>
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {totalInteractions} <span className="text-xs font-semibold text-slate-500">actions</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
              <MessageSquare size={12} /> {userGroups.length} groupe(s) actif(s) rejoint(s)
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Chart 1: Combined Activity Timeline */}
        {(activeTab === 'all' || activeTab === 'community') && (
          <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600" />
                  Activité Hebdomadaire Régulière
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Interaction sur les documents, événements et groupes par jour</p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedWeeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '12px', 
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="interactions" name="Interactions" stroke="#059669" fillOpacity={1} fill="url(#colorInteractions)" />
                  <Area type="monotone" dataKey="events" name="Événements" stroke="#2563eb" fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 2: Shared Documents Breakdown by Category */}
        {(activeTab === 'all' || activeTab === 'docs') && (
          <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" />
                  Répartition des Documents Partagés
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Volume par catégorie de ressources académiques</p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docCategoriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '12px', 
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none'
                    }} 
                  />
                  <Bar dataKey="count" name="Nombre de documents" radius={[8, 8, 0, 0]}>
                    {docCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 3: Followed Events Category Distribution */}
        {(activeTab === 'all' || activeTab === 'events') && (
          <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  Progression des Événements Suivis
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Évolution de la participation sur les 6 derniers mois</p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '12px', 
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="soutenance" name="Soutenances" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atelier" name="Ateliers" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="forum" name="Forums" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 4: Community Interactions Donut Chart */}
        {(activeTab === 'all' || activeTab === 'community') && (
          <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users size={16} className="text-amber-600" />
                  Interactions par Canal Communautaire
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pourcentage d'engagement par canal d'échange</p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={communityDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {communityDistributionData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '12px', 
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

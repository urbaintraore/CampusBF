import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Filter, Download, Activity, Users, FileText, TrendingUp, Cpu, Maximize2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Log {
  id: string;
  userId: string;
  userName: string;
  email: string;
  universite: string;
  filiere: string;
  action: string;
  module: string;
  details: string;
  metadata: any;
  ipAddress: string;
  device: string;
  browser: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Timestamp;
}

export function ActivityLogsAdmin() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('Tous');
  const [severityFilter, setSeverityFilter] = useState('Tous');
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'activity_logs'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let formattedCreatedAt = new Date().toISOString();
        let originalTimestamp = null;
        
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            formattedCreatedAt = data.createdAt.toDate().toISOString();
            originalTimestamp = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            formattedCreatedAt = data.createdAt;
          } else if (data.createdAt.seconds) {
            formattedCreatedAt = new Date(data.createdAt.seconds * 1000).toISOString();
            originalTimestamp = data.createdAt;
          } else if (data.createdAt instanceof Date) {
            formattedCreatedAt = data.createdAt.toISOString();
          }
        }
        
        return {
          id: doc.id,
          ...data,
          createdAt: formattedCreatedAt,
          timestamp: originalTimestamp
        } as unknown as Log;
      });
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching activity logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const exportCSV = () => {
    if (logs.length === 0) return;
    
    // Headers
    const headers = ['Date', 'Utilisateur', 'Email', 'Université', 'Filière', 'Module', 'Action', 'Sévérité', 'Détails', 'Appareil', 'Navigateur'];
    
    // Rows
    const rows = filteredLogs.map(log => [
      format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss'),
      `"${log.userName}"`,
      `"${log.email}"`,
      `"${log.universite}"`,
      `"${log.filiere}"`,
      `"${log.module}"`,
      `"${log.action}"`,
      log.severity,
      `"${log.details || ''}"`,
      `"${log.device}"`,
      `"${log.browser}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campusbf_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => {
    const searchString = `${log.userName} ${log.action} ${log.module} ${log.universite} ${log.email}`.toLowerCase();
    const matchSearch = searchString.includes(searchTerm.toLowerCase());
    const matchModule = moduleFilter === 'Tous' || log.module === moduleFilter;
    const matchSeverity = severityFilter === 'Tous' || log.severity === severityFilter;
    
    return matchSearch && matchModule && matchSeverity;
  });

  // Unique modules for filter
  const modules = ['Tous', ...Array.from(new Set(logs.map(l => l.module).filter(Boolean)))];

  // Stats
  const today = new Date().toDateString();
  const logsToday = logs.filter(l => new Date(l.createdAt).toDateString() === today);
  const activeUsersToday = new Set(logsToday.map(l => l.userId).filter(Boolean)).size;
  const downloadsCount = logs.filter(l => l.action.toLowerCase().includes('télécharge')).length;
  const quizCount = logs.filter(l => l.action.toLowerCase().includes('quiz') || l.module.toLowerCase().includes('quiz')).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Étudiants actifs (Auj.)</p>
            <div className="text-2xl font-bold text-gray-900">{activeUsersToday}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Téléchargements</p>
            <div className="text-2xl font-bold text-gray-900">{downloadsCount}</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Download size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Quiz effectués</p>
            <div className="text-2xl font-bold text-gray-900">{quizCount}</div>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
            <Activity size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Logs (7j)</p>
            <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                <Cpu size={20} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Centre de Monitoring</h2>
                <p className="text-sm text-gray-500">Suivi en temps réel des activités sur la plateforme</p>
              </div>
            </div>
            <button 
              onClick={exportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher étudiant, action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-full"
              />
            </div>
            
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-full appearance-none bg-white font-medium text-gray-700"
            >
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-full appearance-none bg-white font-medium text-gray-700"
            >
              <option value="Tous">Toutes les sévérités</option>
              <option value="info">Info</option>
              <option value="warning">Avertissement</option>
              <option value="error">Erreur</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-gray-500">
               <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
               <p>Chargement des logs en temps réel...</p>
             </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Aucun log trouvé pour ces critères.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Heure</th>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4 text-center">Appareil</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div className="text-[13px] font-medium text-gray-700">
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </div>
                      <div className="text-[11px]">
                        {format(new Date(log.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{log.userName}</div>
                      <div className="text-xs text-gray-500 max-w-[150px] truncate" title={log.universite}>
                        {log.universite || log.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.severity === 'error' && <AlertCircle size={14} className="text-red-500" />}
                        {log.severity === 'warning' && <AlertCircle size={14} className="text-orange-500" />}
                        <span className="font-medium text-gray-800">{log.action}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {log.module || 'Système'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-500">
                      {log.device}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 hover:bg-white border text-gray-400 hover:text-indigo-600 border-transparent hover:border-gray-200 rounded-md transition-all shadow-sm"
                        title="Voir les détails"
                      >
                        <Maximize2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Détails */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" />
                Détails de l'événement
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 mb-1">Utilisateur</p>
                   <p className="font-semibold text-gray-900 text-sm">{selectedLog.userName}</p>
                   <p className="text-xs text-gray-500">{selectedLog.email}</p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 mb-1">Horodatage</p>
                   <p className="font-semibold text-gray-900 text-sm">{format(new Date(selectedLog.createdAt), 'dd MMMM yyyy HH:mm:ss', { locale: fr })}</p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 mb-1">Module & Action</p>
                   <p className="font-semibold text-gray-900 text-sm">{selectedLog.action}</p>
                   <p className="text-xs text-gray-500">{selectedLog.module}</p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 mb-1">Environnement</p>
                   <p className="font-semibold text-gray-900 text-sm">{selectedLog.device} - {selectedLog.browser}</p>
                 </div>
               </div>

               <div className="mb-4">
                 <p className="text-sm font-semibold text-gray-900 mb-2">Description</p>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700">
                   {selectedLog.details || "Aucun détail supplémentaire."}
                 </div>
               </div>

               {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Métadonnées</p>
                    <pre className="bg-gray-900 p-4 rounded-xl text-emerald-400 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
               )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

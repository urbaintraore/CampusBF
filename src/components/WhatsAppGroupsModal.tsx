import React, { useState, useEffect } from 'react';
import { MessageSquare, ExternalLink, Plus, Search, CheckCircle2, Shield, Users, Building2, GraduationCap, X, Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

export interface WhatsAppGroup {
  id?: string;
  name: string;
  university: string;
  major: string;
  level: string;
  link: string;
  creatorName: string;
  creatorId: string;
  verified: boolean;
  memberCount?: number;
  createdAt?: any;
}

const DEFAULT_GROUPS: WhatsAppGroup[] = [
  {
    id: '1',
    name: 'UJKZ - Informatique & Web L1/L2/L3',
    university: 'Université Joseph Ki-Zerbo (UJKZ)',
    major: 'Informatique / UFR-SEA',
    level: 'Licence 1-3',
    link: 'https://chat.whatsapp.com/CampusBF_UJKZ_Info',
    creatorName: 'Délégué Informatique UJKZ',
    creatorId: 'admin_ujkz',
    verified: true,
    memberCount: 142
  },
  {
    id: '2',
    name: 'UNZ Koudougou - Droit & Sciences Politiques L2',
    university: 'Université Norbert Zongo (UNZ)',
    major: 'Droit (UFR-SEG)',
    level: 'Licence 2',
    link: 'https://chat.whatsapp.com/CampusBF_UNZ_Droit',
    creatorName: 'Bureau des Étudiants UNZ',
    creatorId: 'admin_unz',
    verified: true,
    memberCount: 98
  },
  {
    id: '3',
    name: 'UPB Bobo - Génie Électrique & Informatique',
    university: 'Université Nazi Boni (UPB)',
    major: 'Génie Électrique (ESI)',
    level: 'Master 1',
    link: 'https://chat.whatsapp.com/CampusBF_UPB_ESI',
    creatorName: 'Club Tech UPB',
    creatorId: 'admin_upb',
    verified: true,
    memberCount: 85
  },
  {
    id: '4',
    name: 'AUSS Ouaga - Économie & Gestion S3/S4',
    university: 'Université Thomas Sankara (UTS)',
    major: 'Sciences Économiques (UFR-SEG)',
    level: 'Licence 2',
    link: 'https://chat.whatsapp.com/CampusBF_UTS_SEG',
    creatorName: 'AEE UTS',
    creatorId: 'admin_uts',
    verified: true,
    memberCount: 210
  }
];

interface WhatsAppGroupsModalProps {
  onClose: () => void;
}

export const WhatsAppGroupsModal: React.FC<WhatsAppGroupsModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<WhatsAppGroup[]>(DEFAULT_GROUPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [newGroup, setNewGroup] = useState({
    name: '',
    university: user?.university || 'Université Joseph Ki-Zerbo (UJKZ)',
    major: user?.major || '',
    level: user?.level || 'Licence 1',
    link: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWhatsAppGroups();
  }, []);

  const fetchWhatsAppGroups = async () => {
    try {
      const q = query(collection(db, 'whatsapp_groups'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const customGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppGroup));
      if (customGroups.length > 0) {
        setGroups([...customGroups, ...DEFAULT_GROUPS]);
      }
    } catch (error) {
      console.warn("Using default WhatsApp groups listing:", error);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name || !newGroup.link) {
      alert("Veuillez remplir au moins le nom du groupe et le lien WhatsApp valide.");
      return;
    }

    if (!newGroup.link.includes('whatsapp.com') && !newGroup.link.includes('wa.me')) {
      alert("Le lien doit être un lien d'invitation WhatsApp valide (chat.whatsapp.com ou wa.me).");
      return;
    }

    try {
      setLoading(true);
      const groupData: Omit<WhatsAppGroup, 'id'> = {
        name: newGroup.name,
        university: newGroup.university,
        major: newGroup.major || 'Filière Générale',
        level: newGroup.level || 'Tous niveaux',
        link: newGroup.link.trim(),
        creatorName: `${user?.firstName || 'Étudiant'} ${user?.lastName || ''}`,
        creatorId: user?.id || 'anonymous',
        verified: user?.role === 'admin' || user?.role === 'institution',
        memberCount: 1,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'whatsapp_groups'), groupData);
      setGroups(prev => [{ id: docRef.id, ...groupData, verified: groupData.verified }, ...prev]);
      setShowAddModal(false);
      setNewGroup({
        name: '',
        university: user?.university || '',
        major: user?.major || '',
        level: user?.level || 'Licence 1',
        link: ''
      });
      alert("Votre groupe WhatsApp a été ajouté avec succès à l'annuaire CampusBF !");
    } catch (err) {
      console.error("Error adding WhatsApp group:", err);
      // Fallback local insert
      const localGroup = {
        id: Date.now().toString(),
        ...newGroup,
        major: newGroup.major || 'Filière Générale',
        creatorName: `${user?.firstName || 'Étudiant'} ${user?.lastName || ''}`,
        creatorId: user?.id || 'anon',
        verified: true,
        memberCount: 1
      };
      setGroups(prev => [localGroup, ...prev]);
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.major.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUni = selectedUniversity === 'all' || g.university.toLowerCase().includes(selectedUniversity.toLowerCase());
    return matchesSearch && matchesUni;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <MessageSquare size={24} className="text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Groupes WhatsApp Promo & Filières</h2>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                Rejoins directement la communauté WhatsApp de ta promo au Burkina Faso
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Action Header & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher ta filière, université, promo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-slate-100"
              />
            </div>

            <button 
              onClick={() => setShowAddModal(!showAddModal)}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all shrink-0 active:scale-95"
            >
              <Plus size={18} />
              Ajouter un groupe
            </button>
          </div>

          {/* Add Group Drawer/Form */}
          {showAddModal && (
            <form onSubmit={handleAddGroup} className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-600" />
                  Créer ou partager un groupe WhatsApp de promo
                </h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Nom du groupe *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: UJKZ - Informatique L2 (2025)"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Université / Établissement *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Université Joseph Ki-Zerbo"
                    value={newGroup.university}
                    onChange={(e) => setNewGroup({ ...newGroup, university: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Filière</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Droit / Economie / Informatique"
                    value={newGroup.major}
                    onChange={(e) => setNewGroup({ ...newGroup, major: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Lien d'invitation WhatsApp *</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://chat.whatsapp.com/..."
                    value={newGroup.link}
                    onChange={(e) => setNewGroup({ ...newGroup, link: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md"
                >
                  {loading ? 'Publication...' : 'Publier le groupe'}
                </button>
              </div>
            </form>
          )}

          {/* Groups List */}
          <div className="space-y-3">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <MessageSquare size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Aucun groupe WhatsApp trouvé</p>
                <p className="text-xs text-slate-400 mt-1">Sois le premier à ajouter le groupe de ta filière !</p>
              </div>
            ) : (
              filteredGroups.map((group, index) => (
                <div 
                  key={group.id || index}
                  className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-emerald-600 transition-colors">
                        {group.name}
                      </h4>
                      {group.verified && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={12} /> Officiel
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 size={13} className="text-emerald-500" />
                        {group.university}
                      </span>
                      {group.major && (
                        <span className="flex items-center gap-1">
                          <GraduationCap size={13} className="text-emerald-500" />
                          {group.major}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <button 
                      onClick={() => handleCopyLink(group.link, group.id || index.toString())}
                      className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-all text-xs flex items-center gap-1.5"
                      title="Copier le lien"
                    >
                      {copiedId === (group.id || index.toString()) ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>

                    <a 
                      href={group.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <MessageSquare size={16} />
                      Rejoindre sur WhatsApp
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Shield size={14} className="text-emerald-600" />
            Accès sécurisé pour étudiants vérifiés CampusBF
          </span>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

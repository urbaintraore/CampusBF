import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Filter, Clock, CheckCircle2, Star, User, Building2, AlertCircle, X, Send, Award, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { missionService } from '@/services/missionService';
import { Mission, MissionCategorie, MissionStatut, MissionCandidature } from '@/types';
import { serverTimestamp } from 'firebase/firestore';

export default function Missions() {
  const { user, isAdmin } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my_missions' | 'post'>('browse');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation modal state (for enterprise rating)
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validationNote, setValidationNote] = useState<number>(5);
  const [validationComment, setValidationComment] = useState('');

  // New mission form state (for company/admin)
  const [newMissionForm, setNewMissionForm] = useState({
    titre: '',
    description_brief: '',
    categorie: 'redaction' as MissionCategorie,
    budget: 25000,
    delai: '7 jours',
    livrable_attendu: ''
  });

  const fetchMissions = async () => {
    try {
      const data = await missionService.getAllMissions();
      setMissions(data);
    } catch (err) {
      console.error("Error fetching missions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const isCompanyOrAdmin = user && (user.role === 'company' || user.role === 'admin');

  const handlePostMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await missionService.createMission({
        entreprise_id: user.id,
        entreprise_nom: user.companyName || user.firstName + ' ' + user.lastName || 'Entreprise CampusBF',
        entreprise_email: user.email,
        ...newMissionForm
      });
      alert('Mission publiée avec succès !');
      setNewMissionForm({
        titre: '',
        description_brief: '',
        categorie: 'redaction',
        budget: 25000,
        delai: '7 jours',
        livrable_attendu: ''
      });
      setActiveTab('browse');
      fetchMissions();
    } catch (err: any) {
      alert('Erreur lors de la publication : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMission) return;
    if (user.role === 'company' || user.role === 'institution') {
      alert('Les comptes entreprises ne peuvent pas candidater aux missions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const candidature: MissionCandidature = {
        etudiant_id: user.id,
        etudiant_nom: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        etudiant_email: user.email,
        etudiant_telephone: user.phone || '',
        etudiant_avatar: user.avatarUrl || '',
        etudiant_major: user.major || user.university || '',
        message_motivation: motivationMessage,
        date_candidature: new Date().toISOString(),
        statut: 'en_attente'
      };

      await missionService.applyToMission(selectedMission.id, candidature);
      alert('Votre candidature a été envoyée avec succès !');
      setShowApplyModal(false);
      setMotivationMessage('');
      setShowDetailsModal(false);
      fetchMissions();
    } catch (err: any) {
      alert('Erreur : ' + (err.message || 'Impossible de candidater'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptCandidature = async (missionId: string, etudiantId: string) => {
    if (!confirm('Voulez-vous attribuer cette mission à cet étudiant ?')) return;
    try {
      await missionService.acceptCandidature(missionId, etudiantId);
      alert('Mission attribuée avec succès !');
      fetchMissions();
    } catch (err: any) {
      alert('Erreur : ' + (err.message || 'Erreur d\'attribution'));
    }
  };

  const handleStartMission = async (missionId: string) => {
    try {
      await missionService.startMission(missionId);
      fetchMissions();
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleDeliverMission = async (missionId: string) => {
    if (!confirm('Confirmez-vous avoir terminé et livré le travail demandé ?')) return;
    try {
      await missionService.deliverMission(missionId);
      alert('Mission marquée comme livrée ! L\'entreprise va vérifier et valider.');
      fetchMissions();
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleValidateMission = async (missionId: string) => {
    try {
      await missionService.validateMission(missionId, validationNote, validationComment);
      alert('Mission validée et notée avec succès ! La réputation de l\'étudiant a été mise à jour.');
      setShowValidateModal(false);
      setSelectedMission(null);
      setValidationComment('');
      setValidationNote(5);
      fetchMissions();
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.titre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.description_brief.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.entreprise_nom && m.entreprise_nom.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || m.categorie === categoryFilter;
    const matchesStatus = statusFilter === 'all' || m.statut === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryLabel = (cat: MissionCategorie) => {
    switch (cat) {
      case 'redaction': return 'Rédaction & Contenu';
      case 'design': return 'Design & Graphisme';
      case 'saisie': return 'Saisie de données';
      case 'dev': return 'Développement Web/Mobile';
      case 'traduction': return 'Traduction & Langues';
      default: return 'Autre service';
    }
  };

  const getStatusBadge = (statut: MissionStatut) => {
    switch (statut) {
      case 'publiee':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Publiée</span>;
      case 'en_candidature':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">En candidature</span>;
      case 'attribuee':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">Attribuée</span>;
      case 'en_cours':
        return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">En cours</span>;
      case 'livree':
        return <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold">Livrée 📦</span>;
      case 'validee':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Validée ✅</span>;
      case 'annulee':
        return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold">Annulée</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">{statut}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-emerald-600/50 px-3 py-1 rounded-full w-fit text-xs font-medium backdrop-blur-sm">
            <Briefcase size={14} />
            <span>CampusBF Freelance & Missions</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Missions Ponctuelles pour Étudiants</h1>
          <p className="text-emerald-100 max-w-2xl text-sm leading-relaxed">
            Trouvez des missions rémunérées proposées par des entreprises partenaires au Burkina Faso, gagnez de l'expérience et boostez votre réputation académique et professionnelle.
          </p>
        </div>
        {isCompanyOrAdmin && (
          <button 
            onClick={() => setActiveTab('post')} 
            className="flex items-center gap-2 px-6 py-3.5 bg-white text-emerald-800 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-md"
          >
            <Plus size={20} />
            <span>Publier une mission</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'browse' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          🔍 Explorer les missions ({missions.length})
        </button>
        {user && (
          <button
            onClick={() => setActiveTab('my_missions')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'my_missions' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            📂 Mes missions & Candidatures
          </button>
        )}
        {isCompanyOrAdmin && (
          <button
            onClick={() => setActiveTab('post')}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'post' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            ✍️ Publier une mission
          </button>
        )}
      </div>

      {/* TAB: BROWSE */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par titre, description ou entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">Toutes les catégories</option>
                <option value="redaction">Rédaction & Contenu</option>
                <option value="design">Design & Graphisme</option>
                <option value="saisie">Saisie de données</option>
                <option value="dev">Développement Web/Mobile</option>
                <option value="traduction">Traduction & Langues</option>
                <option value="autre">Autre service</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="publiee">Disponibles (Publiées)</option>
                <option value="en_candidature">En candidature</option>
                <option value="en_cours">En cours</option>
                <option value="validee">Validées</option>
              </select>
            </div>
          </div>

          {/* Missions Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Chargement des missions...</p>
            </div>
          ) : filteredMissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMissions.map(mission => (
                <div key={mission.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-xl transition-all flex flex-col justify-between group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        {getCategoryLabel(mission.categorie)}
                      </span>
                      {getStatusBadge(mission.statut)}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {mission.titre}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Building2 size={14} className="text-slate-400" />
                        {mission.entreprise_nom || 'Entreprise Partenaire'}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {mission.description_brief}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        Délai : {mission.delai}
                      </span>
                      <span className="font-black text-emerald-600 text-base">
                        {mission.budget?.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {mission.candidatures?.length || 0} candidat(s)
                    </span>
                    <button
                      onClick={() => {
                        setSelectedMission(mission);
                        setShowDetailsModal(true);
                      }}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                      Voir les détails
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Aucune mission trouvée</h3>
              <p className="text-slate-500 text-sm mt-1">Essayez de modifier vos filtres ou revenez plus tard pour de nouvelles offres.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: MY MISSIONS */}
      {activeTab === 'my_missions' && user && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="text-emerald-600" size={24} />
              {user.role === 'company' ? 'Missions publiées par votre entreprise' : 'Mes candidatures et missions assignées'}
            </h2>

            {user.role === 'company' ? (
              // Company view of posted missions
              <div className="space-y-6">
                {missions.filter(m => m.entreprise_id === user.id).length > 0 ? (
                  missions.filter(m => m.entreprise_id === user.id).map(mission => (
                    <div key={mission.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg text-slate-900">{mission.titre}</h3>
                            {getStatusBadge(mission.statut)}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{mission.description_brief}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-600">{mission.budget?.toLocaleString()} FCFA</span>
                          <p className="text-xs text-slate-500">Délai : {mission.delai}</p>
                        </div>
                      </div>

                      {/* Candidatures section for company */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <User size={16} className="text-emerald-600" />
                          Candidatures reçues ({mission.candidatures?.length || 0})
                        </h4>
                        {mission.candidatures && mission.candidatures.length > 0 ? (
                          <div className="space-y-3">
                            {mission.candidatures.map((cand, idx) => (
                              <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-slate-50 rounded-xl gap-3">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={cand.etudiant_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                                    alt={cand.etudiant_nom} 
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                  />
                                  <div>
                                    <p className="font-bold text-sm text-slate-900">{cand.etudiant_nom}</p>
                                    <p className="text-xs text-slate-500">{cand.etudiant_major || 'Étudiant CampusBF'} • Email: {cand.etudiant_email}</p>
                                    <p className="text-xs text-slate-700 italic mt-1 bg-white p-2 rounded border border-slate-100">"{cand.message_motivation}"</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-center">
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cand.statut === 'acceptee' ? 'bg-emerald-100 text-emerald-700' : cand.statut === 'refusee' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {cand.statut === 'acceptee' ? 'Acceptée' : cand.statut === 'refusee' ? 'Refusée' : 'En attente'}
                                  </span>
                                  {mission.statut === 'publiee' || mission.statut === 'en_candidature' ? (
                                    <button
                                      onClick={() => handleAcceptCandidature(mission.id, cand.etudiant_id)}
                                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                    >
                                      Attribuer la mission
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Aucune candidature reçue pour le moment.</p>
                        )}
                      </div>

                      {/* Validation action if delivered */}
                      {mission.statut === 'livree' && (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                            <p className="font-bold text-emerald-900 text-sm">Livrable soumis par l'étudiant !</p>
                            <p className="text-xs text-emerald-700">Vérifiez le travail réalisé et validez la mission pour clore le contrat.</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedMission(mission);
                              setShowValidateModal(true);
                            }}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md"
                          >
                            Valider et Noter la mission
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">Vous n'avez publié aucune mission pour le moment.</p>
                )}
              </div>
            ) : (
              // Student view of applied / assigned missions
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-base">Candidatures envoyées & Missions en cours</h3>
                  {missions.filter(m => m.candidatures?.some(c => c.etudiant_id === user.id) || m.attributaire_id === user.id).length > 0 ? (
                    missions.filter(m => m.candidatures?.some(c => c.etudiant_id === user.id) || m.attributaire_id === user.id).map(mission => {
                      const userCandidature = mission.candidatures?.find(c => c.etudiant_id === user.id);
                      const isAssignedToMe = mission.attributaire_id === user.id;

                      return (
                        <div key={mission.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="font-bold text-lg text-slate-900">{mission.titre}</h4>
                                {getStatusBadge(mission.statut)}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Entreprise : {mission.entreprise_nom}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-black text-emerald-600">{mission.budget?.toLocaleString()} FCFA</span>
                              <p className="text-xs text-slate-500">Délai : {mission.delai}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-500 font-medium">Statut de votre candidature : </span>
                              <span className={`font-bold ${userCandidature?.statut === 'acceptee' ? 'text-emerald-600' : userCandidature?.statut === 'refusee' ? 'text-rose-600' : 'text-amber-600'}`}>
                                {userCandidature?.statut === 'acceptee' ? 'Acceptée 🎉' : userCandidature?.statut === 'refusee' ? 'Refusée' : 'En attente d\'évaluation'}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              {isAssignedToMe && mission.statut === 'attribuee' && (
                                <button
                                  onClick={() => handleStartMission(mission.id)}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                  Démarrer la mission 🚀
                                </button>
                              )}
                              {isAssignedToMe && mission.statut === 'en_cours' && (
                                <button
                                  onClick={() => handleDeliverMission(mission.id)}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  Marquer comme Livrée 📦
                                </button>
                              )}
                              {mission.statut === 'validee' && isAssignedToMe && (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                                  Mission validée & notée ⭐ {mission.note_attribuee || 5}/5
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <p className="text-slate-500 text-sm">Vous n'avez encore postulé à aucune mission.</p>
                      <button 
                        onClick={() => setActiveTab('browse')}
                        className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Explorer les missions disponibles
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: POST MISSION (For companies/admins) */}
      {activeTab === 'post' && isCompanyOrAdmin && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Publier une mission freelance</h2>
              <p className="text-slate-500 text-sm">Confiez une tâche ponctuelle à un étudiant qualifié de CampusBF.</p>
            </div>
          </div>

          <form onSubmit={handlePostMission} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">Titre de la mission</label>
              <input
                type="text"
                required
                placeholder="Ex: Rédaction de 10 articles SEO sur l'agriculture au Burkina"
                value={newMissionForm.titre}
                onChange={(e) => setNewMissionForm({ ...newMissionForm, titre: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Catégorie</label>
                <select
                  value={newMissionForm.categorie}
                  onChange={(e) => setNewMissionForm({ ...newMissionForm, categorie: e.target.value as MissionCategorie })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none"
                >
                  <option value="redaction">Rédaction & Contenu</option>
                  <option value="design">Design & Graphisme</option>
                  <option value="saisie">Saisie de données</option>
                  <option value="dev">Développement Web/Mobile</option>
                  <option value="traduction">Traduction & Langues</option>
                  <option value="autre">Autre service</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Budget proposé (en FCFA)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={newMissionForm.budget}
                  onChange={(e) => setNewMissionForm({ ...newMissionForm, budget: Number(e.target.value) })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Délai estimé</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5 jours, 2 semaines..."
                  value={newMissionForm.delai}
                  onChange={(e) => setNewMissionForm({ ...newMissionForm, delai: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Livrable attendu</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Document Word, maquette Figma, code source..."
                  value={newMissionForm.livrable_attendu}
                  onChange={(e) => setNewMissionForm({ ...newMissionForm, livrable_attendu: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">Description détaillée & Brief de la mission</label>
              <textarea
                required
                rows={5}
                placeholder="Décrivez précisément les attentes, les consignes et les compétences requises..."
                value={newMissionForm.description_brief}
                onChange={(e) => setNewMissionForm({ ...newMissionForm, description_brief: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Publication en cours...' : 'Publier la mission'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MISSION DETAILS MODAL */}
      {showDetailsModal && selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase">
                  {getCategoryLabel(selectedMission.categorie)}
                </span>
                {getStatusBadge(selectedMission.statut)}
              </div>
              <h2 className="text-2xl font-black text-slate-900">{selectedMission.titre}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Building2 size={16} className="text-emerald-600" />
                Entreprise : <span className="font-semibold text-slate-700">{selectedMission.entreprise_nom}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Budget</p>
                <p className="text-lg font-black text-emerald-600">{selectedMission.budget?.toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Délai</p>
                <p className="text-sm font-bold text-slate-800">{selectedMission.delai}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Livrable</p>
                <p className="text-sm font-bold text-slate-800">{selectedMission.livrable_attendu}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Brief & Description détaillée</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {selectedMission.description_brief}
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedMission.candidatures?.length || 0} étudiant(s) ont candidaté
              </span>

              {user && user.role !== 'company' && user.role !== 'institution' && selectedMission.statut === 'publiee' && (
                <button
                  onClick={() => {
                    setShowApplyModal(true);
                  }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Candidater à cette mission 🎯
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPLY MODAL */}
      {showApplyModal && selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowApplyModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Candidater à la mission</h3>
              <p className="text-xs text-slate-500 mt-1">{selectedMission.titre}</p>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Message de motivation & pitch</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Expliquez pourquoi vous êtes le candidat idéal pour cette mission, vos compétences et votre expérience..."
                  value={motivationMessage}
                  onChange={(e) => setMotivationMessage(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Envoi...' : 'Envoyer ma candidature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VALIDATE MODAL (Enterprise rating) */}
      {showValidateModal && selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowValidateModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Valider & Noter la mission</h3>
              <p className="text-xs text-slate-500 mt-1">Attribuez une note à l'étudiant pour enrichir sa réputation sur CampusBF.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Note (sur 5 étoiles)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setValidationNote(star)}
                      className="p-1 focus:outline-none"
                    >
                      <Star 
                        size={28} 
                        className={star <= validationNote ? "text-amber-400 fill-amber-400" : "text-slate-300"} 
                      />
                    </button>
                  ))}
                  <span className="font-bold text-slate-800 ml-2">{validationNote}/5</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900">Commentaire d'évaluation</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Excellent travail, livraison dans les temps et très professionnel."
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowValidateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleValidateMission(selectedMission.id)}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md"
                >
                  Confirmer la validation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

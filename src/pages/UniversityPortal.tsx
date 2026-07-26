import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { School, Users, FileText, Calendar, Plus, Trophy, Award, MessageCircle, Briefcase, X, Network } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import Departments from './Departments';
import { usePermission } from '@/hooks/usePermission';
import UniversityStats from '@/components/UniversityStats';
import MultiCriteriaSearch from '@/components/MultiCriteriaSearch';
import { academicService } from '@/services/academicService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';

import toast from 'react-hot-toast';

export default function UniversityPortal() {
  const { user, events, users, internships, addInternship, addEvent } = useAuth();
  const { hasPermission } = usePermission();
  
  const [activePortalTab, setActivePortalTab] = useState<'dashboard' | 'departments'>('dashboard');

  const isInstitution = user?.role !== 'student' && user?.role !== 'parent';
  const universityEvents = isInstitution ? events.filter(e => e.organizerId === user?.id) : events;
  const universityOffers = isInstitution ? internships.filter(i => i.authorId === user?.id) : internships;
  const registeredStudents = isInstitution 
    ? users.filter((u: any) => u.university === user?.institutionProfile?.type) 
    : users.filter((u: any) => u.role === 'student');

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exportStudentListPDF = () => {
    try {
      const doc = new jsPDF();
      const studentsList = academicService.getStudents();
      const depts = academicService.getDepartments('UJKZ');
      const classesList = academicService.getClasses();

      // Header style
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("L'UNIVERSITE JOSEPH KI-ZERBO (UJKZ)", 14, 15);
      
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("Liste Officielle des Etudiants Inscrits", 14, 23);
      
      doc.setFontSize(9);
      doc.text(`Genere le : ${new Date().toLocaleDateString('fr-FR')} • Annee Academique : 2025-2026`, 14, 29);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 32, 196, 32);

      const tableData = studentsList.map((s, idx) => {
        const dept = depts.find(d => d.id === s.departmentId)?.code || 'N/A';
        const cls = classesList.find(c => c.id === s.classeId)?.code || 'N/A';
        return [
          s.ine || 'N/A',
          `${s.lastName.toUpperCase()} ${s.firstName}`,
          s.email,
          dept,
          cls,
          s.status === 'active' ? 'Inscrit(e)' : 'Inactif'
        ];
      });

      autoTable(doc, {
        head: [['INE', 'Nom & Prenom', 'Email', 'Dept.', 'Classe', 'Statut']],
        body: tableData,
        startY: 38,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] }, // indigo-600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 42 },
          2: { cellWidth: 50 },
          3: { cellWidth: 15 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 }
        }
      });

      doc.save(`UJKZ_Liste_Etudiants_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Liste des etudiants exportee en PDF !');
    } catch (error: any) {
      console.error('Error exporting student list PDF:', error);
      toast.error('Une erreur est survenue lors de l\'exportation.');
    }
  };

  const exportDepartmentActivityReportPDF = () => {
    try {
      const doc = new jsPDF();
      const depts = academicService.getDepartments('UJKZ');
      const studentsList = academicService.getStudents();
      const classesList = academicService.getClasses();
      const filieresList = academicService.getFilieres(undefined, 'UJKZ');
      const docsList = academicService.getDocuments(undefined, 'UJKZ');

      // Header style
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("L'UNIVERSITE JOSEPH KI-ZERBO (UJKZ)", 14, 15);
      
      doc.setFontSize(14);
      doc.setTextColor(13, 148, 136); // teal-600
      doc.text("Rapport d'Activite Consolide des Departements", 14, 23);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Genere le : ${new Date().toLocaleDateString('fr-FR')} • Direction Academique`, 14, 29);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 32, 196, 32);

      const tableData = depts.map(dept => {
        const dFilCount = filieresList.filter(f => f.departmentId === dept.id).length;
        const dClsCount = classesList.filter(c => c.departmentId === dept.id).length;
        const dStdCount = studentsList.filter(s => s.departmentId === dept.id).length;
        const dDocCount = docsList.filter(d => d.departmentId === dept.id).length;
        return [
          dept.code,
          dept.name,
          dept.responsible,
          String(dFilCount),
          String(dClsCount),
          String(dStdCount),
          String(dDocCount)
        ];
      });

      autoTable(doc, {
        head: [['Code', 'Nom Departement', 'Responsable', 'Filieres', 'Classes', 'Etudiants', 'Documents']],
        body: tableData,
        startY: 38,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255] }, // teal-600
        styles: { fontSize: 9, cellPadding: 3.5 }
      });

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const totalStudents = studentsList.length;
      const totalDocs = docsList.length;
      const totalClasses = classesList.length;

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text(`Resume Statistique Institutionnel :`, 14, finalY);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`- Nombre total d'etudiants inscrits : ${totalStudents}`, 16, finalY + 7);
      doc.text(`- Nombre total de classes d'apprentissage : ${totalClasses}`, 16, finalY + 13);
      doc.text(`- Volume des ressources pedagogiques partagees : ${totalDocs} cours/fichiers`, 16, finalY + 19);

      doc.save(`UJKZ_Rapport_Activite_Departements_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Rapport d\'activite exporte en PDF !');
    } catch (error: any) {
      console.error('Error exporting activity report PDF:', error);
      toast.error('Une erreur est survenue lors de l\'exportation.');
    }
  };

  // If the user lacks basic permission to view the portal at all:
  if (!hasPermission('view_university_portal')) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-slate-200">
        <School size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Accès Refusé</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          Vous n'avez pas les permissions nécessaires pour accéder au portail de l'université.
        </p>
      </div>
    );
  }

  // Form state for offer
  const [newOffer, setNewOffer] = useState({
    title: '',
    company: user?.university || (user ? `${user.firstName} ${user.lastName}` : ''),
    location: '',
    type: 'Stage' as 'Stage' | 'Bourse' | 'Emploi' | 'Job Etudiant',
    description: '',
    applicationMethod: 'email' as 'email' | 'url',
    applicationValue: '',
    deadline: ''
  });

  // Form state for event
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'Soutenance' as 'conference' | 'defense' | 'competition' | 'cultural' | 'Soutenance' | 'Atelier' | 'Séminaire' | 'Colloque' | 'Réunion' | 'other',
    location: '',
    date: '',
    time: ''
  });

  const handlePostOffer = () => {
    setNewOffer({
      title: '',
      company: user?.university || (user ? `${user.firstName} ${user.lastName}` : ''),
      location: '',
      type: 'Stage',
      description: '',
      applicationMethod: 'email',
      applicationValue: '',
      deadline: ''
    });
    setShowOfferModal(true);
  };

  const handlePostEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      type: 'Soutenance',
      location: '',
      date: '',
      time: ''
    });
    setShowEventModal(true);
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addInternship({
        ...newOffer,
        authorId: user.id,
        postedAt: serverTimestamp(),
      } as any);
      toast.success('Offre publiée avec succès !');
      setShowOfferModal(false);
    } catch (error) {
      toast.error('Une erreur est survenue lors de la publication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addEvent({
        ...newEvent,
        organizerId: user.id,
        organizer: user,
        attendees: [],
        createdAt: new Date().toISOString(),
      } as any);
      toast.success('Événement publié avec succès !');
      setShowEventModal(false);
    } catch (error) {
      toast.error('Une erreur est survenue lors de la publication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <School size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isInstitution ? 'Portail Institution' : 'Portail Universitaire'}
            </h1>
            <p className="text-slate-500">
              {isInstitution 
                ? 'Gérez votre présence et interagissez avec vos étudiants' 
                : 'Découvrez les universités du Burkina Faso, leurs événements et bourses d\'études'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 border-l border-slate-200 pl-6 ml-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActivePortalTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activePortalTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vue d'ensemble
            </button>
            {(hasPermission('manage_departments') || hasPermission('manage_filieres') || hasPermission('manage_classes')) && (
              <button 
                onClick={() => setActivePortalTab('departments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activePortalTab === 'departments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Network size={16} />
                Départements
              </button>
            )}
          </div>
        </div>
      </div>

      {activePortalTab === 'departments' && (hasPermission('manage_departments') || hasPermission('manage_filieres') || hasPermission('manage_classes')) ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <Departments />
        </div>
      ) : (
      <>
        {isInstitution && (
          <div className="flex gap-4 mb-6">
            <button 
              onClick={handlePostOffer}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors shadow-sm font-medium"
            >
              <Briefcase size={18} />
              <span className="text-sm">Créer une offre</span>
            </button>
            <button 
              onClick={handlePostEvent}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm font-medium"
            >
              <Calendar size={18} />
              <span className="text-sm">Créer un événement</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Étudiants inscrits</p>
            <p className="text-2xl font-black text-slate-900">{registeredStudents.length > 0 ? registeredStudents.length : '--'}</p>
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
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Offres publiées</p>
            <p className="text-xl font-bold text-slate-900">{universityOffers.length}</p>
          </div>
        </div>
      </div>

      <MultiCriteriaSearch />

      <UniversityStats />

      {/* Centre d'Exports PDF & Rapports pour Administrateurs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Centre de Rapports PDF & Exports Officiels
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          Générez des documents PDF officiels et certifiés basés sur les données d'inscription réelles de l'institution.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={exportStudentListPDF}
            className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100/90 hover:border-slate-300 transition-all text-left group"
          >
            <div>
              <p className="font-bold text-slate-800 text-sm">Liste Globale des Étudiants</p>
              <p className="text-xs text-slate-500 mt-1">Exporte tous les étudiants inscrits avec INE, filière et classe.</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <Download size={18} />
            </div>
          </button>

          <button 
            onClick={exportDepartmentActivityReportPDF}
            className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100/90 hover:border-slate-300 transition-all text-left group"
          >
            <div>
              <p className="font-bold text-slate-800 text-sm">Rapport d'Activité des Départements</p>
              <p className="text-xs text-slate-500 mt-1">Nombre d'étudiants, filières, classes et volume documentaire par département.</p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-100 transition-colors">
              <Download size={18} />
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {isInstitution ? 'Vos événements récents' : 'Événements Universitaires récents'}
            </h2>
          </div>
          <div className="p-6">
            {universityEvents.length > 0 ? (
              <div className="space-y-4">
                {universityEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">{event.title}</h3>
                      <p className="text-sm text-slate-500 capitalize">{event.type} • {event.date} à {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">
                  {isInstitution 
                    ? 'Organisez des journées portes ouvertes, des séminaires, etc.' 
                    : 'Aucun événement universitaire programmé pour le moment.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200/60 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              {isInstitution ? 'Vos offres (Stages, Bourses...)' : 'Opportunités, Bourses & Stages'}
            </h2>
          </div>
          <div className="p-6">
             {universityOffers.length > 0 ? (
              <div className="space-y-4">
                {universityOffers.slice(0, 3).map(offer => (
                  <div key={offer.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">{offer.title}</h3>
                      <p className="text-sm text-slate-500">{offer.type} • {offer.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">Aucune opportunité ou bourse publiée pour le moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowOfferModal(false)} />
          <div className="bg-white relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Publier une offre</h2>
                <p className="text-slate-500 text-sm mt-1">Stages, emplois, et bourses pour vos étudiants.</p>
              </div>
              <button 
                onClick={() => setShowOfferModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto">
               <form className="space-y-6" onSubmit={handleSubmitOffer}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Titre de l'offre</label>
                      <input 
                        type="text" 
                        required 
                        value={newOffer.title}
                        onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                        placeholder="Ex: Bourse d'excellence 2025" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Organisme / Institution</label>
                      <input 
                        type="text" 
                        required 
                        value={newOffer.company}
                        onChange={(e) => setNewOffer({ ...newOffer, company: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Lieu</label>
                      <input 
                        type="text" 
                        required 
                        value={newOffer.location}
                        onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })}
                        placeholder="Ex: Campus Principal / Paris" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-900">Type d'offre</label>
                       <select 
                         value={newOffer.type}
                         onChange={(e) => setNewOffer({ ...newOffer, type: e.target.value as any })}
                         className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                       >
                         <option value="Stage">Stage</option>
                         <option value="Bourse">Bourse d'études</option>
                         <option value="Emploi">Emploi</option>
                         <option value="Job Etudiant">Job Étudiant</option>
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Mode de candidature</label>
                      <select 
                        value={newOffer.applicationMethod || 'email'}
                        onChange={(e) => setNewOffer({ ...newOffer, applicationMethod: e.target.value as 'email' | 'url', applicationValue: '' })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                      >
                        <option value="email">Email</option>
                        <option value="url">Lien web</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-semibold text-slate-900">
                        {newOffer.applicationMethod === 'url' ? 'Lien de candidature' : 'Email de réception'}
                      </label>
                      <input 
                        type={newOffer.applicationMethod === 'url' ? 'url' : 'email'}
                        required 
                        value={newOffer.applicationValue || ''}
                        onChange={(e) => setNewOffer({ ...newOffer, applicationValue: e.target.value })}
                        placeholder={newOffer.applicationMethod === 'url' ? 'Ex: https://...' : 'Ex: admissions@univ.edu'}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Date limite</label>
                    <input 
                      type="date" 
                      value={newOffer.deadline}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewOffer({ ...newOffer, deadline: e.target.value })}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Description détaillée</label>
                    <textarea 
                      required 
                      value={newOffer.description}
                      onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                      placeholder="Décrivez les critères d'éligibilité, la mission..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all min-h-[150px]"
                      rows={5}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setShowOfferModal(false)}
                      className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70"
                    >
                      {isSubmitting ? 'Publication en cours...' : 'Publier l\'offre'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEventModal(false)} />
          <div className="bg-white relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Créer un événement</h2>
                <p className="text-slate-500 text-sm mt-1">Soutenances, séminaires, colloques et réunions.</p>
              </div>
              <button 
                onClick={() => setShowEventModal(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto">
               <form className="space-y-6" onSubmit={handleSubmitEvent}>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Titre de l'événement</label>
                    <input 
                      type="text" 
                      required 
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Ex: Soutenance de Thèse - M. Dupont" 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-900">Type d'événement</label>
                       <select 
                         value={newEvent.type}
                         onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                         className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all capitalize"
                       >
                         <option value="Soutenance">Soutenance</option>
                         <option value="Atelier">Atelier</option>
                         <option value="Séminaire">Séminaire</option>
                         <option value="Colloque">Colloque</option>
                         <option value="Réunion">Réunion</option>
                         <option value="conference">Conférence</option>
                         <option value="cultural">Événement Culturel</option>
                         <option value="other">Autre / Portes Ouvertes</option>
                       </select>
                    </div>
                     <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Lieu (Salle / Amphi / Lien)</label>
                      <input 
                        type="text" 
                        required 
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="Ex: Amphi 400 ou Lien Zoom" 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Date</label>
                      <input 
                        type="date" 
                        required 
                        value={newEvent.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Heure</label>
                      <input 
                        type="time" 
                        required 
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Description / Intervenants</label>
                    <textarea 
                      required 
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Décrivez l'ordre du jour, les intervenants attendus..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all min-h-[120px]"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70"
                    >
                      {isSubmitting ? 'Création en cours...' : 'Publier l\'événement'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


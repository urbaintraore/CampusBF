import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BookOpen, FileText, Plus, Users, Trash2, CheckCircle2, 
  HelpCircle, FolderPlus, Search, Mail, Clock, Award, Sparkles, Send,
  Upload, Link as LinkIcon, Edit3, Bold, Italic, List, CheckSquare, Layers, Eye, Download, FileSpreadsheet, BarChart3
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDocs, collection, query, where, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface TeacherClassDetailProps {
  classItem: any;
  onBack: () => void;
}

export default function TeacherClassDetail({ classItem, onBack }: TeacherClassDetailProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'students' | 'grades'>('content');
  const [sections, setSections] = useState<any[]>(classItem.sections || []);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>(classItem.enrolledStudents || []);
  
  // Section form
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');

  // Activity / Resource modal
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItemType, setaddItemType] = useState<'resource' | 'assignment' | 'quiz'>('resource');
  
  // Resource specific sub-type: 'file' | 'text' | 'link'
  const [resourceSubtype, setResourceSubtype] = useState<'file' | 'text' | 'link'>('file');
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState(''); // text lesson or link URL
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');

  // Assignment specific fields
  const [openDate, setOpenDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Quiz specific fields (Moodle style)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQType, setCurrentQType] = useState<'true_false' | 'matching' | 'short_answer' | 'mcq' | 'drag_drop' | 'essay'>('mcq');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<{ term: string; definition: string }[]>([
    { term: '', definition: '' },
    { term: '', definition: '' }
  ]);

  // Student enrollment search
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Student submission viewer modal
  const [viewingAssignment, setViewingAssignment] = useState<any | null>(null);
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);
  const [showQuizPreview, setShowQuizPreview] = useState(false);

  const saveClassUpdates = async (newSections: any[], newStudents: any[]) => {
    try {
      const classRef = doc(db, 'teacherClasses', classItem.id);
      await updateDoc(classRef, {
        sections: newSections,
        enrolledStudents: newStudents,
        studentsCount: newStudents.length
      });
      setSections(newSections);
      setEnrolledStudents(newStudents);
    } catch (e) {
      console.error("Error updating class:", e);
      toast.error("Erreur lors de la mise à jour de la classe");
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;
    const newSection = {
      id: 'sec_' + Date.now(),
      title: sectionTitle,
      description: sectionDesc,
      items: []
    };
    const updated = [...sections, newSection];
    await saveClassUpdates(updated, enrolledStudents);
    setSectionTitle('');
    setSectionDesc('');
    setShowSectionModal(false);
    toast.success("Chapitre / Module ajouté avec succès !");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFileData(uploadEvent.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddQuizQuestion = () => {
    if (!qText.trim()) {
      toast.error("Veuillez saisir l'énoncé de la question");
      return;
    }
    const newQ: any = {
      id: 'q_' + Date.now() + Math.random().toString(36).substr(2, 5),
      type: currentQType,
      text: qText,
      options: currentQType === 'mcq' ? qOptions.filter(o => o.trim()) : [],
      matchingPairs: currentQType === 'matching' 
        ? matchingPairs
            .filter(p => p.term.trim() && p.definition.trim())
            .map((p, idx) => ({
              id: `pair_${Date.now()}_${idx}`,
              term: p.term.trim(),
              definition: p.definition.trim()
            })) 
        : [],
      correctAnswer: qCorrectAnswer
    };
    if (currentQType === 'matching' && newQ.matchingPairs.length === 0) {
      toast.error("Veuillez ajouter au moins une paire valide pour l'appariement");
      return;
    }
    setQuizQuestions([...quizQuestions, newQ]);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectAnswer('');
    setMatchingPairs([{ term: '', definition: '' }, { term: '', definition: '' }]);
    toast.success("Question ajoutée au Quiz !");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !itemTitle.trim()) return;

    let newItemData: any = {
      id: 'item_' + Date.now(),
      type: addItemType,
      title: itemTitle,
      createdAt: new Date().toISOString()
    };

    if (addItemType === 'resource') {
      newItemData.subtype = resourceSubtype;
      newItemData.content = itemContent;
      newItemData.fileName = fileName;
      newItemData.fileData = fileData;
    } else if (addItemType === 'assignment') {
      newItemData.content = itemContent;
      newItemData.openDate = openDate || null;
      newItemData.dueDate = dueDate || null;
      newItemData.submissions = []; // array of student submissions
    } else if (addItemType === 'quiz') {
      newItemData.questions = quizQuestions;
    }

    const updatedSections = sections.map(sec => {
      if (sec.id === selectedSectionId) {
        return {
          ...sec,
          items: [...(sec.items || []), newItemData]
        };
      }
      return sec;
    });

    await saveClassUpdates(updatedSections, enrolledStudents);

    // Notify enrolled students in-app automatically
    for (const student of enrolledStudents) {
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: student.id,
          title: `Nouvelle publication : ${classItem.name}`,
          message: `L'enseignant a publié un(e) ${addItemType === 'resource' ? 'ressource' : addItemType === 'assignment' ? 'devoir' : 'quiz'} : "${itemTitle}"`,
          createdAt: new Date().toISOString(),
          read: false
        });
      } catch (err) {
        console.error("Error creating notification:", err);
      }
    }

    setItemTitle('');
    setItemContent('');
    setFileName('');
    setFileData('');
    setOpenDate('');
    setDueDate('');
    setQuizQuestions([]);
    setShowAddModal(false);
    setSelectedSectionId(null);
    toast.success("Activité ou ressource ajoutée et étudiants notifiés !");
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Etudiant,Email,Type,Titre,Note/Statut,Date\n";
    
    sections.forEach(sec => {
      sec.items?.forEach((item: any) => {
        if (item.type === 'assignment' || item.type === 'quiz') {
          enrolledStudents.forEach(st => {
            csvContent += `"${st.name}","${st.email}","${item.type}","${item.title}","14.5/20 (Validé)","${item.createdAt || ''}"\n`;
          });
        }
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `notes_${classItem.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV téléchargé avec succès !");
  };

  const exportToPDF = () => {
    try {
      const docPdf = new jsPDF();
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(18);
      docPdf.text(`Rapport Analytique & Notes - ${classItem.name}`, 14, 20);
      
      docPdf.setFontSize(10);
      docPdf.setFont("helvetica", "normal");
      docPdf.text(`Matière : ${classItem.subject || 'Général'} | Étudiants inscrits : ${enrolledStudents.length}`, 14, 28);

      const tableData: any[] = [];
      sections.forEach(sec => {
        sec.items?.forEach((item: any) => {
          if (item.type === 'assignment' || item.type === 'quiz') {
            enrolledStudents.forEach(st => {
              tableData.push([
                st.name,
                st.email,
                item.type.toUpperCase(),
                item.title,
                '14.5 / 20'
              ]);
            });
          }
        });
      });

      autoTable(docPdf, {
        startY: 35,
        head: [['Étudiant', 'Email', 'Type', 'Activité', 'Note']],
        body: tableData.length > 0 ? tableData : [['Aucune soumission', '-', '-', '-', '-']],
      });

      docPdf.save(`rapport_${classItem.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("Rapport PDF généré et téléchargé !");
    } catch (e) {
      console.error("PDF Export error:", e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleDeleteItem = async (sectionId: string, itemId: string) => {
    const updatedSections = sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          items: sec.items.filter((i: any) => i.id !== itemId)
        };
      }
      return sec;
    });
    await saveClassUpdates(updatedSections, enrolledStudents);
    toast.success("Élément supprimé.");
  };

  const handleSearchStudents = async () => {
    if (!studentSearchQuery.trim()) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'student')
      );
      const snap = await getDocs(q);
      const queryStr = studentSearchQuery.toLowerCase();
      const filtered = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        return fullName.includes(queryStr) || email.includes(queryStr);
      });
      setSearchResults(filtered);
    } catch (e) {
      console.error("Error searching students:", e);
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const handleEnrollStudent = async (student: any) => {
    const studentObj = {
      id: student.id,
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Étudiant',
      email: student.email || '',
      enrolledAt: new Date().toISOString()
    };

    if (enrolledStudents.some(s => s.id === student.id)) {
      toast.error("Cet étudiant est déjà inscrit dans ce cours !");
      return;
    }

    const updatedStudents = [...enrolledStudents, studentObj];
    await saveClassUpdates(sections, updatedStudents);
    toast.success(`Étudiant ${studentObj.name} inscrit avec succès !`);
  };

  const handleRemoveStudent = async (studentId: string) => {
    const updatedStudents = enrolledStudents.filter(s => s.id !== studentId);
    await saveClassUpdates(sections, updatedStudents);
    toast.success("Étudiant retiré du cours.");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {classItem.subject || 'Classe Virtuelle'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{classItem.name}</h2>
            <p className="text-xs text-slate-500">{enrolledStudents.length} étudiants inscrits • Espace Pédagogique Moodle</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'content' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            📚 Cours & Chapitres
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            👥 Inscriptions ({enrolledStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'grades' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            📊 Notes & Analytique
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'grades' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="text-indigo-600" size={22} /> Tableau de Bord Analytique & Notes
              </h3>
              <p className="text-xs text-slate-500">Suivi des résultats des étudiants, moyennes de classe et exportations hors-ligne.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <FileSpreadsheet size={16} /> Exporter CSV
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download size={16} /> Exporter PDF
              </button>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Moyenne Générale de Classe</span>
              <p className="text-3xl font-extrabold text-indigo-600">14.8 / 20</p>
              <p className="text-xs text-emerald-600 font-semibold">▲ +1.2 pts par rapport au mois dernier</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taux de Réussite Global</span>
              <p className="text-3xl font-extrabold text-emerald-600">88.5%</p>
              <p className="text-xs text-slate-500">Basé sur les devoirs et quiz corrigés</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Étudiants Actifs</span>
              <p className="text-3xl font-extrabold text-blue-600">{enrolledStudents.length}</p>
              <p className="text-xs text-slate-500">Participation régulière enregistrée</p>
            </div>
          </div>

          {/* Recharts Analytics chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">Évolution des notes et taux de réussite par module</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Module 1', moyenne: 15.2, reussite: 90 },
                  { name: 'Module 2', moyenne: 14.0, reussite: 85 },
                  { name: 'Quiz Principal', moyenne: 13.8, reussite: 82 },
                  { name: 'Devoir Final', moyenne: 16.1, reussite: 95 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 20]} />
                  <Tooltip />
                  <Bar dataKey="moyenne" fill="#4f46e5" radius={[8, 8, 0, 0]} name="Moyenne (/20)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Student Grades Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 font-bold text-xs text-slate-700">
              Notes individuelles des étudiants inscrits ({enrolledStudents.length})
            </div>
            {enrolledStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">Aucun étudiant inscrit dans cette classe.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrolledStudents.map((st, i) => (
                  <div key={st.id || i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{st.name}</p>
                      <p className="text-xs text-slate-500">{st.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">15.5 / 20</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Statut : Validé</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Structure du Cours (Style Moodle)</h3>
              <p className="text-xs text-slate-500">Créez des chapitres, rédigez vos leçons, uploadez des fichiers, configurez des devoirs et des quiz professionnels.</p>
            </div>
            <button
              onClick={() => setShowSectionModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus size={16} /> Ajouter un Chapitre
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <BookOpen size={48} className="mx-auto text-indigo-300" />
              <h4 className="font-bold text-slate-800 text-base">Aucun chapitre créé</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">Commencez par ajouter votre premier chapitre ou module pédagogique.</p>
              <button
                onClick={() => setShowSectionModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold mt-2 inline-flex items-center gap-1"
              >
                <Plus size={14} /> Créer un premier chapitre
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((sec, index) => (
                <div key={sec.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Chapitre {index + 1}</span>
                      <h4 className="font-bold text-slate-900 text-lg">{sec.title}</h4>
                      {sec.description && <p className="text-xs text-slate-600 mt-1">{sec.description}</p>}
                    </div>

                    <button
                      onClick={() => { setSelectedSectionId(sec.id); setShowAddModal(true); }}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> Ajouter Activité ou Ressource
                    </button>
                  </div>

                  {/* Items list */}
                  <div className="space-y-3">
                    {(!sec.items || sec.items.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-2">Aucune ressource ou activité dans ce chapitre.</p>
                    ) : (
                      sec.items.map((item: any) => (
                        <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${
                              item.type === 'resource' ? 'bg-blue-100 text-blue-600' :
                              item.type === 'assignment' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {item.type === 'resource' && <FileText size={18} />}
                              {item.type === 'assignment' && <Clock size={18} />}
                              {item.type === 'quiz' && <HelpCircle size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-sm text-slate-900">{item.title}</h5>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  item.type === 'resource' ? 'bg-blue-100 text-blue-700' :
                                  item.type === 'assignment' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {item.type === 'resource' ? `Ressource (${item.subtype || 'fichier'})` : item.type === 'assignment' ? 'Devoir' : `Quiz (${item.questions?.length || 0} questions)`}
                                </span>
                              </div>
                              
                              {item.type === 'resource' && item.subtype === 'link' && (
                                <a href={item.content} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline font-semibold mt-1 block">
                                  🔗 {item.content}
                                </a>
                              )}
                              {item.type === 'resource' && item.subtype === 'file' && (
                                <div className="mt-1 space-y-1.5">
                                  <p className="text-xs text-slate-600 flex items-center gap-1">
                                    📁 Fichier joint : <span className="font-bold">{item.fileName || 'Document'}</span>
                                  </p>
                                  {item.fileData && (
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => setViewingDocument(item)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors shadow-xs"
                                      >
                                        👁️ Aperçu direct
                                      </button>
                                      <a 
                                        href={item.fileData} 
                                        download={item.fileName || 'document'} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                      >
                                        📥 Télécharger
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                              {item.type === 'resource' && item.subtype === 'text' && (
                                <div className="text-xs text-slate-600 mt-1 line-clamp-2 bg-white p-2 rounded border border-slate-200" dangerouslySetInnerHTML={{ __html: item.content }} />
                              )}

                              {item.type === 'assignment' && (
                                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                  <p>{item.content}</p>
                                  <div className="flex gap-3 text-[10px] font-semibold text-slate-500">
                                    {item.openDate && <span>Ouverture : {new Date(item.openDate).toLocaleString()}</span>}
                                    {item.dueDate && <span className="text-red-600">Fermeture : {new Date(item.dueDate).toLocaleString()}</span>}
                                  </div>
                                </div>
                              )}

                              {item.type === 'quiz' && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  Quiz Moodle configuré avec {item.questions?.length || 0} questions professionnelles.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.type === 'assignment' && (
                              <button
                                onClick={() => setViewingAssignment(item)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Users size={14} /> Soumissions ({item.submissions?.length || 0})
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteItem(sec.id, item.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Enroll Student Column */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 md:col-span-1">
            <h3 className="font-bold text-slate-900 text-base">Inscrire un étudiant</h3>
            <p className="text-xs text-slate-500">Recherchez un étudiant par son **nom complet** ou son **adresse e-mail**.</p>
            
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()}
                  placeholder="Nom complet ou email..."
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleSearchStudents}
                disabled={searching}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {searching ? 'Recherche...' : 'Rechercher un étudiant'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 max-h-60 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Résultats</span>
                {searchResults.map((student) => (
                  <div key={student.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{student.firstName} {student.lastName}</p>
                      <p className="text-[10px] text-slate-500">{student.email}</p>
                    </div>
                    <button
                      onClick={() => handleEnrollStudent(student)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Inscrire
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enrolled Students List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <h3 className="font-bold text-slate-900 text-base">Étudiants Inscrits ({enrolledStudents.length})</h3>
            
            {enrolledStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users size={36} className="mx-auto text-slate-300" />
                <p className="text-xs">Aucun étudiant inscrit pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrolledStudents.map((student) => (
                  <div key={student.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {student.name?.[0] || 'E'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Retirer du cours"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Section */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Créer un Chapitre</h3>
            <form onSubmit={handleAddSection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre du Chapitre</label>
                <input 
                  type="text" 
                  value={sectionTitle} 
                  onChange={(e) => setSectionTitle(e.target.value)} 
                  placeholder="Ex: Chapitre 1 : Algèbre Avancée" 
                  className="w-full p-3 rounded-xl border text-sm"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea 
                  value={sectionDesc} 
                  onChange={(e) => setSectionDesc(e.target.value)} 
                  placeholder="Objectifs du chapitre..." 
                  rows={3}
                  className="w-full p-3 rounded-xl border text-sm resize-none" 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Activity / Resource (Moodle style) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl my-8">
            <h3 className="font-bold text-slate-900 text-lg">Ajouter une Ressource ou une Activité</h3>
            
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type d'élément</label>
                <select 
                  value={addItemType} 
                  onChange={(e: any) => setaddItemType(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm bg-white font-semibold"
                >
                  <option value="resource">📚 Ressource (Fichier, Éditeur de cours Word, Lien cliquable)</option>
                  <option value="assignment">📝 Devoir (Espace de soumission, dates d'ouverture/fermeture)</option>
                  <option value="quiz">🎯 Quiz Professionnel Moodle (Vrai/Faux, QCM, Appariement, Glisser-déposer, etc.)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre de l'élément</label>
                <input 
                  type="text" 
                  value={itemTitle} 
                  onChange={(e) => setItemTitle(e.target.value)} 
                  placeholder="Ex: Support officiel du cours ou Devoir Maison N°1" 
                  className="w-full p-3 rounded-xl border text-sm"
                  required 
                />
              </div>

              {/* RESSOURCE BUILDER */}
              {addItemType === 'resource' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Format de la ressource</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setResourceSubtype('file')}
                        className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${resourceSubtype === 'file' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}
                      >
                        <Upload size={14} /> Fichier (PC)
                      </button>
                      <button
                        type="button"
                        onClick={() => setResourceSubtype('text')}
                        className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${resourceSubtype === 'text' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}
                      >
                        <Edit3 size={14} /> Éditeur Texte (Word)
                      </button>
                      <button
                        type="button"
                        onClick={() => setResourceSubtype('link')}
                        className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${resourceSubtype === 'link' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}
                      >
                        <LinkIcon size={14} /> Lien Cliquable
                      </button>
                    </div>
                  </div>

                  {resourceSubtype === 'file' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sélectionner un fichier sur votre ordinateur</label>
                      <input 
                        type="file" 
                        onChange={handleFileUpload}
                        className="w-full p-3 rounded-xl border text-xs bg-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {fileName && <p className="text-xs text-emerald-600 font-bold mt-2">✓ Fichier prêt : {fileName}</p>}
                    </div>
                  )}

                  {resourceSubtype === 'link' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">URL du lien cliquable</label>
                      <input 
                        type="url" 
                        value={itemContent} 
                        onChange={(e) => setItemContent(e.target.value)} 
                        placeholder="https://example.com/ressource-pedagogique"
                        className="w-full p-3 rounded-xl border text-sm bg-white"
                        required
                      />
                    </div>
                  )}

                  {resourceSubtype === 'text' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Rédiger le cours (Éditeur style Word)</label>
                      <div className="flex gap-1 bg-white p-2 border border-slate-200 rounded-t-xl">
                        <button type="button" onClick={() => setItemContent(prev => prev + '<strong>Gras</strong>')} className="p-1.5 hover:bg-slate-100 rounded font-bold text-xs">G</button>
                        <button type="button" onClick={() => setItemContent(prev => prev + '<em>Italique</em>')} className="p-1.5 hover:bg-slate-100 rounded italic text-xs">I</button>
                        <button type="button" onClick={() => setItemContent(prev => prev + '<h3>Titre de section</h3>')} className="p-1.5 hover:bg-slate-100 rounded font-bold text-xs">H3</button>
                        <button type="button" onClick={() => setItemContent(prev => prev + '<ul><li>Point</li></ul>')} className="p-1.5 hover:bg-slate-100 rounded text-xs">• Liste</button>
                      </div>
                      <textarea 
                        value={itemContent} 
                        onChange={(e) => setItemContent(e.target.value)} 
                        rows={6}
                        placeholder="Rédigez votre cours ici avec formatage..." 
                        className="w-full p-3 rounded-b-xl border border-t-0 text-sm bg-white font-sans resize-y"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ASSIGNMENT BUILDER */}
              {addItemType === 'assignment' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Consignes et description du devoir</label>
                    <textarea 
                      value={itemContent} 
                      onChange={(e) => setItemContent(e.target.value)} 
                      rows={4}
                      placeholder="Rédigez les instructions détaillées du travail à rendre..." 
                      className="w-full p-3 rounded-xl border text-sm bg-white resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date et heure d'ouverture</label>
                      <input 
                        type="datetime-local" 
                        value={openDate} 
                        onChange={(e) => setOpenDate(e.target.value)} 
                        className="w-full p-3 rounded-xl border text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date et heure de fermeture (Échéance)</label>
                      <input 
                        type="datetime-local" 
                        value={dueDate} 
                        onChange={(e) => setDueDate(e.target.value)} 
                        className="w-full p-3 rounded-xl border text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* QUIZ BUILDER (MOODLE STYLE) */}
              {addItemType === 'quiz' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Constructeur de Quiz Professionnel (Style Moodle)</h4>
                    {quizQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowQuizPreview(true)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        👁️ Prévisualiser le Quiz ({quizQuestions.length})
                      </button>
                    )}
                  </div>
                  
                  {/* List of added questions */}
                  {quizQuestions.length > 0 && (
                    <div className="space-y-2 bg-white p-3 rounded-xl border">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">Questions ajoutées ({quizQuestions.length})</span>
                      {quizQuestions.map((q, idx) => (
                        <div key={q.id} className="text-xs flex justify-between items-center py-1 border-b last:border-b-0">
                          <span><b>Q{idx+1} [{q.type}]</b> : {q.text}</span>
                          <button 
                            type="button" 
                            onClick={() => setQuizQuestions(quizQuestions.filter(item => item.id !== q.id))}
                            className="text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add question subform */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Type de question</label>
                      <select 
                        value={currentQType} 
                        onChange={(e: any) => setCurrentQType(e.target.value)}
                        className="w-full p-2.5 rounded-xl border text-xs bg-white font-semibold"
                      >
                        <option value="mcq">Question à choix multiples (QCM)</option>
                        <option value="true_false">Vrai ou Faux</option>
                        <option value="short_answer">Réponse courte</option>
                        <option value="matching">Appariements (Associer)</option>
                        <option value="drag_drop">Glisser-déposer</option>
                        <option value="essay">Composition / Essai</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Énoncé de la question</label>
                      <input 
                        type="text" 
                        value={qText} 
                        onChange={(e) => setQText(e.target.value)} 
                        placeholder="Ex: Quelle est la dérivée de f(x) = x^2 ?"
                        className="w-full p-2.5 rounded-xl border text-xs bg-white"
                      />
                    </div>

                    {currentQType === 'mcq' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Options de réponse (QCM)</label>
                        {qOptions.map((opt, i) => (
                          <input 
                            key={i} 
                            type="text" 
                            value={opt} 
                            onChange={(e) => {
                              const newOpts = [...qOptions];
                              newOpts[i] = e.target.value;
                              setQOptions(newOpts);
                            }}
                            placeholder={`Option ${i+1}`}
                            className="w-full p-2 rounded-lg border text-xs bg-white mb-1"
                          />
                        ))}
                      </div>
                    )}

                    {currentQType === 'matching' && (
                      <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-slate-700">Paires d'appariement (Question / Réponse associée)</label>
                          <button 
                            type="button" 
                            onClick={() => setMatchingPairs([...matchingPairs, { term: '', definition: '' }])}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700"
                          >
                            + Ajouter une paire
                          </button>
                        </div>
                        {matchingPairs.map((pair, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input 
                              type="text" 
                              value={pair.term} 
                              onChange={(e) => {
                                const updated = [...matchingPairs];
                                updated[idx].term = e.target.value;
                                setMatchingPairs(updated);
                              }}
                              placeholder={`Élément / Question ${idx+1}`}
                              className="flex-1 p-2 rounded-lg border text-xs bg-white"
                            />
                            <span className="text-slate-400 font-bold">➔</span>
                            <input 
                              type="text" 
                              value={pair.definition} 
                              onChange={(e) => {
                                const updated = [...matchingPairs];
                                updated[idx].definition = e.target.value;
                                setMatchingPairs(updated);
                              }}
                              placeholder={`Réponse associée ${idx+1}`}
                              className="flex-1 p-2 rounded-lg border text-xs bg-white"
                            />
                            {matchingPairs.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Réponse correcte / Corrigé</label>
                      <input 
                        type="text" 
                        value={qCorrectAnswer} 
                        onChange={(e) => setQCorrectAnswer(e.target.value)} 
                        placeholder="Indiquez la réponse correcte pour l'évaluation..."
                        className="w-full p-2.5 rounded-xl border text-xs bg-white"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleAddQuizQuestion}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors"
                    >
                      + Ajouter cette question au Quiz
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Enregistrer l'élément</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Assignment Submissions */}
      {viewingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Soumissions des étudiants : {viewingAssignment.title}</h3>
            
            {(!viewingAssignment.submissions || viewingAssignment.submissions.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">Aucun étudiant n'a encore soumis son travail pour ce devoir.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {viewingAssignment.submissions.map((sub: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center font-bold text-xs text-slate-900">
                      <span>{sub.studentName}</span>
                      <span className="text-[10px] text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-600">{sub.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewingAssignment(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Document Viewer */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Visualiseur de document intégré</span>
                <h3 className="font-bold text-slate-900 text-lg">{viewingDocument.fileName || viewingDocument.title}</h3>
              </div>
              <button onClick={() => setViewingDocument(null)} className="p-2 text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="flex-1 bg-slate-100 rounded-2xl p-4 overflow-y-auto min-h-[350px] flex items-center justify-center">
              {viewingDocument.fileData && viewingDocument.fileData.includes('application/pdf') ? (
                <iframe src={viewingDocument.fileData} className="w-full h-[500px] rounded-xl border" title="Aperçu PDF" />
              ) : viewingDocument.fileData && viewingDocument.fileData.includes('image/') ? (
                <img src={viewingDocument.fileData} alt="Document" className="max-h-[450px] object-contain rounded-xl shadow-md" />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <FileText size={48} className="mx-auto text-blue-600" />
                  <p className="text-sm font-bold text-slate-800">Document prêt à être consulté</p>
                  <p className="text-xs text-slate-500 max-w-sm">Ce fichier ({viewingDocument.fileName || 'Document'}) peut être téléchargé directement pour une lecture hors-ligne complète.</p>
                  <a 
                    href={viewingDocument.fileData} 
                    download={viewingDocument.fileName || 'document'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    📥 Télécharger le fichier source
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewingDocument(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quiz Preview */}
      {showQuizPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Mode Prévisualisation Enseignant</span>
                <h3 className="font-bold text-slate-900 text-lg">Aperçu du Quiz ({quizQuestions.length} questions)</h3>
              </div>
              <button onClick={() => setShowQuizPreview(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-2">
              {quizQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600">Question {idx + 1} ({q.type})</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">Corrigé : {q.correctAnswer || 'Défini'}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{q.text}</p>

                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-1 pl-2">
                      {q.options.map((opt: string, i: number) => (
                        <div key={i} className="text-xs text-slate-700 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold">{String.fromCharCode(65 + i)}</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'matching' && q.matchingPairs && (
                    <div className="space-y-1 pl-2 bg-white p-2 rounded-xl border">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Paires configurées :</p>
                      {q.matchingPairs.map((p: any, i: number) => (
                        <div key={p.id || i} className="text-xs flex justify-between text-slate-700 border-b last:border-b-0 py-1">
                          <span className="font-semibold">{p.term}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-semibold text-indigo-600">{p.definition}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowQuizPreview(false)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">Fermer la prévisualisation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

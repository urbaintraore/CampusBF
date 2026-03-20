import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, ThumbsUp, FileText, SlidersHorizontal, BookOpen, Calendar, ChevronDown, X, Plus, Shield, UploadCloud, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { db, storage } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Documents() {
  const { user, documents: globalDocuments } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [filter, setFilter] = useState('tout');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('Toutes les universités');
  const [selectedMajor, setSelectedMajor] = useState('Toutes les filières');
  const [selectedYear, setSelectedYear] = useState('Toutes les années');
  const [selectedSubject, setSelectedSubject] = useState('Toutes les matières');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadUniversity, setUploadUniversity] = useState('Université Joseph Ki-Zerbo');
  const [customUniversity, setCustomUniversity] = useState('');
  
  // Form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('thesis');
  const [uploadYear, setUploadYear] = useState('2024');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const docsList = globalDocuments.map(doc => ({
      ...doc,
      createdAt: doc.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 
                 (typeof doc.createdAt === 'string' ? doc.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
    }));
    setDocuments(docsList);
  }, [globalDocuments]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filterMap: Record<string, string> = {
    'examen corrigés': 'exam',
    'td corrigés': 'exercise',
    'cours et résumés de cours': 'summary',
    'mémoires': 'thesis',
  };

  const subjects = Array.from(new Set(documents.map(doc => doc.subject)));

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === 'tout' || doc.type === filterMap[filter];
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUniversity = selectedUniversity === 'Toutes les universités' || doc.university === selectedUniversity;
    const matchesMajor = selectedMajor === 'Toutes les filières' || doc.major === selectedMajor;
    const matchesYear = selectedYear === 'Toutes les années' || doc.year === selectedYear;
    const matchesSubject = selectedSubject === 'Toutes les matières' || doc.subject === selectedSubject;

    return matchesFilter && matchesSearch && matchesUniversity && matchesMajor && matchesYear && matchesSubject;
  });

  const isAdmin = user?.role === 'admin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isAdmin || file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadError('');
      } else {
        setUploadError('Veuillez sélectionner un fichier PDF valide.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isAdmin || file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadError('');
      } else {
        setUploadError('Veuillez sélectionner un fichier PDF valide.');
      }
    }
  };

  const resetUploadForm = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadUniversity('Université Joseph Ki-Zerbo');
    setCustomUniversity('');
    setUploadTitle('');
    setUploadType('thesis');
    setUploadYear('2024');
    setUploadSubject('');
    setUploadError('');
    setIsUploading(false);
  };

  const handlePublish = async () => {
    if (!uploadTitle.trim()) {
      setUploadError('Veuillez saisir un titre pour le document.');
      return;
    }
    if (!uploadSubject.trim()) {
      setUploadError('Veuillez saisir la matière concernée.');
      return;
    }
    if (uploadUniversity === 'Autre' && !customUniversity.trim()) {
      setUploadError('Veuillez préciser le nom de l\'université.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Veuillez sélectionner un fichier à partager.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      console.log("Starting upload process to Cloudflare R2...");
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de l'upload";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Erreur serveur (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error("Réponse invalide du serveur");
      }
      const downloadUrl = data.url;
      const fileName = data.fileName;
      console.log("Download URL obtained:", downloadUrl);

      const newDoc = {
        title: uploadTitle,
        type: uploadType,
        university: uploadUniversity === 'Autre' ? customUniversity : uploadUniversity,
        major: user?.major || 'Général',
        year: uploadYear,
        subject: uploadSubject,
        authorId: user?.id || 'admin',
        downloadUrl,
        ...(fileName && { fileName }),
        downloads: 0,
        likes: 0,
        createdAt: serverTimestamp(),
      };

      console.log("Adding document to Firestore...", newDoc);
      await addDoc(collection(db, 'documents'), newDoc);
      console.log("Document added successfully.");
      
      resetUploadForm();
      alert('Document partagé avec succès !');
    } catch (error: any) {
      console.error("Error uploading document:", error);
      setUploadError(`Erreur: ${error.message || "Erreur lors de l'envoi du document."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (docData: any) => {
    try {
      // Increment download count in Firestore
      await updateDoc(doc(db, 'documents', docData.id), {
        downloads: increment(1)
      });

      // Try to force download using fetch and blob
      try {
        const response = await fetch(docData.downloadUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = docData.fileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (corsError) {
        console.warn("CORS error, falling back to window.open", corsError);
        // Fallback if CORS prevents fetch
        window.open(docData.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const handleLike = async (docId: string) => {
    try {
      await updateDoc(doc(db, 'documents', docId), {
        likes: increment(1)
      });
    } catch (error) {
      console.error("Error liking document:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Documents Universitaires</h1>
          <p className="text-slate-500 text-sm mt-1">Accédez à des milliers de ressources partagées par les étudiants.</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
        >
          <FileText size={18} />
          Partager un document
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-[2rem] max-w-lg w-full p-6 md:p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/95 backdrop-blur-xl z-10 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-display font-bold text-slate-900">Partager un document</h2>
              <button 
                onClick={resetUploadForm} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form className="space-y-5">
              {uploadError && (
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={18} />
                  {uploadError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Titre du document</label>
                <input 
                  type="text" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ex: Algèbre Linéaire - Examen 2024" 
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Type</label>
                  <select 
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-700"
                  >
                    <option value="exam">Examen corrigé</option>
                    <option value="exercise">TD corrigé</option>
                    <option value="summary">Cours et résumé</option>
                    <option value="thesis">Mémoire</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Année</label>
                  <input 
                    type="text" 
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    placeholder="2024" 
                    className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Matière</label>
                <input 
                  type="text" 
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  placeholder="Ex: Mathématiques" 
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Université</label>
                <select 
                  value={uploadUniversity}
                  onChange={(e) => setUploadUniversity(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-700"
                >
                  <option value="Université Joseph Ki-Zerbo">Université Joseph Ki-Zerbo</option>
                  <option value="Université Thomas Sankara">Université Thomas Sankara</option>
                  <option value="Université Aube Nouvelle">Université Aube Nouvelle</option>
                  <option value="Autre">Autre université</option>
                </select>
              </div>
              {uploadUniversity === 'Autre' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1">
                  <label className="text-sm font-medium text-slate-700 ml-1">Nom de l'université</label>
                  <input 
                    type="text" 
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    placeholder="Saisissez le nom de l'université" 
                    className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 ml-1">Fichier {isAdmin ? '' : '(PDF)'}</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={isAdmin ? "*" : ".pdf"}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative overflow-hidden group",
                    isDragging ? "border-emerald-500 bg-emerald-50/50 scale-[1.02]" : 
                    selectedFile ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"
                  )}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center animate-in zoom-in-95">
                      <div className="w-12 h-12 bg-emerald-100/80 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle size={24} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-emerald-900 truncate max-w-full px-4 mb-1">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-full">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-4 text-xs font-medium text-slate-500 hover:text-red-500 transition-colors"
                      >
                        Changer de fichier
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-100/50 transition-colors">
                        <UploadCloud size={24} className="text-slate-500 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-slate-900 mb-1">
                        Cliquez ou glissez-déposez
                      </span>
                      <span className="text-xs text-slate-500">
                        {isAdmin ? "Tous les types de fichiers sont acceptés (Max 50 MB)" : "Fichiers PDF uniquement (Max 50 MB)"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button 
                type="button"
                onClick={handlePublish}
                disabled={isUploading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl font-medium transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Publication en cours...
                  </>
                ) : (
                  'Publier le document'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Search & Filters */}
      <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher un cours, un sujet d'examen, un auteur..." 
            className="w-full pl-12 pr-4 py-3.5 bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "mr-2 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
              showFilters ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <SlidersHorizontal size={16} />
            Filtres
            <ChevronDown size={14} className={cn("transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>
        
        {showFilters && (
          <div className="p-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Université</label>
              <select 
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option>Toutes les universités</option>
                <option>Université Joseph Ki-Zerbo</option>
                <option>Université Thomas Sankara</option>
                <option>Université Aube Nouvelle</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filière</label>
              <select 
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option>Toutes les filières</option>
                <option>Informatique</option>
                <option>Mathématiques</option>
                <option>Droit</option>
                <option>Médecine</option>
                <option>Physique</option>
                <option>Économie</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Matière</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option>Toutes les matières</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Année</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-3 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option>Toutes les années</option>
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
              </select>
            </div>
            <div className="lg:col-span-4 flex justify-end pt-2">
              <button 
                onClick={() => {
                  setSelectedUniversity('Toutes les universités');
                  setSelectedMajor('Toutes les filières');
                  setSelectedYear('Toutes les années');
                  setSelectedSubject('Toutes les matières');
                  setFilter('tout');
                  setSearchQuery('');
                }}
                className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
              >
                <X size={14} />
                Réinitialiser tous les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {['Tout', 'Examen Corrigés', 'TD Corrigés', 'Cours et Résumés de cours', 'Mémoires'].map((f) => (
          <button 
            key={f}
            onClick={() => setFilter(f.toLowerCase())}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              filter === f.toLowerCase()
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" 
                : "bg-white/80 backdrop-blur-sm text-slate-600 border-slate-200/60 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="grid gap-4">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200/60 transition-all group flex flex-col md:flex-row gap-5">
              <div className="flex items-start gap-4 flex-1">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-display font-bold flex-shrink-0 shadow-inner ring-1 ring-inset",
                  doc.type === 'exam' ? "bg-red-50 text-red-600 ring-red-100" :
                  doc.type === 'summary' ? "bg-blue-50 text-blue-600 ring-blue-100" : 
                  doc.type === 'thesis' ? "bg-amber-50 text-amber-600 ring-amber-100" : "bg-purple-50 text-purple-600 ring-purple-100"
                )}>
                  {doc.type === 'exam' ? 'EX' : doc.type === 'summary' ? 'CR' : doc.type === 'thesis' ? 'ME' : 'TD'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{doc.title}</h3>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg border border-slate-200/60">{doc.type.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-y-2 gap-x-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-slate-400" /> {doc.subject}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {doc.year}</span>
                    <span className="flex items-center gap-1.5 text-slate-300">|</span>
                    <span className="text-slate-600">{doc.university}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Download size={14} className="text-slate-400" /> {doc.downloads}
                    </div>
                    <button 
                      onClick={() => handleLike(doc.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-colors active:scale-95"
                    >
                      <ThumbsUp size={14} className={doc.likes > 0 ? "text-emerald-500" : "text-slate-400"} /> {doc.likes}
                    </button>
                    <div className="text-xs text-slate-400 ml-auto flex items-center gap-1.5">
                      Ajouté par <span className="text-slate-700 font-medium bg-slate-100/50 px-2 py-0.5 rounded-md">{doc.authorId === user?.id ? `${user?.firstName} ${user?.lastName?.charAt(0)}.` : 'Admin'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end md:border-l md:border-slate-100 md:pl-5">
                <button 
                  onClick={() => handleDownload(doc)}
                  className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download size={18} />
                  Télécharger
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-200/60">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Aucun document trouvé pour cette catégorie.</p>
            <button 
              onClick={() => {
                setFilter('tout');
                setSearchQuery('');
              }}
              className="mt-4 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
            >
              Effacer les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

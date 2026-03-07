import React, { useState } from 'react';
import { Search, Filter, Download, ThumbsUp, FileText, SlidersHorizontal, BookOpen, Calendar, ChevronDown, X, Plus } from 'lucide-react';
import { MOCK_DOCUMENTS } from '@/data/mock';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
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
  const [uploadType, setUploadType] = useState('exam');
  const [uploadYear, setUploadYear] = useState('2024');
  const [uploadSubject, setUploadSubject] = useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filterMap: Record<string, string> = {
    'examen': 'exam',
    'td corrigés': 'exercise',
    'résumés': 'summary',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const resetUploadForm = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadUniversity('Université Joseph Ki-Zerbo');
    setCustomUniversity('');
    setUploadTitle('');
    setUploadType('exam');
    setUploadYear('2024');
    setUploadSubject('');
  };

  const handlePublish = () => {
    if (!uploadTitle || !uploadSubject || !selectedFile) {
      alert('Veuillez remplir tous les champs et sélectionner un fichier.');
      return;
    }

    const newDoc = {
      id: `d${Date.now()}`,
      title: uploadTitle,
      type: uploadType as any,
      university: uploadUniversity === 'Autre' ? customUniversity : uploadUniversity,
      major: user?.major || 'Général',
      year: uploadYear,
      subject: uploadSubject,
      authorId: user?.id || 'admin',
      downloadUrl: URL.createObjectURL(selectedFile),
      createdAt: new Date().toISOString().split('T')[0],
      downloads: 0,
      likes: 0,
      fileName: selectedFile.name
    };

    setDocuments([newDoc, ...documents]);
    resetUploadForm();
  };

  const handleDownload = (doc: any) => {
    // For mock documents with '#' or real URLs
    if (doc.downloadUrl === '#') {
      // Create a dummy PDF for mock documents
      const dummyContent = `Document: ${doc.title}\nUniversité: ${doc.university}\nMatière: ${doc.subject}\nType: ${doc.type}`;
      const blob = new Blob([dummyContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For newly uploaded documents (blob URLs) or real external URLs
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Increment download count locally for feedback
    setDocuments(prev => prev.map(d => 
      d.id === doc.id ? { ...d, downloads: d.downloads + 1 } : d
    ));
  };

  const handleLike = (docId: string) => {
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, likes: d.likes + 1 } : d
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents Universitaires</h1>
          <p className="text-slate-500 text-sm">Accédez à des milliers de ressources partagées par les étudiants.</p>
        </div>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 active:scale-95"
          >
            <FileText size={18} />
            Partager un document
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Partager un document</h2>
              <button 
                onClick={resetUploadForm} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <form className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Titre du document</label>
                <input 
                  type="text" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ex: Algèbre Linéaire - Examen 2024" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Type</label>
                  <select 
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                  >
                    <option value="exam">Examen</option>
                    <option value="exercise">TD Corrigé</option>
                    <option value="summary">Résumé</option>
                    <option value="thesis">Mémoire</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Année</label>
                  <input 
                    type="text" 
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    placeholder="2024" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Matière</label>
                <input 
                  type="text" 
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  placeholder="Ex: Mathématiques" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Université</label>
                <select 
                  value={uploadUniversity}
                  onChange={(e) => setUploadUniversity(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                >
                  <option value="Université Joseph Ki-Zerbo">Université Joseph Ki-Zerbo</option>
                  <option value="Université Thomas Sankara">Université Thomas Sankara</option>
                  <option value="Université Aube Nouvelle">Université Aube Nouvelle</option>
                  <option value="Autre">Autre université</option>
                </select>
              </div>
              {uploadUniversity === 'Autre' && (
                <div className="space-y-1 animate-in slide-in-from-top-1">
                  <label className="text-sm font-semibold text-gray-700">Nom de l'université</label>
                  <input 
                    type="text" 
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    placeholder="Saisissez le nom de l'université" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" 
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Fichier (PDF)</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
                    selectedFile ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-500"
                  )}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <FileText size={24} className="text-emerald-600 mb-2" />
                      <span className="text-sm font-medium text-emerald-700 truncate max-w-full px-4">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-emerald-500 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ) : (
                    <>
                      <Plus size={24} className="mx-auto text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">Déposer le document (PDF uniquement)</span>
                    </>
                  )}
                </div>
              </div>
              <button 
                type="button"
                onClick={handlePublish}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
              >
                Publier le document
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Search & Filters */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher un cours, un sujet d'examen, un auteur..." 
            className="w-full pl-12 pr-4 py-4 bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "mr-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
              showFilters ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            <SlidersHorizontal size={16} />
            Filtres
            <ChevronDown size={14} className={cn("transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>
        
        {showFilters && (
          <div className="p-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Université</label>
              <select 
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option>Toutes les universités</option>
                <option>Université Joseph Ki-Zerbo</option>
                <option>Université Thomas Sankara</option>
                <option>Université Aube Nouvelle</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Filière</label>
              <select 
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
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
              <label className="text-xs font-semibold text-slate-500 uppercase">Matière</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option>Toutes les matières</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Année</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
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
                className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
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
        {['Tout', 'Examen', 'TD Corrigés', 'Résumés', 'Mémoires'].map((f) => (
          <button 
            key={f}
            onClick={() => setFilter(f.toLowerCase())}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all border",
              filter === f.toLowerCase()
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200" 
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-700"
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
            <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col md:flex-row gap-5">
              <div className="flex items-start gap-4 flex-1">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-inner",
                  doc.type === 'exam' ? "bg-red-50 text-red-600" :
                  doc.type === 'summary' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                )}>
                  {doc.type === 'exam' ? 'EX' : doc.type === 'summary' ? 'RS' : 'TD'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{doc.title}</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">{doc.type.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-y-2 gap-x-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><BookOpen size={14} /> {doc.subject}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {doc.year}</span>
                    <span className="flex items-center gap-1.5 text-slate-400">|</span>
                    <span>{doc.university}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                      <Download size={14} /> {doc.downloads}
                    </div>
                    <button 
                      onClick={() => handleLike(doc.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md hover:bg-emerald-50 hover:text-emerald-600 transition-colors active:scale-90"
                    >
                      <ThumbsUp size={14} /> {doc.likes}
                    </button>
                    <div className="text-xs text-slate-400 ml-auto">
                      Ajouté par <span className="text-slate-600 font-medium">{doc.authorId === user?.id ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Ousmane S.'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end md:border-l md:border-slate-100 md:pl-5">
                <button 
                  onClick={() => handleDownload(doc)}
                  className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download size={18} />
                  Télécharger
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500">Aucun document trouvé pour cette catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
}

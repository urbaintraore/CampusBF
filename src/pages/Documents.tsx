import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, ThumbsUp, FileText, SlidersHorizontal, BookOpen, Calendar, ChevronDown, X, Plus, Shield, UploadCloud, AlertCircle, Loader2, CheckCircle, Eye, Sparkles, ShieldCheck, Lock, Printer, ArrowRight, Brain, RotateCw } from 'lucide-react';
import PrintOrderModal from '../components/PrintOrderModal';
import { InviteFriendsModal } from '@/components/InviteFriendsModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { summarizeDocument } from '@/services/geminiService';
import toast from 'react-hot-toast';
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
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadFile } from '@/services/storageService';

export default function Documents() {
  const navigate = useNavigate();
  const { 
    user, isAdmin, documents: globalDocuments, logAction, groups, community, 
    addDocument, incrementActivity, isDocumentLocked, syncUserStats 
  } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tout');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('Toutes les universités');
  const [selectedMajor, setSelectedMajor] = useState('Toutes les filières');
  const [selectedYear, setSelectedYear] = useState('Toutes les années');
  const [selectedSubject, setSelectedSubject] = useState('Toutes les matières');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDocForPayment, setSelectedDocForPayment] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadUniversity, setUploadUniversity] = useState('Université Joseph Ki-Zerbo');
  const [customUniversity, setCustomUniversity] = useState('');
  const [uploadUfr, setUploadUfr] = useState('');
  const [uploadDepartment, setUploadDepartment] = useState('');
  
  // Form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('exam');
  const [uploadYear, setUploadYear] = useState('2024');
  const [uploadSubject, setUploadSubject] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<{url?: string, name?: string} | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      const cacheKey = 'local_cache_docs';
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheKey + '_time');
      const now = Date.now();

      if (cached && cacheTime && now - parseInt(cacheTime) < 43200000) {
        setDocuments(JSON.parse(cached));
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const docsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 
                         (typeof data.createdAt === 'string' ? data.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
            };
          });
          setDocuments(docsList);
          sessionStorage.setItem(cacheKey, JSON.stringify(docsList));
          sessionStorage.setItem(cacheKey + '_time', now.toString());
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (error) {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filterMap: Record<string, string> = {
    'examen corrigés': 'exam',
    'td corrigés': 'exercise',
    'cours et résumés de cours': 'summary',
    'mémoires': 'Mémoire',
  };

  const getUniqueValues = (values: string[]) => {
    const seen = new Set<string>();
    return values
      .map(v => v?.trim())
      .filter(v => {
        if (!v) return false;
        const lower = v.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  };

  const subjects = getUniqueValues(documents.map(doc => doc.subject));
  const universities = getUniqueValues(documents.map(doc => doc.university));
  const majors = getUniqueValues(documents.map(doc => doc.department || doc.major));
  const years = getUniqueValues(documents.map(doc => doc.year)).sort((a, b) => b.localeCompare(a));

  const knownUniversities = getUniqueValues([
    'Université Joseph Ki-Zerbo',
    'Université Thomas Sankara',
    'Université Aube Nouvelle',
    ...documents.map(doc => doc.university)
  ]);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncUserStats();
      toast.success("Synchronisation terminée !");
    } catch (err) {
      toast.error("Échec de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === 'tout' || doc.type === filterMap[filter];
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUniversity = selectedUniversity === 'Toutes les universités' || 
                             doc.university?.trim().toLowerCase() === selectedUniversity.toLowerCase();
    
    const matchesMajor = selectedMajor === 'Toutes les filières' || 
                        (doc.department?.trim().toLowerCase() === selectedMajor.toLowerCase() || 
                         doc.major?.trim().toLowerCase() === selectedMajor.toLowerCase());
    
    const matchesYear = selectedYear === 'Toutes les années' || 
                       doc.year?.trim().toLowerCase() === selectedYear.toLowerCase();
    
    const matchesSubject = selectedSubject === 'Toutes les matières' || 
                          doc.subject?.trim().toLowerCase() === selectedSubject.toLowerCase();

    return matchesFilter && matchesSearch && matchesUniversity && matchesMajor && matchesYear && matchesSubject;
  });

  const isPremium = user?.premiumSubscriptionStatus === 'active' || user?.examSubscriptionStatus === 'active' || isAdmin;

  const isProfileComplete = Boolean(
    user?.firstName && 
    user?.lastName && 
    user?.phone &&
    user?.university && 
    user?.major && 
    user?.level
  );

  const handleUploadClick = () => {
    if (user?.role === 'student' && !isAdmin) {
      const message = encodeURIComponent(`Bonjour ! Je souhaite partager un document académique sur CampusBF.\nTitre: \nMatière: \nUniversité: `);
      window.open(`https://wa.me/22663375257?text=${message}`, '_blank');
      return;
    }
    
    // Teachers and Admins can upload if their basic profile is at least present
    // Approved teachers should definitely be able to upload
    if (!isProfileComplete && !isAdmin && user?.role !== 'teacher') {
      alert("Veuillez renseigner complètement votre profil (téléphone WhatsApp, université, filière, niveau) dans les paramètres pour pouvoir partager des documents.");
      return;
    }
    setShowUploadModal(true);
  };

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
    setUploadUfr('');
    setUploadDepartment('');
    setUploadTitle('');
    setUploadType('exam');
    setUploadYear('2024');
    setUploadSubject('');
    setIsForSale(false);
    setUploadPrice('');
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
    if (isForSale && (!uploadPrice || parseFloat(uploadPrice) <= 0)) {
      setUploadError('Veuillez saisir un prix valide supérieur à 0.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Veuillez sélectionner un fichier à partager.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      console.log(`[Documents] Début de l'upload: ${selectedFile.name} (${selectedFile.size} octets)`);
      
      const { url: downloadUrl, fileName } = await uploadFile(selectedFile);
      console.log("[Documents] Upload réussi, URL:", downloadUrl);
      if (!downloadUrl) {
        throw new Error("L'URL de téléchargement n'a pas été générée.");
      }

      const newDoc: any = {
        title: uploadTitle,
        type: uploadType,
        university: uploadUniversity === 'Autre' ? customUniversity : uploadUniversity,
        ufr: uploadUfr,
        department: uploadDepartment,
        major: user?.major || 'Général',
        year: uploadYear,
        subject: uploadSubject,
        authorId: user?.id || 'admin',
        downloadUrl,
        fileName: fileName || selectedFile.name,
        downloads: 0,
        likes: 0,
        isForSale,
        createdAt: serverTimestamp(),
      };

      if (isForSale) {
        newDoc.price = parseFloat(uploadPrice);
      }

      console.log("[Documents] Ajout à Firestore:", newDoc);
      await addDocument(newDoc);
      console.log("[Documents] Document ajouté avec succès.");
      
      if (logAction) {
        logAction('Partage de document', `Document: ${uploadTitle} (${uploadSubject})`);
      }
      
      resetUploadForm();
      alert('Document partagé avec succès !');
    } catch (error: any) {
      console.error("Error uploading document:", error);
      setUploadError(`Erreur: ${error.message || "Erreur lors de l'envoi du document."}`);
    } finally {
      setIsUploading(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleView = (doc: any) => {
    if (isAdmin) {
      window.open(doc.downloadUrl, '_blank');
      return;
    }

    const lockStatus: any = isDocumentLocked(doc, 'view');
    if (lockStatus && lockStatus.locked) {
      toast.error(lockStatus.reason || "Accès restreint", { duration: 60000 });
      return;
    }

    if (incrementActivity) {
      incrementActivity('docsViewed').catch(console.error);
    }
    
    window.open(doc.downloadUrl, '_blank');
  };

  const handleDownload = async (docData: any) => {
    if (!user) {
      setShowInviteModal(true);
      return;
    }

    if (isDownloading) return;

    if (!isAdmin) {
      const lockStatus: any = isDocumentLocked(docData, 'download');
      if (lockStatus && lockStatus.locked) {
        toast.error(lockStatus.reason || "Téléchargement restreint", { duration: 60000 });
        return;
      }
    }

    if (!docData.downloadUrl) {
      toast.error("L'URL du document est introuvable.");
      return;
    }

    setIsDownloading(docData.id);
    try {
      console.log("[Documents] Processing download for:", docData.id);
      
      // 1. Update stats in Firebase first
      const docRef = doc(db, 'documents', docData.id);
      const userRef = doc(db, 'users', user.id);

      await Promise.all([
        updateDoc(docRef, { downloads: increment(1) }),
        updateDoc(userRef, {
          lastDownloadAt: new Date().toISOString(),
          'activityStats.docsDownloaded': increment(1),
          lastActiveAt: serverTimestamp()
        })
      ]);

      if (logAction) {
        logAction('Téléchargement de document', `Document: ${docData.title}`);
      }

      // 2. Trigger actual file download
      const link = document.createElement('a');
      link.href = docData.downloadUrl.includes('supabase.co') && !docData.downloadUrl.includes('?download=')
        ? docData.downloadUrl + '?download='
        : docData.downloadUrl;
      link.target = '_blank';
      link.download = docData.fileName || docData.title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Téléchargement lancé");
    } catch (error: any) {
      console.error("[Documents] Download error:", error);
      toast.error("Erreur durant le téléchargement");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleLike = async (docId: string, docTitle: string) => {
    try {
      await updateDoc(doc(db, 'documents', docId), {
        likes: increment(1)
      });
      if (logAction) {
        logAction('Like de document', `Document: ${docTitle}`);
      }
    } catch (error) {
      console.error("Error liking document:", error);
    }
  };

  const handleSummarize = async (docId: string, title: string, subject: string, university: string) => {
    if (summaries[docId]) return;
    
    setLoadingSummary(docId);
    try {
      const description = `Un document de type ${subject} provenant de ${university}.`;
      const summary = await summarizeDocument(title, description);
      setSummaries(prev => ({ ...prev, [docId]: summary }));
    } catch (error) {
      console.error("Error summarizing document:", error);
      toast.error("Impossible de générer le résumé IA.");
    } finally {
      setLoadingSummary(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Documents Universitaires</h1>
          <p className="text-slate-500 text-sm mt-1">Accédez à des milliers de ressources partagées par les étudiants.</p>
        </div>
        {user && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                setSelectedDocForPrint(null);
                setShowPrintModal(true);
              }}
              className="bg-white text-slate-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50 transition-all shadow-sm border border-slate-200 flex items-center gap-2 active:scale-95"
            >
              <Printer size={18} className="text-emerald-600" />
              <span>Imprimerie</span>
            </button>
            <button 
              onClick={handleUploadClick}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
            >
              {user.role === 'student' ? (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="fill-current">
                    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.065-.301-.15-1.265-.462-2.406-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.21 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.195-.572-.345z"/>
                  </svg>
                  <span>Suggérer</span>
                </>
              ) : (
                <>
                  <FileText size={18} />
                  <span>Publier</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {showInviteModal && <InviteFriendsModal onClose={() => setShowInviteModal(false)} />}
      
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
                    <option value="Mémoire">Mémoire</option>
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
                  {knownUniversities.map(uni => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                  <option value="Autre">Autre université (Préciser...)</option>
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
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">UFR / Institut</label>
                  <input 
                    type="text" 
                    value={uploadUfr}
                    onChange={(e) => setUploadUfr(e.target.value)}
                    placeholder="Ex: UFR/SEA" 
                    className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Département / Filière</label>
                  <input 
                    type="text" 
                    value={uploadDepartment}
                    onChange={(e) => setUploadDepartment(e.target.value)}
                    placeholder="Ex: Informatique" 
                    className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Mettre en vente ?</label>
                  <button
                    type="button"
                    onClick={() => setIsForSale(!isForSale)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      isForSale ? "bg-emerald-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      isForSale ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                {isForSale && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prix (CFA)</label>
                    <input 
                      type="number" 
                      value={uploadPrice}
                      onChange={(e) => setUploadPrice(e.target.value)}
                      placeholder="Ex: 500" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                    />
                  </div>
                )}
              </div>

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
                {universities.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
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
                {majors.map(major => (
                  <option key={major} value={major}>{major}</option>
                ))}
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
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
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
      
      {user?.role === 'student' && !isAdmin && (
        <div className="mb-8 p-6 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="text-emerald-400" size={24} />
                Statut de téléchargement
              </h2>
              <p className="text-slate-400 text-sm max-w-xl">
                {isDocumentLocked({}, 'download') 
                  ? "Votre profil est restreint. Plusieurs étapes académiques sont nécessaires pour débloquer les téléchargements."
                  : "Votre profil est complet. Vous pouvez télécharger un document toutes les 24h."}
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/profile'}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
            >
              Voir ma checklist
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

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

      {/* Documents List grouped by University */}
      <div className="space-y-10">
        {filteredDocuments.length > 0 ? (
          (Object.entries(
            filteredDocuments.reduce((acc: Record<string, any[]>, doc) => {
              const uni = doc.university || 'Autres Universités';
              if (!acc[uni]) acc[uni] = [];
              acc[uni].push(doc);
              return acc;
            }, {})
          ) as [string, any[]][]).map(([university, universityDocs]) => (
            <div key={university} className="space-y-5">
              <div className="flex items-center gap-3 px-2">
                <div className="h-8 w-1.5 bg-emerald-600 rounded-full shadow-sm shadow-emerald-600/20"></div>
                <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {university}
                  <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200/50">
                    {universityDocs.length} {universityDocs.length > 1 ? 'documents' : 'document'}
                  </span>
                </h2>
              </div>
              
              <div className="grid gap-4">
                {universityDocs.map((doc) => (
                  <div key={doc.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200/60 transition-all group flex flex-col md:flex-row gap-5">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-display font-bold flex-shrink-0 shadow-inner ring-1 ring-inset",
                        doc.type === 'exam' ? "bg-red-50 text-red-600 ring-red-100" :
                        doc.type === 'summary' ? "bg-blue-50 text-blue-600 ring-blue-100" : 
                        doc.type === 'Mémoire' ? "bg-amber-50 text-amber-600 ring-amber-100" : "bg-purple-50 text-purple-600 ring-purple-100"
                      )}>
                        {doc.type === 'exam' ? 'EX' : doc.type === 'summary' ? 'CR' : doc.type === 'Mémoire' ? 'ME' : 'TD'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{doc.title}</h3>
                            {isDocumentLocked(doc, 'view') && <Lock size={16} className="text-amber-500" />}
                            {doc.isForSale && (
                              <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                <Sparkles size={8} /> Payant
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100/80 text-slate-600 rounded-lg border border-slate-200/60">{doc.type.toUpperCase()}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-y-2 gap-x-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-slate-400" /> {doc.subject}</span>
                          <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {doc.year}</span>
                          {doc.ufr && (
                            <>
                              <span className="flex items-center gap-1.5 text-slate-300">|</span>
                              <span className="text-slate-600 font-medium">{doc.ufr}</span>
                            </>
                          )}
                          {doc.department && (
                            <>
                              <span className="flex items-center gap-1.5 text-slate-300">|</span>
                              <span className="text-slate-600 font-medium">{doc.department}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100">
                            <Download size={14} className="text-slate-400" /> {doc.downloads}
                          </div>
                          <button 
                            onClick={() => handleLike(doc.id, doc.title)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-colors active:scale-95"
                          >
                            <ThumbsUp size={14} className={doc.likes > 0 ? "text-emerald-500" : "text-slate-400"} /> {doc.likes}
                          </button>
                          <div className="text-xs text-slate-400 ml-auto flex items-center gap-1.5">
                            Ajouté par <span className="text-slate-700 font-medium bg-slate-100/50 px-2 py-0.5 rounded-md">{doc.authorId === user?.id ? `${user?.firstName} ${user?.lastName?.charAt(0)}.` : 'Admin'}</span>
                          </div>
                        </div>

                {/* AI Summary & Quiz Section */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!summaries[doc.id] ? (
                            <button
                              onClick={() => handleSummarize(doc.id, doc.title, doc.subject, doc.university)}
                              disabled={loadingSummary === doc.id}
                              className="text-[10px] uppercase tracking-wider font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-md transition-all active:scale-95 disabled:opacity-50"
                            >
                              {loadingSummary === doc.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              Aperçu IA
                            </button>
                          ) : (
                            <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-xl animate-in fade-in slide-in-from-top-1 text-xs w-full mb-2">
                              <div className="flex items-center gap-1.5 text-purple-700 font-bold mb-1 uppercase tracking-wider text-[9px]">
                                <Sparkles size={10} />
                                Résumé Gemini
                              </div>
                              <p className="text-slate-600 leading-relaxed italic">
                                "{summaries[doc.id]}"
                              </p>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (user?.role === 'student' && !isAdmin) {
                                const lock: any = isDocumentLocked(doc, 'view');
                                if (lock && lock.locked) {
                                  toast.error(lock.reason || "Accès au générateur restreint", { duration: 60000 });
                                  return;
                                }
                              }
                              navigate('/quizzes', { state: { 
                                autoGenerate: true, 
                                subject: doc.subject, 
                                title: `Quiz : ${doc.title}`,
                                level: doc.level || user?.level || 'Licence 1'
                              } });
                            }}
                            className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md transition-all active:scale-95"
                          >
                            <Brain size={12} />
                            Générer Quiz IA
                          </button>
                        </div>
                      </div>
                    </div>
                        <div className="flex flex-col md:flex-row items-center justify-end gap-3 md:border-l md:border-slate-100 md:pl-5 relative">
                      {(() => {
                        const lock = isDocumentLocked(doc, 'download');
                        const isLocked = lock && (typeof lock === 'object' ? lock.locked : lock);
                        if (!isLocked || isAdmin) return null;
                        
                        return (
                          <div className="absolute -top-12 right-0 flex flex-col items-end gap-1">
                            <div className="bg-amber-50 text-amber-700 text-[10px] px-3 py-1 rounded-lg border border-amber-200 whitespace-nowrap animate-in fade-in slide-in-from-right-1">
                              {((lock as any)?.reason || "Vérifiez les critères")}
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const lock = isDocumentLocked(doc, 'download');
                        const isLocked = lock && (typeof lock === 'object' ? lock.locked : lock);
                        if (isLocked && !isAdmin) return null;
                        
                        return (
                          <button
                          onClick={() => {
                            setSelectedDocForPrint({ url: doc.downloadUrl, name: doc.title || doc.fileName });
                            setShowPrintModal(true);
                          }}
                          className="w-full md:w-auto p-3 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-sm flex items-center justify-center active:scale-95"
                          title="Imprimer ce document"
                        >
                          <Printer size={18} className="text-emerald-600" />
                        </button>
                        );
                      })()}
                      {(isAdmin || user?.role !== 'student') && (
                        <button 
                          onClick={() => handleView(doc)}
                          className={cn(
                            "w-full md:w-auto px-4 py-3 border border-slate-200 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 active:scale-95",
                            isDocumentLocked(doc, 'view') ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white text-slate-700 hover:bg-slate-50"
                          )}
                          disabled={Boolean(isDocumentLocked(doc, 'view')) && !isAdmin}
                        >
                          {isDocumentLocked(doc, 'view') ? <Lock size={18} /> : <Eye size={18} />}
                          Voir
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownload(doc)}
                        className={cn(
                          "w-full md:w-auto px-4 py-3 rounded-xl font-medium text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95",
                          isDocumentLocked(doc, 'download') 
                            ? "bg-slate-200 text-slate-500 shadow-none cursor-not-allowed opacity-80" 
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                        )}
                        disabled={Boolean(isDocumentLocked(doc, 'download')) && !isAdmin}
                      >
                        {isDocumentLocked(doc, 'download') ? <Lock size={18} /> : <Download size={18} />}
                        Télécharger
                      </button>
                    </div>
                  </div>
                ))}
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
                setSelectedUniversity('Toutes les universités');
                setSelectedMajor('Toutes les filières');
                setSelectedYear('Toutes les années');
                setSelectedSubject('Toutes les matières');
              }}
              className="mt-4 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
            >
              Effacer les filtres
            </button>
          </div>
        )}
      </div>
      {showPrintModal && (
        <PrintOrderModal 
          isOpen={showPrintModal} 
          onClose={() => {
            setShowPrintModal(false);
            setSelectedDocForPrint(null);
          }}
          initialFileUrl={selectedDocForPrint?.url}
          initialFileName={selectedDocForPrint?.name}
        />
      )}
    </div>
  );
}

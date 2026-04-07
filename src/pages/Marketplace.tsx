import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Tag, Filter, Plus, Search, MessageCircle, X, CreditCard, Image as ImageIcon, CheckCircle, AlertCircle, Clock, Send, Loader2, ShieldAlert, Flag, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { auth, db, storage, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { uploadFile } from '@/services/storageService';

export default function Marketplace() {
  const { user, marketplace: ads, logAction, reportMarketplaceItem } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [showSellModal, setShowSellModal] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const adsList = ads.map(ad => {
      let postedAt = '';
      if (ad.createdAt?.toDate) {
        postedAt = ad.createdAt.toDate().toISOString().split('T')[0];
      } else if (typeof ad.createdAt === 'string') {
        postedAt = ad.createdAt.split('T')[0];
      } else {
        postedAt = new Date().toISOString().split('T')[0];
      }
      
      return {
        ...ad,
        postedAt
      };
    });
    setItems(adsList);
  }, [ads]);

  // Form states
  const [sellTitle, setSellTitle] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCategory, setSellCategory] = useState('Livres');
  const [sellDescription, setSellDescription] = useState('');
  const [sellAddress, setSellAddress] = useState('');
  const [sellWhatsapp, setSellWhatsapp] = useState('');
  const [sellEmail, setSellEmail] = useState(user?.email || '');
  const [sellUniversity, setSellUniversity] = useState(user?.university || '');
  const [sellImages, setSellImages] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState(['Tout', 'Livres', 'Informatique', 'Logement', 'Meubles', 'Services']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tout' || 
                           item.category.toLowerCase() === selectedCategory.toLowerCase().replace('é', 'e');
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'date-asc') return new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime();
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  const resetSellForm = () => {
    setShowSellModal(false);
    setSellTitle('');
    setSellPrice('');
    setSellCategory('Livres');
    setSellDescription('');
    setSellAddress('');
    setSellWhatsapp('');
    setSellEmail(user?.email || '');
    setSellUniversity(user?.university || '');
    setSellImages([]);
    setShowNewCategoryInput(false);
    setNewCategoryName('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSellImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setSellImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!sellTitle || !sellPrice || !sellDescription || !sellAddress || !sellWhatsapp || !sellEmail || !sellUniversity) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (sellImages.length < 2) {
      alert('Veuillez ajouter au moins 2 photos de votre article.');
      return;
    }

    setIsPublishing(true);
    try {
      let finalCategory = sellCategory;
      if (showNewCategoryInput && newCategoryName.trim()) {
        finalCategory = newCategoryName.trim();
        if (!categories.includes(finalCategory)) {
          setCategories([...categories, finalCategory]);
        }
      }

      const imageUrls: string[] = [];
      
      for (const imgBase64 of sellImages) {
        const res = await fetch(imgBase64);
        const blob = await res.blob();
        const file = new File([blob], `ad-image-${Date.now()}.jpg`, { type: blob.type });
        const { url } = await uploadFile(file);
        imageUrls.push(url);
      }

      const newItem = {
        title: sellTitle,
        description: sellDescription,
        price: parseInt(sellPrice),
        category: finalCategory.toLowerCase().replace('é', 'e'),
        sellerId: user?.id || 'anonymous',
        seller: {
          id: user?.id || 'anonymous',
          firstName: user?.firstName || 'Utilisateur',
          lastName: user?.lastName || '',
          university: user?.university || '',
          major: user?.major || '',
          level: user?.level || '',
          email: sellEmail,
          whatsapp: sellWhatsapp,
          address: sellAddress,
          avatarUrl: user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
          role: user?.role || 'student',
          marketplaceStats: user?.marketplaceStats || { published: 0, sold: 0, reports: 0 }
        },
        location: sellAddress,
        university: sellUniversity,
        phone: sellWhatsapp,
        status: 'pending',
        reports: [],
        reportCount: 0,
        createdAt: serverTimestamp(),
        imageUrls,
        imageUrl: imageUrls[0], // For backward compatibility
      };

      await addDoc(collection(db, 'marketplace'), newItem);
      if (logAction) {
        logAction('Nouvelle annonce marketplace', `Annonce: ${sellTitle} (${sellPrice} FCFA) - En attente de validation`);
      }
      resetSellForm();
      alert('Votre annonce a été soumise avec succès ! Elle sera visible après validation par un administrateur.');
    } catch (error) {
      console.error("Error publishing ad:", error);
      alert("Erreur lors de la publication de l'annonce.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReport = async (itemId: string, itemTitle: string) => {
    const reason = prompt(`Pourquoi signalez-vous l'annonce "${itemTitle}" ?`);
    if (reason && reason.trim()) {
      await reportMarketplaceItem(itemId, reason);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      try {
        await deleteDoc(doc(db, 'marketplace', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `marketplace/${id}`);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const handleContact = (sellerId: string, itemTitle: string) => {
    if (logAction) {
      logAction('Contact vendeur', `Annonce: ${itemTitle}`);
    }
    navigate(`/messages?chat=${sellerId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Marketplace Étudiante</h1>
          <p className="text-slate-500 text-sm mt-1">Achetez et vendez entre étudiants en toute sécurité.</p>
        </div>
        <button 
          onClick={() => setShowSellModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
        >
          <Plus size={18} />
          Vendre un article
        </button>
      </div>

      {!showItems ? (
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-12 text-center border border-slate-200/60 shadow-sm flex flex-col items-center justify-center min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-emerald-50/80 rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-inner ring-1 ring-emerald-100">
            <Tag size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Découvrez les offres étudiantes</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
            Parcourez des centaines d'articles vendus par d'autres étudiants de votre campus. Des livres aux ordinateurs, trouvez ce dont vous avez besoin.
          </p>
          <button 
            onClick={() => setShowItems(true)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-2xl font-medium hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3 text-lg active:scale-95"
          >
            <Search size={24} />
            Voir les articles disponibles
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-transparent rounded-xl focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-3 w-full md:w-auto px-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Trier par:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50/50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 w-full md:w-auto"
              >
                <option value="date-desc">Plus récents</option>
                <option value="date-asc">Plus anciens</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
                  selectedCategory === cat 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" 
                    : "bg-white/80 backdrop-blur-sm border-slate-200/60 text-slate-600 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all group flex flex-col">
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm border border-white/20">
                    {item.category.toUpperCase()}
                  </div>
                  {item.imageUrls && item.imageUrls.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10">
                      +{item.imageUrls.length - 1} photos
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-display font-bold text-slate-900 text-lg line-clamp-1 group-hover:text-emerald-700 transition-colors">{item.title}</h3>
                    <div className="flex items-center gap-1">
                      {user && user.id !== item.sellerId && (
                        <button 
                          onClick={() => handleReport(item.id, item.title)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex-shrink-0"
                          title="Signaler l'annonce"
                        >
                          <Flag size={16} />
                        </button>
                      )}
                      {(user?.id === item.sellerId || user?.role === 'admin') && (
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Supprimer l'annonce"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-emerald-600 font-display font-bold text-xl mb-3">{item.price.toLocaleString()} CFA</p>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                  
                  <div className="space-y-2 mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="truncate">{item.university || item.location}</span>
                    </div>
                    {item.phone && (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                        <MessageCircle size={14} className="text-emerald-500" />
                        <span className="truncate">WhatsApp: {item.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-[10px] text-amber-800 leading-tight flex items-start gap-1.5">
                      <ShieldAlert size={12} className="mt-0.5 flex-shrink-0" />
                      <span><strong>Conseil de sécurité :</strong> ne payez jamais à l'avance. Le paiement doit se faire uniquement lors de la remise de l'objet.</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <img src={item.seller?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'} alt="" className="w-7 h-7 rounded-full bg-slate-100 ring-2 ring-white shadow-sm" />
                        <span className="text-[11px] font-bold text-slate-700 truncate max-w-[80px]">{item.seller?.firstName || 'Utilisateur'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium ml-9">
                        <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle size={10} /> {item.seller?.marketplaceStats?.published || 0} annonces</span>
                        <span className="flex items-center gap-0.5 text-amber-600"><Flag size={10} /> {item.seller?.marketplaceStats?.reports || 0} signalements</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleContact(item.seller?.id || item.sellerId, item.title)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      <MessageCircle size={14} />
                      Contacter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-200/60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-400">
                <Search size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Aucun article trouvé</h3>
              <p className="text-slate-500">Essayez de modifier vos filtres ou votre recherche.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tout');
                }}
                className="mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl transition-colors"
              >
                Réinitialiser la recherche
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-[2rem] max-w-2xl w-full p-6 md:p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/95 backdrop-blur-xl z-10 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-display font-bold text-slate-900">Vendre un article</h2>
              <button onClick={resetSellForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Titre de l'annonce</label>
                      <input 
                        type="text" 
                        value={sellTitle}
                        onChange={(e) => setSellTitle(e.target.value)}
                        placeholder="Ex: iPhone 12 Pro Max" 
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Prix (CFA)</label>
                      <input 
                        type="number" 
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        placeholder="0" 
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Catégorie</label>
                      {!showNewCategoryInput ? (
                        <div className="flex gap-2">
                          <select 
                            value={sellCategory}
                            onChange={(e) => setSellCategory(e.target.value)}
                            className="flex-1 px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-700"
                          >
                            {categories.filter(c => c !== 'Tout').map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button 
                            type="button"
                            onClick={() => setShowNewCategoryInput(true)}
                            className="px-4 bg-slate-100/80 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                            title="Ajouter une catégorie"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 animate-in slide-in-from-right-2">
                          <input 
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nouvelle catégorie"
                            className="flex-1 px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowNewCategoryInput(false)}
                            className="px-4 bg-slate-100/80 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Université / Lieu de rencontre</label>
                      <input 
                        type="text" 
                        value={sellUniversity}
                        onChange={(e) => setSellUniversity(e.target.value)}
                        placeholder="Ex: Université Joseph Ki-Zerbo" 
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Numéro WhatsApp / Téléphone</label>
                      <input 
                        type="text" 
                        value={sellWhatsapp}
                        onChange={(e) => setSellWhatsapp(e.target.value)}
                        placeholder="Ex: +226 XX XX XX XX" 
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Email de contact</label>
                      <input 
                        type="email" 
                        value={sellEmail}
                        onChange={(e) => setSellEmail(e.target.value)}
                        placeholder="votre@email.com" 
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Description détaillée</label>
                      <textarea 
                        value={sellDescription}
                        onChange={(e) => setSellDescription(e.target.value)}
                        placeholder="Décrivez votre article avec précision..." 
                        className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400 h-32 resize-none"
                      ></textarea>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1 flex justify-between">
                        Photos (min. 2)
                        <span className="text-[10px] text-slate-400 font-normal">{sellImages.length} photo(s) ajoutée(s)</span>
                      </label>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {sellImages.map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {sellImages.length < 6 && (
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                          >
                            <ImageIcon size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-[10px] font-medium text-slate-500 mt-1">Ajouter</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                      <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Règle de sécurité :</strong> Votre annonce sera examinée par un administrateur avant d'être publiée. 
                        Assurez-vous que les photos sont réelles et la description honnête.
                      </span>
                    </p>
                  </div>

                  <button 
                    type="button"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className={cn(
                      "w-full py-4 rounded-2xl font-medium transition-all shadow-lg mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]",
                      isPublishing
                        ? "bg-slate-300 text-slate-500 shadow-none"
                        : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/20"
                    )}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Publication en cours...
                      </>
                    ) : (
                      'Publier l\'annonce'
                    )}
                  </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

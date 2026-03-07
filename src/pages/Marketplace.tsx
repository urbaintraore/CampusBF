import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Tag, Filter, Plus, Search, MessageCircle, X, CreditCard, Image as ImageIcon, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { MOCK_MARKETPLACE } from '@/data/mock';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import MobileMoneyPayment from '@/components/shared/MobileMoneyPayment';

export default function Marketplace() {
  const { user, payPostSubscription } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(MOCK_MARKETPLACE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [showSellModal, setShowSellModal] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [showPayment, setShowPayment] = useState(false);

  // Form states
  const [sellTitle, setSellTitle] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellCategory, setSellCategory] = useState('Livres');
  const [sellDescription, setSellDescription] = useState('');
  const [sellImage, setSellImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Tout', 'Livres', 'Informatique', 'Logement', 'Meubles', 'Services'];

  const isSubscriptionActive = user?.postSubscriptionStatus === 'active' && 
    user.postSubscriptionExpiry && new Date(user.postSubscriptionExpiry) > new Date();

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
    setShowPayment(false);
    setSellTitle('');
    setSellPrice('');
    setSellCategory('Livres');
    setSellDescription('');
    setSellImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSellImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = () => {
    if (!sellTitle || !sellPrice || !sellDescription) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    const newItem = {
      id: `m${Date.now()}`,
      title: sellTitle,
      description: sellDescription,
      price: parseInt(sellPrice),
      category: sellCategory.toLowerCase().replace('é', 'e'),
      sellerId: user?.id || 'u1',
      seller: {
        id: user?.id || 'u1',
        firstName: user?.firstName || 'Utilisateur',
        lastName: user?.lastName || '',
        university: user?.university || '',
        major: user?.major || '',
        level: user?.level || '',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
        role: user?.role || 'student',
      },
      location: 'Ouagadougou',
      postedAt: new Date().toISOString().split('T')[0],
      imageUrl: sellImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    };

    setItems([newItem, ...items]);
    resetSellForm();
    alert('Votre annonce a été publiée avec succès !');
  };

  const handlePaymentSuccess = () => {
    payPostSubscription();
    setShowPayment(false);
  };

  const handleContact = (sellerId: string) => {
    navigate(`/messages?chat=${sellerId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Étudiante</h1>
          <p className="text-gray-500 text-sm">Achetez et vendez entre étudiants en toute sécurité.</p>
        </div>
        <button 
          onClick={() => setShowSellModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-100"
        >
          <Plus size={16} />
          Vendre un article
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Trier par:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="date-desc">Plus récents</option>
            <option value="date-asc">Plus anciens</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </div>
        <div className="flex overflow-x-auto pb-2 md:pb-0 gap-3 no-scrollbar">
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                selectedCategory === cat 
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" 
                  : "bg-white border border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
            <div className="aspect-square bg-gray-200 relative overflow-hidden">
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-gray-900 shadow-sm">
                {item.category.toUpperCase()}
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
              </div>
              <p className="text-emerald-700 font-bold text-lg mb-2">{item.price.toLocaleString()} CFA</p>
              <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{item.description}</p>
              
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-4">
                <MapPin size={12} />
                {item.location}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <img src={item.seller.avatarUrl} alt="" className="w-6 h-6 rounded-full bg-gray-100" />
                  <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{item.seller.firstName}</span>
                </div>
                <button 
                  onClick={() => handleContact(item.seller.id)}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
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
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Aucun article trouvé</h3>
          <p className="text-gray-500">Essayez de modifier vos filtres ou votre recherche.</p>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {showPayment ? (
            <MobileMoneyPayment 
              amount={1000} 
              onSuccess={handlePaymentSuccess} 
              onCancel={() => setShowPayment(false)}
              title="Abonnement Vendeur Marketplace"
            />
          ) : (
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Vendre un article</h2>
                <button onClick={resetSellForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              {!isSubscriptionActive ? (
                <div className="space-y-6 py-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
                    <AlertCircle size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">Abonnement requis</h3>
                    <p className="text-sm text-gray-500">
                      Pour vendre sur la marketplace, vous devez activer un abonnement vendeur de 30 jours.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Durée</span>
                      <span className="text-sm font-bold text-gray-900">30 Jours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Prix</span>
                      <span className="text-sm font-bold text-emerald-600">1 000 CFA</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPayment(true)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={18} />
                    Payer via Mobile Money (1 000 CFA)
                  </button>
                </div>
              ) : (
                <form className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Titre de l'annonce</label>
                    <input 
                      type="text" 
                      value={sellTitle}
                      onChange={(e) => setSellTitle(e.target.value)}
                      placeholder="Ex: iPhone 12 Pro Max" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700">Prix (CFA)</label>
                      <input 
                        type="number" 
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        placeholder="0" 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700">Catégorie</label>
                      <select 
                        value={sellCategory}
                        onChange={(e) => setSellCategory(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                      >
                        {categories.filter(c => c !== 'Tout').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <textarea 
                      value={sellDescription}
                      onChange={(e) => setSellDescription(e.target.value)}
                      placeholder="Décrivez votre article..." 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 h-24 resize-none"
                    ></textarea>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Photo de l'article</label>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors cursor-pointer overflow-hidden relative min-h-[100px] flex flex-col items-center justify-center"
                    >
                      {sellImage ? (
                        <img src={sellImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <Plus size={24} className="mx-auto text-gray-400 mb-2" />
                          <span className="text-xs text-gray-500">Ajouter une photo</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handlePublish}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                  >
                    Publier l'annonce
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

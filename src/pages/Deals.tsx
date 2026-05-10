import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Deal } from '@/types';
import { 
  Tag, 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  Building2, 
  Percent, 
  ChevronRight,
  Utensils,
  Car,
  Ticket,
  BookOpen,
  Wrench,
  MoreHorizontal,
  Lock,
  X,
  Send,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { dealService } from '@/services/dealService';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: Tag },
  { id: 'food', label: 'Restauration', icon: Utensils },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'leisure', label: 'Loisirs', icon: Ticket },
  { id: 'education', label: 'Éducation', icon: BookOpen },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'other', label: 'Autres', icon: MoreHorizontal },
];

export default function Deals() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'deals'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dealsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Deal[];
      setDeals(dealsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || deal.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <div className="bg-slate-900 pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6"
              >
                <Percent size={14} />
                Exclusivités Étudiantes
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-5xl font-display font-black text-white tracking-tight mb-4"
              >
                Bons Plans & <span className="text-emerald-400">Réductions</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base text-slate-400 leading-relaxed"
              >
                Profitez de tarifs préférentiels chez nos partenaires sélectionnés pour faciliter votre vie étudiante au quotidien.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl md:w-80"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Tag size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{deals.length}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Offres Actives</div>
                </div>
              </div>
              <p className="text-sm text-slate-400">
                Économisez en moyenne <span className="text-emerald-400 font-bold">15 000 CFA</span> par mois grâce à nos offres.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        {/* Filters & Search */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-3 md:p-4 mb-8 border border-slate-100">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher une offre, un partenaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                    selectedCategory === cat.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20"
                      : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                  )}
                >
                  <cat.icon size={14} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredDeals.map((deal, index) => (
                <motion.div
                  key={deal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all overflow-hidden flex flex-col"
                >
                  {/* Image Header */}
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={deal.imageUrl || `https://picsum.photos/seed/${deal.id}/800/600`}
                      alt={deal.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <div className="px-2 py-1 rounded-lg bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {deal.discountValue}
                      </div>

                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-lg">
                        <img 
                          src={deal.partnerLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(deal.partnerName)}&background=random`}
                          alt={deal.partnerName}
                          className="w-full h-full object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold truncate">{deal.partnerName}</div>
                        <div className="text-white/70 text-xs truncate">Partenaire Officiel</div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                      {deal.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">
                      {deal.description}
                    </p>

                    <div className="mt-auto space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock size={12} />
                          {deal.validUntil && !isNaN(new Date(deal.validUntil).getTime()) 
                            ? `Expire le ${new Date(deal.validUntil).toLocaleDateString()}` 
                            : 'Offre permanente'}
                        </div>
                        <div className="text-emerald-600 flex items-center gap-1">
                          <Building2 size={12} />
                          {CATEGORIES.find(c => c.id === deal.category)?.label || deal.category}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {deal.promoCode && (
                          <div className="flex-1 px-3 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-widest">Code Promo</span>
                            <span className="text-base font-mono font-black text-slate-900 tracking-widest">{deal.promoCode}</span>
                          </div>
                        )}
                        {deal.linkUrl && (
                          <a 
                            href={deal.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 text-sm"
                          >
                            Profiter
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-6">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Aucun bon plan trouvé</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Nous n'avons trouvé aucune offre correspondant à vos critères. Essayez de modifier votre recherche ou de changer de catégorie.
            </p>
          </div>
        )}

        {/* Suggest a Deal */}
        <div className="mt-12 bg-emerald-600 rounded-3xl p-6 md:p-10 relative overflow-hidden shadow-2xl shadow-emerald-600/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-display font-black text-white mb-3">
                Vous connaissez un bon plan ?
              </h2>
              <p className="text-sm text-emerald-50 leading-relaxed opacity-90">
                Aidez la communauté en partageant des réductions ou des offres spéciales pour les étudiants. Nous vérifierons l'offre avec le partenaire.
              </p>
            </div>
            <button 
              onClick={() => setIsSuggestModalOpen(true)}
              className="px-6 py-3.5 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-xl shrink-0 text-sm"
            >
              Suggérer une offre
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <SuggestDealModal 
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
      />
    </div>
  );
}

function SuggestDealModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    partnerName: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vous devez être connecté pour suggérer une offre');
      return;
    }

    setIsSubmitting(true);
    try {
      await dealService.suggestDeal({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        title: formData.title,
        partnerName: formData.partnerName,
        description: formData.description
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({ title: '', partnerName: '', description: '' });
      }, 2000);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="text-emerald-600" size={24} />
            Suggérer un bon plan
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Merci !</h3>
            <p className="text-gray-500">
              Votre suggestion a été envoyée avec succès. Notre équipe va l'étudier rapidement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre de l'offre</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: -20% sur les menus étudiants"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nom du partenaire</label>
              <input
                type="text"
                required
                value={formData.partnerName}
                onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: Restaurant Le Gourmet"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description & Détails</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm resize-none"
                placeholder="Expliquez l'offre et comment en profiter..."
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Envoyer la suggestion
                    <Send size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User as UserType } from '@/types';
import { Search, GraduationCap, Users, MessageSquare, UserPlus, Loader2, Share, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function FindClassmates() {
  const { user } = useAuth();
  const [classmates, setClassmates] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'promotion' | 'major' | 'university'>('promotion');
  const [showToast, setShowToast] = useState(false);

  const handleInvite = async () => {
    const shareData = {
      title: 'CampusBF',
      text: 'Rejoins-moi sur CampusBF, la plateforme pour les étudiants ! Retrouvons-nous ici.',
      url: window.location.origin,
    };

    const copyToClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(window.location.origin);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = window.location.origin;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        console.error('Erreur lors de la copie:', err);
      }
    };

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  useEffect(() => {
    const fetchClassmates = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const profilesRef = collection(db, 'profiles');
        let q;

        console.log("Fetching classmates with filter:", filter);
        console.log("User criteria:", {
          university: user.university,
          major: user.major,
          promotion: user.promotion
        });

        if (filter === 'promotion') {
          q = query(
            profilesRef, 
            where('university', '==', user.university || ''),
            where('major', '==', user.major || ''),
            where('promotion', '==', user.promotion || '')
          );
        } else if (filter === 'major') {
          q = query(
            profilesRef, 
            where('university', '==', user.university || ''),
            where('major', '==', user.major || '')
          );
        } else {
          q = query(
            profilesRef, 
            where('university', '==', user.university || '')
          );
        }

        const querySnapshot = await getDocs(q);
        console.log("Query results count:", querySnapshot.size);

        const results = querySnapshot.docs
          .map(doc => {
            const data = doc.data() as any;
            return { id: doc.id, ...data } as UserType;
          })
          .filter(u => u.id !== user.id); // Exclude current user
        
        console.log("Filtered results count (excluding self):", results.length);
        setClassmates(results);
      } catch (error) {
        console.error("Error fetching classmates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassmates();
  }, [user, filter]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Veuillez vous connecter pour voir vos camarades.</p>
      </div>
    );
  }

  const hasIncompleteProfile = !user.university || !user.major || !user.promotion;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
            <CheckCircle2 size={20} />
            <span className="font-medium">Lien de partage copié !</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Trouver mes camarades</h1>
          <p className="text-slate-500 mt-1">Retrouvez les étudiants de votre promotion, filière ou université.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleInvite}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2"
            title="Inviter vos amis à rejoindre CampusBF"
          >
            <Share size={16} />
            <span className="hidden sm:inline">Inviter des amis</span>
            <span className="sm:hidden">Inviter</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilter('promotion')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === 'promotion' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Promotion
            </button>
            <button
              onClick={() => setFilter('major')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === 'major' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Filière
            </button>
            <button
              onClick={() => setFilter('university')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === 'university' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Université
            </button>
          </div>
        </div>
      </div>

      {hasIncompleteProfile && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Search size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">Profil incomplet</h3>
            <p className="text-amber-700 text-sm mt-1">
              Pour trouver vos camarades, vous devez renseigner votre université, votre filière et votre promotion dans votre profil.
            </p>
            <Link to="/profile" className="text-amber-600 text-sm font-medium hover:underline mt-2 inline-block">
              Compléter mon profil
            </Link>
          </div>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
          <GraduationCap size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-emerald-900">Votre profil académique</h3>
          <p className="text-emerald-700 text-sm mt-1">
            {user.university || 'Non renseignée'} • {user.major || 'Non renseignée'} • {user.level || 'Non renseigné'} {user.promotion ? `• Promotion ${user.promotion}` : ''}
          </p>
          <div className="flex gap-4 mt-2">
            <Link to="/profile" className="text-emerald-600 text-sm font-medium hover:underline">
              Modifier mon profil
            </Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-500">Recherche de vos camarades...</p>
        </div>
      ) : classmates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classmates.map((classmate, index) => (
            <motion.div
              key={classmate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img
                    src={classmate.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${classmate.firstName}`}
                    alt={`${classmate.firstName} ${classmate.lastName}`}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-50 group-hover:ring-emerald-50 transition-all"
                  />
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white">
                    <Users size={12} />
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-900 text-lg">
                  {classmate.firstName} {classmate.lastName}
                </h3>
                <p className="text-emerald-600 text-sm font-medium mb-2">{classmate.level}</p>
                
                <div className="space-y-1 mb-6">
                  <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
                    <GraduationCap size={14} />
                    {classmate.major}
                  </p>
                  <p className="text-slate-400 text-xs italic">
                    {classmate.university}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <Link
                    to={`/messages?userId=${classmate.id}`}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    Message
                  </Link>
                  <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
                    <UserPlus size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-6">
            <Users size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun camarade trouvé</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Nous n'avons pas trouvé d'autres étudiants correspondant à vos critères pour le moment. 
            Invitez vos amis à rejoindre CampusBF !
          </p>
          <button 
            onClick={handleInvite}
            className="mt-8 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-medium transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 mx-auto"
          >
            <Share size={18} />
            Inviter des amis
          </button>
        </div>
      )}
    </div>
  );
}

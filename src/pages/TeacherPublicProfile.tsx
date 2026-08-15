import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, BookOpen, Video, FileText, Star, MapPin, Mail, Phone, 
  CheckCircle2, Users, Calendar, Award, Shield, ArrowLeft, MessageSquare, Send, Heart, UserPlus, UserCheck, Sparkles 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';

export default function TeacherPublicProfile() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { user, addTeacherReview } = useAuth();
  
  const [teacher, setTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'presentation' | 'videos' | 'courses' | 'td_tp' | 'trainings' | 'reviews'>('presentation');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Content state
  const [videos, setVideos] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  // Messaging / Tutoring modals
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgContent, setMsgContent] = useState('');
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [tutorSubject, setTutorSubject] = useState('');
  const [tutorType, setTutorType] = useState('séance individuelle');
  const [tutorProblem, setTutorProblem] = useState('');

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (!teacherId) return;
    const fetchTeacherData = async () => {
      try {
        const docRef = doc(db, 'users', teacherId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const tData = { id: docSnap.id, ...docSnap.data() } as User;
          setTeacher(tData);
        }

        // Fetch followers
        const followersSnap = await getDocs(collection(db, `users/${teacherId}/followers`));
        setFollowersCount(followersSnap.size);
        if (user) {
          const isF = followersSnap.docs.some(d => d.id === user.id);
          setIsFollowing(isF);
        }

        // Fetch teacher contents (videos, courses, etc.)
        const vSnap = await getDocs(query(collection(db, 'videos'), where('creatorId', '==', teacherId)));
        setVideos(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const cSnap = await getDocs(query(collection(db, 'documents'), where('creatorId', '==', teacherId)));
        setCourses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const trSnap = await getDocs(query(collection(db, 'trainings'), where('instructorId', '==', teacherId)));
        setTrainings(trSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const rSnap = await getDocs(collection(db, `users/${teacherId}/reviews`));
        setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error("Error loading teacher profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, [teacherId, user]);

  const toggleFollow = async () => {
    if (!user || !teacherId) {
      alert("Veuillez vous connecter pour suivre cet enseignant.");
      return;
    }
    const followerRef = doc(db, `users/${teacherId}/followers`, user.id);
    try {
      if (isFollowing) {
        await deleteDoc(followerRef);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await setDoc(followerRef, { userId: user.id, followedAt: serverTimestamp() });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (e) {
      console.error("Error toggling follow:", e);
    }
  };

  const handleSendMessage = async () => {
    if (!msgContent.trim() || !user || !teacherId) return;
    const convId = [user.id, teacherId].sort().join('_');
    try {
      await addDoc(collection(db, `conversations/${convId}/messages`), {
        senderId: user.id,
        receiverId: teacherId,
        content: msgContent,
        timestamp: serverTimestamp(),
        read: false
      });
      await setDoc(doc(db, 'conversations', convId), {
        participants: [user.id, teacherId],
        lastMessage: { content: msgContent, senderId: user.id, timestamp: new Date().toISOString() },
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Message envoyé avec succès !");
      setMsgContent('');
      setShowMsgModal(false);
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const handleRequestTutoring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !teacherId) return;
    try {
      await addDoc(collection(db, 'tutoringRequests'), {
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        teacherId: teacherId,
        subject: tutorSubject,
        type: tutorType,
        problem: tutorProblem,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert("Demande de tutorat envoyée avec succès à l'enseignant !");
      setShowTutorModal(false);
      setTutorSubject('');
      setTutorProblem('');
    } catch (e) {
      console.error("Error requesting tutoring:", e);
      alert("Erreur lors de l'envoi de la demande.");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim() || !teacherId) return;
    try {
      await addTeacherReview(teacherId, reviewRating, reviewComment);
      const rSnap = await getDocs(collection(db, `users/${teacherId}/reviews`));
      setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReviewComment('');
      alert("Avis publié avec succès !");
    } catch (e) {
      console.error("Error adding review:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 v-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!teacher || !teacher.teacherProfile) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Enseignant introuvable</h2>
        <p className="text-slate-600">Ce profil enseignant n'existe pas ou n'est plus actif.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">Retour</button>
      </div>
    );
  }

  const profile = teacher.teacherProfile;
  const avgRating = reviews.length ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : '4.8';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft size={16} /> Retour
      </button>

      {/* Hero Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <img 
            src={teacher.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"} 
            alt="" 
            className="w-32 h-32 rounded-3xl object-cover border-4 border-white/20 shadow-lg bg-slate-800"
          />
          <div className="space-y-3 text-center md:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">
                {teacher.firstName} {teacher.lastName}
              </h1>
              {teacher.teacherStatus === 'approved' && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                  <CheckCircle2 size={14} /> Enseignant Vérifié
                </span>
              )}
            </div>

            <p className="text-emerald-400 font-semibold text-base">
              {profile.academicRank} • {teacher.university || 'Université de Ouagadougou'}
            </p>

            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {profile.biography || "Enseignant-chercheur passionné par la transmission des savoirs et l'excellence académique au Burkina Faso."}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl">
                <Video size={14} className="text-emerald-400" /> {videos.length} vidéos
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl">
                <BookOpen size={14} className="text-emerald-400" /> {courses.length} cours
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl">
                <Users size={14} className="text-emerald-400" /> {followersCount} abonnés
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl">
                <Star size={14} className="text-amber-400 fill-amber-400" /> {avgRating} ({reviews.length} avis)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto">
            <button
              onClick={toggleFollow}
              className={cn(
                "px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg",
                isFollowing 
                  ? "bg-white/10 text-white hover:bg-white/20 border border-white/20" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
              )}
            >
              {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {isFollowing ? "Abonné" : "+ Suivre"}
            </button>
            <button
              onClick={() => setShowMsgModal(true)}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/20"
            >
              <MessageSquare size={16} /> Contacter
            </button>
            <button
              onClick={() => setShowTutorModal(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <GraduationCap size={16} /> Demander un Tutorat
            </button>
          </div>
        </div>

        {/* Specialties tags */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Spécialités :</span>
          {profile.specialties?.map((s, idx) => (
            <span key={idx} className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-medium">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'presentation', label: 'Présentation & Parcours', icon: Award },
          { id: 'videos', label: `Vidéos (${videos.length})`, icon: Video },
          { id: 'courses', label: `Cours & Docs (${courses.length})`, icon: BookOpen },
          { id: 'trainings', label: `Formations (${trainings.length})`, icon: GraduationCap },
          { id: 'reviews', label: `Avis (${reviews.length})`, icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 py-3 px-5 font-bold text-sm border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'presentation' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Biographie & Expertise</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {profile.biography || "Aucune biographie renseignée."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Domaines d'Enseignement</p>
                    <p className="text-sm font-semibold text-slate-800">{profile.domains?.join(', ') || 'Non spécifié'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expérience</p>
                    <p className="text-sm font-semibold text-slate-800">{profile.yearsOfExperience || 5} années d'expérience</p>
                  </div>
                </div>
              </div>

              {profile.publications && profile.publications.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Publications & Travaux de Recherche</h3>
                  <div className="space-y-3">
                    {profile.publications.map((pub, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-start gap-3">
                        <FileText size={20} className="text-emerald-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{typeof pub === 'string' ? pub : (pub as any).title}</p>
                          <p className="text-xs text-slate-500 mt-1">{typeof pub === 'string' ? 'Publication universitaire officielle' : `${(pub as any).journal} (${(pub as any).year})`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Disponibilité</h3>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">Statut actuel</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold">
                      {profile.availability?.isAvailable ? "Disponible" : "Occupé"}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Disponible pour tutorat, encadrement de projets et mentorat académique.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {videos.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">Aucune vidéo publiée pour le moment.</div>
            ) : (
              videos.map((vid) => (
                <div key={vid.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className="aspect-video bg-slate-900 relative">
                    <img src={vid.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"} alt="" className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                        <Video size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-slate-900 text-base line-clamp-1">{vid.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{vid.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {courses.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">Aucun cours ou document publié.</div>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3 hover:shadow-md transition-all">
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl w-fit">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{course.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{course.description}</p>
                  <button 
                    onClick={() => navigate('/documents')}
                    className="w-full py-2 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all text-slate-700"
                  >
                    Consulter le document
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'trainings' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {trainings.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">Aucune formation proposée pour le moment.</div>
            ) : (
              trainings.map((tr) => (
                <div key={tr.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{tr.level || 'Tous niveaux'}</span>
                    <span className="font-bold text-emerald-700 text-sm">{tr.price ? `${tr.price} FCFA` : 'Gratuit'}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{tr.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{tr.description}</p>
                  <button 
                    onClick={() => navigate('/trainings')}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                  >
                    Voir la formation
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-base mb-4">Laisser un avis à l'enseignant</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Note (1 à 5 étoiles)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          reviewRating >= star ? "text-amber-400 bg-amber-50" : "text-slate-300 bg-slate-100"
                        )}
                      >
                        <Star size={20} className={reviewRating >= star ? "fill-amber-400" : ""} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Votre commentaire pédagogique</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Qualité pédagogique, clarté, disponibilité..."
                    className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md">
                  Publier l'avis
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{rev.userName || 'Étudiant CampusBF'}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMsgModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Contacter {teacher.firstName} {teacher.lastName}</h3>
            <textarea
              rows={4}
              value={msgContent}
              onChange={(e) => setMsgContent(e.target.value)}
              placeholder="Écrivez votre message..."
              className="w-full p-3 rounded-2xl border border-slate-200 text-sm"
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowMsgModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Annuler</button>
              <button onClick={handleSendMessage} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Send size={14} /> Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutoring Request Modal */}
      {showTutorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Demande de Tutorat</h3>
            <form onSubmit={handleRequestTutoring} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Matière / Sujet</label>
                <input 
                  type="text" 
                  value={tutorSubject} 
                  onChange={(e) => setTutorSubject(e.target.value)} 
                  placeholder="Ex: Analyse mathématique, Python..." 
                  className="w-full p-3 rounded-xl border text-sm"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type d'accompagnement</label>
                <select 
                  value={tutorType} 
                  onChange={(e) => setTutorType(e.target.value)}
                  className="w-full p-3 rounded-xl border text-sm bg-white"
                >
                  <option value="question ponctuelle">Question ponctuelle</option>
                  <option value="séance individuelle">Séance individuelle</option>
                  <option value="aide aux devoirs">Aide aux devoirs</option>
                  <option value="préparation examen">Préparation examen</option>
                  <option value="accompagnement mémoire">Accompagnement mémoire</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description du problème / Objectif</label>
                <textarea 
                  rows={3} 
                  value={tutorProblem} 
                  onChange={(e) => setTutorProblem(e.target.value)} 
                  placeholder="Détaillez vos besoins..." 
                  className="w-full p-3 rounded-xl border text-sm"
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTutorModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Envoyer la demande</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

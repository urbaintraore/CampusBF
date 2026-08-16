import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, limit, addDoc, onSnapshot, updateDoc, where } from 'firebase/firestore';
import { AlumniProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { Check, X, Clock, Send, Users } from 'lucide-react';

export default function AlumniMentorship() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [bio, setBio] = useState('');
  const [topics, setTopics] = useState('');
  const [availability, setAvailability] = useState('');

  // Mentorship request modal state
  const [selectedMentor, setSelectedMentor] = useState<AlumniProfile | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [mentorshipRequests, setMentorshipRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchAlumni();
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'mentorshipRequests'), (snap) => {
      setMentorshipRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const fetchAlumni = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, 'alumniProfiles'), limit(50)));
      const alumniData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlumniProfile));
      setAlumni(alumniData);
    } catch (error) {
      console.error("Error fetching mentors:", error);
    }
  };

  const handleRegister = async () => {
    if (!user) return;
    try {
      const profileData: AlumniProfile = {
        id: user.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userAvatarUrl: user.avatarUrl,
        bio,
        mentorshipTopics: topics.split(',').map(t => t.trim()),
        availability,
      };
      await setDoc(doc(db, 'alumniProfiles', user.id), profileData);
      setIsRegistering(false);
      setBio('');
      setTopics('');
      setAvailability('');
      fetchAlumni();
      toast.success("Profil de mentor enregistré avec succès !");
    } catch (error) {
      console.error("Error registering as mentor:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMentor) return;
    try {
      await addDoc(collection(db, 'mentorshipRequests'), {
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        studentAvatar: user.avatarUrl,
        mentorId: selectedMentor.userId,
        mentorName: selectedMentor.userName,
        message: requestMessage,
        status: 'pending', // pending, accepted, refused
        createdAt: new Date().toISOString()
      });
      setSelectedMentor(null);
      setRequestMessage('');
      toast.success("Demande de mentorat envoyée avec succès !");
    } catch (error) {
      console.error("Error sending mentorship request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: 'accepted' | 'refused') => {
    try {
      await updateDoc(doc(db, 'mentorshipRequests', requestId), {
        status: newStatus
      });
      toast.success(newStatus === 'accepted' ? "Demande acceptée !" : "Demande refusée.");
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const incomingRequests = mentorshipRequests.filter(r => r.mentorId === user?.id);
  const myRequests = mentorshipRequests.filter(r => r.studentId === user?.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mentorat & Accompagnement</h1>
          <p className="text-slate-500 mt-1">Connectez-vous avec des mentors qualifiés pour guider votre parcours universitaire et professionnel.</p>
        </div>
        {user && (['admin', 'teacher', 'parent', 'institution', 'alumni'].includes(user.role) || (user.role === 'student' && (user.level?.startsWith('M') || user.level?.startsWith('D')))) && (
          <button 
            onClick={() => setIsRegistering(!isRegistering)} 
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2",
              isRegistering 
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-slate-200/20" 
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {isRegistering ? 'Annuler' : 'Devenir Mentor'}
          </button>
        )}
      </div>

      {/* Incoming Requests for Mentors */}
      {incomingRequests.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Users size={20} className="text-emerald-600" /> Demandes de mentorat reçues ({incomingRequests.length})
          </h3>
          <div className="space-y-3">
            {incomingRequests.map(req => (
              <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{req.studentName}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      req.status === 'pending' && "bg-amber-100 text-amber-700",
                      req.status === 'accepted' && "bg-emerald-100 text-emerald-700",
                      req.status === 'refused' && "bg-rose-100 text-rose-700"
                    )}>
                      {req.status === 'pending' && 'En attente'}
                      {req.status === 'accepted' && 'Acceptée'}
                      {req.status === 'refused' && 'Refusée'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{req.message}"</p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'accepted')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-700"
                    >
                      <Check size={14} /> Accepter
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'refused')}
                      className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-rose-100"
                    >
                      <X size={14} /> Refuser
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Requests as Student */}
      {user?.role === 'student' && myRequests.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Clock size={20} className="text-indigo-600" /> Mes demandes de mentorat envoyées ({myRequests.length})
          </h3>
          <div className="space-y-3">
            {myRequests.map(req => (
              <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Mentor : {req.mentorName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Message : "{req.message}"</p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  req.status === 'pending' && "bg-amber-100 text-amber-700",
                  req.status === 'accepted' && "bg-emerald-100 text-emerald-700",
                  req.status === 'refused' && "bg-rose-100 text-rose-700"
                )}>
                  {req.status === 'pending' && 'En attente'}
                  {req.status === 'accepted' && 'Accepté 🎉'}
                  {req.status === 'refused' && 'Refusé'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isRegistering && (
        <div className="glass p-8 rounded-3xl border border-emerald-200/50 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 text-lg">✨</span>
            Partagez votre expérience
          </h2>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Votre biographie professionnelle / académique</label>
              <textarea 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                placeholder="Décrivez votre parcours et ce que vous pouvez apporter..." 
                className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all h-32 resize-none" 
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">Sujets de mentorat (séparés par des virgules)</label>
                <input 
                  value={topics} 
                  onChange={e => setTopics(e.target.value)} 
                  placeholder="Ex: Orientation, Stage, Entrepreneuriat" 
                  className="w-full px-4 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">Disponibilité</label>
                <input 
                  value={availability} 
                  onChange={e => setAvailability(e.target.value)} 
                  placeholder="Ex: Soirs de semaine, Week-end" 
                  className="w-full px-4 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleRegister} 
                className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                Enregistrer mon profil de mentor
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alumni.map((alum) => (
          <div key={alum.id} className="glass p-6 rounded-3xl border border-white/40 shadow-sm hover:shadow-xl hover:border-emerald-200/50 transition-all duration-300 group flex flex-col h-full">
            <div className="flex items-start gap-5 mb-6">
              <img 
                src={alum.userAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(alum.userName)}&background=random`} 
                alt={alum.userName} 
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-sm group-hover:ring-emerald-50 transition-all" 
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{alum.userName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Mentor</span>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    {alum.availability}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-grow italic">
              "{alum.bio}"
            </p>

            <div className="space-y-4 pt-6 border-t border-white/40">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {alum.mentorshipTopics.map((topic, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white/60 border border-slate-200/60 text-slate-700 text-[11px] rounded-lg font-medium group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200/50 transition-colors">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSelectedMentor(alum)}
                  className="py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Send size={14} /> Demander Mentorat
                </button>
                <button 
                  onClick={() => navigate(`/messages?userId=${alum.userId}`)}
                  className="py-3 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  Contacter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMentor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Demander un mentorat</h3>
                <p className="text-xs text-slate-500 mt-1">Envoyez une demande à Pr./Mentor {selectedMentor.userName}</p>
              </div>
              <button onClick={() => setSelectedMentor(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Votre message / motivation</label>
                <textarea
                  required
                  rows={4}
                  value={requestMessage}
                  onChange={e => setRequestMessage(e.target.value)}
                  placeholder="Expliquez brièvement pourquoi vous souhaitez être mentoré par cette personne..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md"
                >
                  Envoyer la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alumni.length === 0 && !isRegistering && (
        <div className="text-center py-20 glass rounded-3xl border border-dashed border-slate-300">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <span className="text-4xl">🤝</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Aucun mentor pour le moment</h3>
          <p className="text-slate-500 mt-2">Soyez le premier à partager votre expérience avec la communauté !</p>
          {user && (['admin', 'teacher', 'parent', 'institution'].includes(user.role) || (user.role === 'student' && (user.level?.startsWith('M') || user.level?.startsWith('D')))) && (
            <button 
              onClick={() => setIsRegistering(true)}
              className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
            >
              Devenir Mentor
            </button>
          )}
        </div>
      )}
    </div>
  );
}

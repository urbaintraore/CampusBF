import React, { useState, useMemo } from 'react';
import { Search, Filter, MapPin, GraduationCap, BookOpen, Clock, Star, Mail, Lock, CheckCircle2, Briefcase, Phone, X, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';
import { cn } from '@/lib/utils';

export default function TeachersDirectory() {
  const { user, users, submitSubscriptionRequest, addTeacherReview } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('Tous');
  const [rankFilter, setRankFilter] = useState('Tous');
  const [availabilityFilter, setAvailabilityFilter] = useState('Tous');
  
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.teacherProfile), [users]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const profile = teacher.teacherProfile!;
      const matchesSearch = 
        `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDomain = domainFilter === 'Tous' || profile.domains.includes(domainFilter);
      const matchesRank = rankFilter === 'Tous' || profile.academicRank === rankFilter;
      const matchesAvailability = availabilityFilter === 'Tous' || 
        (availabilityFilter === 'Disponible' ? profile.availability.isAvailable : !profile.availability.isAvailable);

      return matchesSearch && matchesDomain && matchesRank && matchesAvailability;
    });
  }, [teachers, searchTerm, domainFilter, rankFilter, availabilityFilter]);

  const domains = ['Tous', ...Array.from(new Set(teachers.flatMap(t => t.teacherProfile!.domains)))];
  const ranks = ['Tous', 'Assistant', 'Maître Assistant', 'Maître de Conférences', 'Professeur Titulaire'];

  const isInstitution = user?.role === 'institution';
  const isAdmin = user?.role === 'admin';
  const hasActiveSubscription = isAdmin || (isInstitution && user?.institutionProfile?.subscriptionStatus === 'active');
  const isPendingSubscription = isInstitution && user?.institutionProfile?.subscriptionStatus === 'pending';

  const handleSubscribe = () => {
    if (window.confirm("Voulez-vous souscrire à l'abonnement Établissement (50 000 FCFA / an) pour accéder aux coordonnées complètes des enseignants ?")) {
      submitSubscriptionRequest('institution', 50000);
      alert('Demande d\'abonnement envoyée ! En attente de validation par un administrateur.');
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    alert('Message envoyé avec succès à ' + selectedTeacher?.firstName);
    setMessageText('');
    setShowMessageModal(false);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim() || !selectedTeacher) return;
    addTeacherReview(selectedTeacher.id, reviewRating, reviewComment);
    setReviewComment('');
    setReviewRating(5);
    alert('Avis ajouté avec succès !');
    // Update local selectedTeacher to show the new review immediately
    setSelectedTeacher(prev => {
      if (!prev || !prev.teacherProfile) return prev;
      return {
        ...prev,
        teacherProfile: {
          ...prev.teacherProfile,
          reviews: [
            ...(prev.teacherProfile.reviews || []),
            {
              id: `rev-${Date.now()}`,
              authorId: user?.id || '',
              authorName: user ? `${user.firstName} ${user.lastName}` : 'Anonyme',
              rating: reviewRating,
              comment: reviewComment,
              createdAt: new Date().toISOString()
            }
          ]
        }
      };
    });
  };

  const calculateAverageRating = (teacher: User) => {
    const reviews = teacher.teacherProfile?.reviews || [];
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Briefcase size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Annuaire des Enseignants</h1>
          </div>
          <p className="text-slate-500 text-sm">Trouvez et contactez des enseignants universitaires pour des vacations ou collaborations.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Rechercher par nom, spécialité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <select 
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm min-w-[150px]"
          >
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm min-w-[150px]"
          >
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select 
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm min-w-[150px]"
          >
            <option value="Tous">Toutes disponibilités</option>
            <option value="Disponible">Disponible pour vacation</option>
            <option value="Indisponible">Indisponible</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map(teacher => (
          <div key={teacher.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <img src={teacher.avatarUrl} alt={teacher.firstName} className="w-16 h-16 rounded-full bg-slate-100 object-cover" />
              <div>
                <h3 className="font-bold text-slate-900">{teacher.firstName} {teacher.lastName}</h3>
                <p className="text-sm text-blue-600 font-medium">{teacher.teacherProfile?.academicRank}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin size={12} />
                  {teacher.university}
                </div>
              </div>
            </div>
            
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Spécialités</p>
                <div className="flex flex-wrap gap-1">
                  {teacher.teacherProfile?.specialties.slice(0, 3).map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">{s}</span>
                  ))}
                  {(teacher.teacherProfile?.specialties.length || 0) > 3 && (
                    <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">+{teacher.teacherProfile!.specialties.length - 3}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-slate-400" />
                  {teacher.teacherProfile?.yearsOfExperience} ans d'exp.
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen size={16} className="text-slate-400" />
                  {teacher.teacherProfile?.publications.length} pub.
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-medium">
                  <Star size={16} className="fill-current" />
                  {calculateAverageRating(teacher)} ({teacher.teacherProfile?.reviews?.length || 0})
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", teacher.teacherProfile?.availability.isAvailable ? "bg-emerald-500" : "bg-slate-300")}></div>
                <span className="text-xs font-medium text-slate-600">
                  {teacher.teacherProfile?.availability.isAvailable ? "Disponible" : "Indisponible"}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTeacher(teacher)}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Voir profil
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun enseignant trouvé</h3>
          <p className="text-slate-500">Essayez de modifier vos filtres de recherche.</p>
        </div>
      )}

      {/* Teacher Profile Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-slate-900">Profil Enseignant</h2>
              <button onClick={() => setSelectedTeacher(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <img src={selectedTeacher.avatarUrl} alt={selectedTeacher.firstName} className="w-24 h-24 rounded-full bg-slate-100 object-cover border-4 border-white shadow-md" />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900">{selectedTeacher.firstName} {selectedTeacher.lastName}</h1>
                  <p className="text-lg text-blue-600 font-medium mb-2">{selectedTeacher.teacherProfile?.academicRank}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><MapPin size={16} className="text-slate-400"/> {selectedTeacher.university}</span>
                    <span className="flex items-center gap-1"><Clock size={16} className="text-slate-400"/> {selectedTeacher.teacherProfile?.yearsOfExperience} ans d'expérience</span>
                  </div>
                </div>
                
                {/* Contact Action */}
                <div className="w-full md:w-auto">
                  {hasActiveSubscription ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        Coordonnées
                      </h4>
                      <div className="space-y-2 text-sm">
                        <a href={`mailto:${selectedTeacher.email}`} className="flex items-center gap-2 text-emerald-700 hover:underline">
                          <Mail size={16} /> {selectedTeacher.email}
                        </a>
                        <a href={`tel:${selectedTeacher.phone}`} className="flex items-center gap-2 text-emerald-700 hover:underline">
                          <Phone size={16} /> {selectedTeacher.phone}
                        </a>
                      </div>
                      <button 
                        onClick={() => setShowMessageModal(true)}
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={18} />
                        Envoyer un message
                      </button>
                    </div>
                  ) : isPendingSubscription ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3">
                      <Clock size={24} className="mx-auto text-amber-400" />
                      <h4 className="text-sm font-bold text-amber-900">Abonnement en cours</h4>
                      <p className="text-xs text-amber-700">Votre demande est en cours de traitement par l'administration.</p>
                    </div>
                  ) : isInstitution ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3">
                      <Lock size={24} className="mx-auto text-slate-400" />
                      <h4 className="text-sm font-bold text-slate-900">Accès Restreint</h4>
                      <p className="text-xs text-slate-500">Abonnez-vous pour accéder aux coordonnées et contacter cet enseignant.</p>
                      <button 
                        onClick={handleSubscribe}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        S'abonner
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                      <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                        <MessageSquare size={16} className="text-emerald-500" />
                        Contact Étudiant
                      </h4>
                      <p className="text-xs text-emerald-700">Vous pouvez envoyer un message direct à cet enseignant pour des questions ou du tutorat.</p>
                      <button 
                        onClick={() => setShowMessageModal(true)}
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={18} />
                        Envoyer un message
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Biography */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Biographie</h3>
                <p className="text-slate-600 leading-relaxed">{selectedTeacher.teacherProfile?.biography}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Specialties & Domains */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Star size={20} className="text-amber-500" />
                      Domaines & Spécialités
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">Domaines</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTeacher.teacherProfile?.domains.map((d, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">{d}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">Spécialités</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTeacher.teacherProfile?.specialties.map((s, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <GraduationCap size={20} className="text-indigo-500" />
                      Matières enseignées
                    </h3>
                    <ul className="space-y-2">
                      {selectedTeacher.teacherProfile?.courses.map((c, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Publications & Availability */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <BookOpen size={20} className="text-rose-500" />
                      Publications Récentes
                    </h3>
                    <div className="space-y-3">
                      {selectedTeacher.teacherProfile?.publications.length ? (
                        selectedTeacher.teacherProfile.publications.map((pub, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-900 text-sm mb-1">{pub.title}</h4>
                            <p className="text-xs text-slate-500">{pub.journal} • {pub.year}</p>
                            {pub.link && <a href={pub.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Voir la publication →</a>}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">Aucune publication renseignée.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Clock size={20} className="text-emerald-500" />
                      Disponibilités
                    </h3>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Statut actuel</span>
                        <span className={cn("px-2 py-1 rounded text-xs font-bold", selectedTeacher.teacherProfile?.availability.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700")}>
                          {selectedTeacher.teacherProfile?.availability.isAvailable ? "Disponible" : "Indisponible"}
                        </span>
                      </div>
                      {selectedTeacher.teacherProfile?.availability.isAvailable && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">À partir du</span>
                            <span className="text-sm font-medium text-slate-900">{selectedTeacher.teacherProfile?.availability.availableFrom || 'Immédiatement'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Contrat souhaité</span>
                            <span className="text-sm font-medium text-slate-900">{selectedTeacher.teacherProfile?.availability.preferredContract || 'Non spécifié'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Mobilité</span>
                            <span className="text-sm font-medium text-slate-900">{selectedTeacher.teacherProfile?.availability.willingToTravel ? 'Oui (Déplacements acceptés)' : 'Non (Local uniquement)'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Star size={20} className="text-amber-500" />
                  Avis et Évaluations ({selectedTeacher.teacherProfile?.reviews?.length || 0})
                </h3>
                
                <div className="space-y-4 mb-8">
                  {selectedTeacher.teacherProfile?.reviews?.length ? (
                    selectedTeacher.teacherProfile.reviews.map(review => (
                      <div key={review.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{review.authorName}</p>
                            <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="flex text-amber-500">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} size={14} className={star <= review.rating ? "fill-current" : "text-slate-300"} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>
                  )}
                </div>

                {/* Add Review Form */}
                {user && user.id !== selectedTeacher.id && (
                  <form onSubmit={handleSubmitReview} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <h4 className="font-bold text-slate-900 text-sm mb-3">Laisser un avis</h4>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Note</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="focus:outline-none"
                          >
                            <Star size={24} className={star <= reviewRating ? "text-amber-500 fill-current" : "text-slate-300"} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Commentaire</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Partagez votre expérience avec cet enseignant..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm min-h-[80px]"
                        required
                      ></textarea>
                    </div>
                    <button 
                      type="submit"
                      disabled={!reviewComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Publier l'avis
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
              <h2 className="font-bold flex items-center gap-2">
                <MessageSquare size={20} />
                Nouveau message
              </h2>
              <button onClick={() => setShowMessageModal(false)} className="p-1 hover:bg-emerald-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <img src={selectedTeacher.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-slate-100" />
                <div>
                  <p className="text-sm text-slate-500">À :</p>
                  <p className="font-bold text-slate-900">{selectedTeacher.firstName} {selectedTeacher.lastName}</p>
                </div>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Écrivez votre message ici pour planifier un cours ou demander des informations..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm min-h-[150px] mb-4"
                autoFocus
              ></textarea>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={16} />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type QuizQuestionType = 
  | 'multiple_choice' 
  | 'true_false' 
  | 'matching' 
  | 'short_answer' 
  | 'numerical' 
  | 'calculated' 
  | 'drag_drop' 
  | 'essay' 
  | 'cloze' 
  | 'description';

export interface QuizQuestion {
  id: string;
  type?: QuizQuestionType; // Optional for backward compatibility
  question: string;
  options: string[]; // Still used for multiple choice
  pointsPerOption: number[]; 
  correctAnswerIndex?: number; // Legacy
  explanation?: string;
  
  // Specific fields for new types
  matchingPairs?: { left: string; right: string; leftImage?: string; rightImage?: string }[];
  correctTextAnswer?: string; // For short answer
  correctNumericAnswer?: number; // For numerical/calculated
  tolerance?: number; // For numerical
  formula?: string; // For calculated
  clozeTemplate?: string; // Text with gaps like [[1]]
  clozeAnswers?: { [key: string]: string | string[] | number };
  backgroundImage?: string; // For drag and drop
  dropZones?: { id: string; x: number; y: number; label: string; answer: string }[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  creatorId: string; // 'ai' or teacher's userId
  creatorName: string;
  questions: QuizQuestion[];
  createdAt: any;
  type: 'teacher' | 'ai';
  duration?: number; // minutes
  settings?: {
    shuffleQuestions?: boolean;
    shuffleAnswers?: boolean;
    attemptsLimit?: number;
    penaltyPerWrongAnswer?: number;
    showCorrections?: 'always' | 'never' | 'after_submit';
  };
  validationStatus?: 'draft' | 'ai_review' | 'pending_admin' | 'published' | 'rejected';
  qualityScore?: number;
  flaggedIssues?: string[];
  playCount?: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalPoints: number;
  answers: Record<string, any>;
  timeSpent: number;
  createdAt: any;
}

export interface QuestionBankItem extends Omit<QuizQuestion, 'id'> {
  id: string;
  subject: string;
  level: string;
  createdAt: any;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string; // Filière
  level: string; // Niveau (L1, L2, etc.)
  promotion?: string; // Année de promotion
  email: string;
  password?: string;
  phone?: string;
  ine?: string;
  city?: string;
  neighborhood?: string;
  avatarUrl?: string;
  role: 'student' | 'admin' | 'tutor' | 'company' | 'teacher' | 'institution' | 'parent' | 'alumni' | 'public';
  tutorStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  teacherStatus?: 'none' | 'pending_dossier' | 'pending_approval' | 'approved' | 'rejected';
  examSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  examSubscriptionExpiry?: string;
  premiumSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  premiumSubscriptionExpiry?: string;
  motoRideSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  motoRideSubscriptionExpiry?: string;
  eventSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  eventSubscriptionExpiry?: string;
  tutorSubjects?: string[];
  tutorHourlyRates?: {
    college?: number;
    lycee?: number;
    licence?: number;
    master?: number;
  };
  tutorDescription?: string;
  teacherProfile?: TeacherProfile;
  institutionProfile?: InstitutionProfile;
  pushSubscription?: any;
  marketplaceStats?: {
    published: number;
    sold: number;
    reports: number;
  };
  status?: 'active' | 'inactive';
  isVerified?: boolean;
  isDriverVerified?: boolean;
  companyName?: string;
  motoRideStatus?: 'active' | 'suspended';
  motoRideStats?: {
    ridesCompleted: number;
    averageRating: number;
    totalReports: number;
  };
  trainingStats?: {
    averageRating: number;
    trainingsOrganized: number;
  };
  vehicleDetails?: {
    type: 'moto' | 'car';
    plateNumber: string;
    imageUrl?: string;
  };
  bio?: string;
  skills?: string[];
  experiences?: {
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  createdAt?: any;
  referralCode?: string;
  referralsCount?: number;
  inviteCount?: number; // Added back for compatibility
  invitedUsers?: string[];
  fcmToken?: string;
  notificationPreferences?: {
    pushEnabled?: boolean;
    whatsappEnabled?: boolean;
    whatsappNumber?: string;
    documents?: boolean;
    internships?: boolean;
    forums?: boolean;
    contests?: boolean;
    events?: boolean;
  };
  lastActiveAt?: any;
  lastDownloadAt?: any;
  hasPostedPresentation?: boolean;
  joinedGroups?: string[];
  activityStats?: {
    logins: number;
    docsViewed: number;
    docsDownloaded: number;
    eventsViewed: number;
    eventParticipations: number;
    contestParticipations: number;
    marketplacePosts: number;
    marketplaceContacts: number;
    quizzesCompleted: number;
    cvGenerated: number;
    motoRideOffers: number;
    motoRideContacts: number;
    groupMessages: number;
    invitations: number;
  };
  dailyQuests?: {
    date: string;
    quests: {
      id: string;
      title: string;
      target: number;
      progress: number;
      completed: boolean;
      type: 'login' | 'quiz' | 'document' | 'post' | 'comment';
      reward: number;
    }[];
  };
  streak?: {
    current: number;
    longest: number;
    lastLoginDate: string;
  };
  rankingScore?: number;
  contributionCount?: number;
  forceUnlocked?: boolean;
  forceUnlockReason?: string;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  domain: string;
  type: 'online' | 'in_person';
  location?: string;
  meetingLink?: string;
  price: number;
  startDate: string;
  duration: string;
  maxParticipants: number;
  imageUrl?: string;
  trainerId: string;
  trainerName: string;
  trainerAvatar?: string;
  trainerUniversity?: string;
  trainerRating?: number;
  trainerTrainingsCount?: number;
  status: 'pending' | 'approved' | 'rejected';
  participants: string[];
  createdAt: string;
}

export interface TrainingEnrollment {
  id: string;
  trainingId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  enrolledAt: string;
}

export interface TrainingReview {
  id: string;
  trainingId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TrainingReport {
  id: string;
  trainingId: string;
  reporterId: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface TeacherReview {
  id: string;
  authorId: string;
  authorName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface TeacherProfile {
  academicRank: 'Assistant' | 'Maître Assistant' | 'Maître de Conférences' | 'Professeur Titulaire' | 'Autre';
  biography: string;
  yearsOfExperience: number;
  languages: string[];
  specialties: string[];
  domains: string[];
  publications: { title: string; journal: string; year: number; link?: string }[];
  courses: string[];
  availability: {
    isAvailable: boolean;
    availableFrom?: string;
    availableTo?: string;
    preferredContract?: 'Vacation' | 'CDD' | 'CDI' | 'Mission';
    willingToTravel: boolean;
  };
  reviews?: TeacherReview[];
}

export interface InstitutionProfile {
  type: 'Université Publique' | 'Institut Privé' | 'École Supérieure';
  subscriptionStatus: 'none' | 'pending' | 'active' | 'expired';
  subscriptionExpiry?: string;
  favorites: string[]; // Array of teacher User IDs
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  user: User;
  type: 'exam' | 'premium' | 'marketplace' | 'motoride' | 'event' | 'institution';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface TutorApplication {
  id: string;
  userId: string;
  user: User;
  description: string;
  documentUrl: string; // URL of the single file (diploma, transcripts, CV)
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: any;
  subjects: string[];
  hourlyRates: {
    college?: number;
    lycee?: number;
    licence?: number;
    master?: number;
  };
}

export interface TeacherApplication {
  id: string;
  userId: string;
  user: User;
  cvUrl: string;
  diplomaUrl: string;
  rankProofUrl: string;
  biography: string;
  specialties: string[];
  domains: string[];
  courses: string[];
  experienceYears: number;
  academicRank: 'Assistant' | 'Maître Assistant' | 'Maître de Conférences' | 'Professeur Titulaire' | 'Autre';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  adminResponse?: string;
  adminResponseDate?: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'exam' | 'exercise' | 'summary' | 'thesis'; // Sujet, TD, Résumé, Mémoire
  university: string;
  ufr?: string;
  department?: string;
  major: string;
  year: string;
  subject: string;
  authorId: string;
  downloadUrl: string;
  createdAt: string;
  downloads: number;
  likes: number;
  price?: number;
  isForSale?: boolean;
}

export interface Tutor {
  id: string;
  userId: string;
  user: User;
  subjects: string[];
  hourlyRate: number; // CFA - Keep for backward compatibility or display "starting from"
  hourlyRates?: {
    college?: number;
    lycee?: number;
    licence?: number;
    master?: number;
  };
  description: string;
  rating: number;
  reviewsCount: number;
  university: string;
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Stage' | 'Bourse' | 'Emploi' | 'Job Etudiant';
  description: string;
  postedAt: any;
  deadline?: string;
  applicationMethod?: 'email' | 'url';
  applicationValue?: string;
  applicationEmail?: string;
  authorId: string;
  createdAt?: any;
  linkUrl?: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number; // CFA
  category: string;
  imageUrls?: string[]; // At least 2
  imageUrl?: string; // For backward compatibility
  sellerId: string;
  seller: User;
  location: string; // Meeting place
  university?: string;
  phone?: string; // WhatsApp or phone
  status?: 'pending' | 'approved' | 'rejected';
  reports?: string[]; // User IDs who reported
  reportCount?: number;
  postedAt: string;
  createdAt?: any;
}

export interface Group {
  id: string;
  name: string;
  type?: 'university' | 'major' | 'class';
  category?: 'university' | 'major' | 'class';
  membersCount?: number;
  members: string[];
  description: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  author: User;
  content: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  createdAt: any;
}

export interface Post {
  id: string;
  groupId: string;
  authorId: string;
  author: Partial<User>;
  content: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  likes: number;
  likedBy: string[];
  comments?: Comment[];
  createdAt: any;
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  userId: string;
  active: boolean;
  createdAt: any;
}

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  type: 'conference' | 'defense' | 'competition' | 'cultural' | 'Soutenance' | 'Atelier' | 'Séminaire' | 'Colloque' | 'Réunion' | 'other';
  location: string;
  date: string;
  time: string;
  organizerId: string;
  organizer: User;
  attendees: string[]; // User IDs
  imageUrl?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'alert' | 'success' | 'info';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Portfolio {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  projects: PortfolioProject[];
  createdAt: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

export interface AlumniProfile {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  bio: string;
  mentorshipTopics: string[];
  availability: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface LostAndFound {
  id: string;
  title: string;
  description: string;
  location: string;
  status: 'lost' | 'found';
  userId: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reportedItemId: string;
  reportedItemType: 'post' | 'comment' | 'document' | 'internship' | 'marketplace' | 'event' | 'lostAndFound' | 'news' | 'colocation';
  reason: string;
  reporterId: string;
  reporterName: string;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: string;
}

export interface Colocation {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  university: string;
  distanceFromUni: number; // in km
  roomsCount: number;
  roommatesNeeded: number;
  price: number; // monthly
  imageUrls: string[];
  preferredGender: 'male' | 'female' | 'any';
  ageRange: string; // e.g., "18-22"
  studyLevel: string; // e.g., "L1", "L2", etc.
  lifestyleHabits: string[]; // e.g., ["calme", "non-fumeur"]
  status: 'active' | 'filled' | 'cancelled';
  createdAt: any;
}

export interface ColocationRequest {
  id: string;
  colocationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderUniversity: string;
  senderLevel: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface ColocationReview {
  id: string;
  colocationId: string;
  authorId: string;
  authorName: string;
  targetId: string; // The person being reviewed
  rating: number;
  comment: string;
  createdAt: any;
}

export interface MotoRide {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverRating: number;
  departure: string;
  destination: string;
  time: string;
  date: string;
  price: number;
  distance: string;
  motorcycle: string;
  vehicleDetails?: {
    type: string;
    plateNumber: string;
    imageUrl?: string;
  };
  helmetAvailable: boolean;
  whatsappNumber?: string;
  lat: number;
  lng: number;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  passengers: string[]; // User IDs
  university?: string;
  reports?: {
    reporterId: string;
    reason: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface RideReview {
  id: string;
  rideId: string;
  reviewerId: string;
  revieweeId: string; // Can be driver or passenger
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string; // The user who invited
  referredId: string; // The user who was invited
  createdAt: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  type: 'academic' | 'documents' | 'events' | 'motoride' | 'marketplace' | 'ambassador';
  domain?: string;
  startDate: string;
  endDate: string;
  resultsDate: string;
  maxParticipants: number;
  reward: string;
  imageUrl?: string;
  conditions: {
    minInvites: number;
    requireVerifiedProfile: boolean;
  };
  criteria: ContestCriterion[];
  status: 'draft' | 'active' | 'finished' | 'results_published';
  createdAt: string;
}

export interface ContestCriterion {
  id: string;
  label: string;
  key: string; // e.g., 'score', 'time', 'docsCount', 'downloads', 'eventsCount', 'participantsCount', 'ridesCount', 'rating', 'salesCount'
  weight: number; // percentage (0-100)
}

export interface ContestParticipant {
  id: string;
  contestId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'pending' | 'validated' | 'excluded';
  registrationDate: string;
  stats: { [key: string]: number }; // Current values for criteria keys
  totalScore: number;
}

export interface ContestWinner {
  contestId: string;
  userId: string;
  userName: string;
  position: number;
  reward: string;
  score: number;
}

export type PublicServiceCategory = 
  "culture_generale" | 
  "maths" | 
  "droit" | 
  "economie" | 
  "svt" | 
  "physique" | 
  "chimie" |
  "dissertation_redaction" | 
  "tests_psychotechniques" | 
  "cas_pratique" |
  "actualite_retrospective" | 
  "societes_evenements" | 
  "institutions_nationales_internationales" | 
  "culture_litterature_internationales" | 
  "culture_litteraire_artistique" | 
  "histoire" | 
  "geographie" | 
  "philosophie" | 
  "psychologie" | 
  "sociologie" | 
  "francais" | 
  "sciences_technologie" | 
  "connaissances_burkina" |
  "test_niveau";
export type PublicServiceType = "qcm" | "dissertation" | "exercice" | "simulation";
export type PublicServiceLevel = "BEPC" | "BAC" | "Licence" | "Master" | "Tout Niveau";
export type PublicServiceDifficulty = "facile" | "moyen" | "difficile";

export interface PublicServiceQuestion {
  question: string;
  options: string[];
  bonne_reponse: number; // index de la bonne réponse
  explication: string;
}

export interface PublicServiceContest {
  id: string;
  titre: string;
  description: string;
  categorie: PublicServiceCategory;
  type: PublicServiceType;
  niveau: PublicServiceLevel;
  duree: number; // en minutes
  difficulte: PublicServiceDifficulty;
  questions: PublicServiceQuestion[];
  corrige_detaille?: string;
  auteur_id: string;
  date_creation: any;
  status: 'active' | 'inactive';
  takenCount?: number;
}

export interface ResultAnswer {
  questionIndex: number;
  selectedOption: number;
  comment?: string;
}

export interface PublicServiceResult {
  id: string;
  user_id: string;
  concours_id: string;
  score: number;
  total_questions: number;
  temps: number; // en secondes
  date: any;
  classement?: number;
  answers: ResultAnswer[];
}

export interface PublicServiceSubscription {
  id: string;
  user_id: string;
  actif: boolean;
  date_debut: any;
  date_fin: any;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  partnerName: string;
  partnerLogo?: string;
  discountValue: string; // e.g., "20%", "500 CFA"
  category: 'food' | 'transport' | 'leisure' | 'education' | 'services' | 'other';
  validUntil?: string;
  promoCode?: string;
  linkUrl?: string;
  imageUrl?: string;
  isPremiumOnly?: boolean;
  active: boolean;
  createdAt: any;
}

export interface DealSuggestion {
  id: string;
  userId: string;
  userName: string;
  title: string;
  partnerName: string;
  description: string;
  status: 'pending' | 'reviewed' | 'rejected';
  createdAt: any;
}

export interface PrintOptions {
  color: boolean;
  twoSided: boolean;
  copies: number;
  binding: 'none' | 'staple' | 'spiral';
}

export interface PrintOrder {
  id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  pageCount: number;
  options: PrintOptions;
  totalPrice: number;
  status: 'pending' | 'processing' | 'ready' | 'delivered';
  pickupPoint: string;
  comment?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PrintRates {
  bwPage: number;
  colorPage: number;
  twoSidedDiscount: number;
  bindingStaple: number;
  bindingSpiral: number;
}

export interface Scholarship {
  id: string;
  titre: string;
  pays: string;
  niveau: string;
  domaine: string;
  description: string;
  date_limite?: string;
  lien_officiel: string;
  source: string;
  resume_ia?: string;
  conseils_ia?: string;
  match_score?: number;
  date_publication: any;
  tags?: string[];
}

export interface CommunityVideo {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  university: string;
  platform: 'youtube' | 'vimeo' | 'tiktok' | 'facebook' | 'dailymotion';
  title: string;
  description: string;
  category: 'Orientation' | 'Universités' | 'Bourses' | 'IA & Tech' | 'Carrière' | 'Entrepreneuriat' | 'Motivation' | 'Sciences' | 'Examens' | 'Vie Étudiante';
  hashtags: string[];
  videoUrl: string;
  thumbnail: string;
  duration: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharesCount: number;
  aiModerationScore: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface VideoComment {
  id: string;
  userId: string;
  username: string;
  photo: string;
  message: string;
  createdAt: any;
}

export interface VideoLike {
  userId: string;
  videoId: string;
  createdAt: any;
}

export interface VideoReport {
  videoId: string;
  reportedBy: string;
  reason: string;
  createdAt: any;
}


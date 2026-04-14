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
  role: 'student' | 'admin' | 'tutor' | 'company' | 'teacher' | 'institution' | 'parent' | 'alumni';
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
  marketplaceStats?: {
    published: number;
    sold: number;
    reports: number;
  };
  status?: 'active' | 'inactive';
  isVerified?: boolean;
  isDriverVerified?: boolean;
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
  createdAt?: any;
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
  createdAt: any;
}

export interface Post {
  id: string;
  groupId: string;
  authorId: string;
  author: User;
  content: string;
  likes: number;
  likedBy: string[];
  comments: Comment[];
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
  type: 'conference' | 'defense' | 'competition' | 'cultural' | 'other';
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
  reportedItemType: 'post' | 'comment' | 'document' | 'internship' | 'marketplace' | 'event' | 'lostAndFound' | 'news';
  reason: string;
  reporterId: string;
  reporterName: string;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: string;
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

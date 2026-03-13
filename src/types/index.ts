export interface User {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string; // Filière
  level: string; // Niveau (L1, L2, etc.)
  email: string;
  password?: string;
  phone?: string;
  city?: string;
  neighborhood?: string;
  avatarUrl?: string;
  role: 'student' | 'admin' | 'tutor' | 'company' | 'teacher' | 'institution';
  tutorStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  teacherStatus?: 'none' | 'pending_dossier' | 'pending_approval' | 'approved' | 'rejected';
  subscriptionStatus?: 'none' | 'pending' | 'active' | 'expired'; // Tutor subscription
  subscriptionExpiry?: string;
  examSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  examSubscriptionExpiry?: string;
  premiumSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  premiumSubscriptionExpiry?: string;
  marketplaceSubscriptionStatus?: 'none' | 'pending' | 'active' | 'expired';
  marketplaceSubscriptionExpiry?: string;
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
  type: 'exam' | 'premium' | 'tutor' | 'marketplace' | 'motoride' | 'event';
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
  createdAt: string;
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
  academicRank: 'Assistant' | 'Maître Assistant' | 'Maître de Conférences' | 'Professeur Titulaire' | 'Autre';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'exam' | 'exercise' | 'summary' | 'thesis'; // Sujet, TD, Résumé, Mémoire
  university: string;
  major: string;
  year: string;
  subject: string;
  authorId: string;
  downloadUrl: string;
  createdAt: string;
  downloads: number;
  likes: number;
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
  type: 'internship' | 'job';
  description: string;
  postedAt: string;
  deadline?: string;
  applicationEmail?: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number; // CFA
  category: 'book' | 'computer' | 'housing' | 'service' | 'other';
  imageUrl?: string;
  sellerId: string;
  seller: User;
  location: string;
  postedAt: string;
}

export interface Group {
  id: string;
  name: string;
  type: 'university' | 'major' | 'class';
  membersCount: number;
  description: string;
}

export interface Comment {
  id: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: string;
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
  createdAt: string;
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
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

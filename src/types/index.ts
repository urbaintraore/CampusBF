export interface User {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string; // Filière
  level: string; // Niveau (L1, L2, etc.)
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: 'student' | 'admin' | 'tutor' | 'company';
  tutorStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  subscriptionStatus?: 'none' | 'active' | 'expired';
  subscriptionExpiry?: string;
  postSubscriptionStatus?: 'none' | 'active' | 'expired';
  postSubscriptionExpiry?: string;
  internshipSubscriptionStatus?: 'none' | 'active' | 'expired';
  internshipSubscriptionExpiry?: string;
}

export interface TutorApplication {
  id: string;
  userId: string;
  user: User;
  description: string;
  documentUrl: string; // URL of the single file (diploma, transcripts, CV)
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'exam' | 'exercise' | 'summary'; // Sujet, TD, Résumé
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
  hourlyRate: number; // CFA
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

export interface Post {
  id: string;
  groupId: string;
  authorId: string;
  author: User;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
}

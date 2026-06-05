export interface University {
  id: string;
  name: string;
  code: string;
  description: string;
  location: string;
  type: 'public' | 'private' | 'institute';
  contactEmail: string;
  founderId?: string; // If 'user' role is institution, this can map directly
  createdAt: string;
  status: 'active' | 'archived';
}

export interface Department {
  id: string;
  universityId: string; // Linked to parent institution profile
  name: string;
  code: string;
  description: string;
  responsible: string; // Head of department
  createdAt: string;
  status: 'active' | 'archived';
}

export interface Filiere {
  id: string;
  departmentId: string; // Foreign key linked to Department
  universityId: string;
  name: string;
  code: string;
  description: string;
  responsible: string; // Head of program
  status: 'active' | 'archived';
}

export interface Classe {
  id: string;
  filiereId: string; // Foreign key linked to Filiere
  departmentId: string;
  universityId: string;
  name: string;
  code: string;
  academicYear: string;
  studentCount: number;
  responsible: string; // Head of class
  status: 'active' | 'archived';
}

export interface AcademicStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  ine?: string; // Burkina Faso national student identifier (INE)
  universityId: string;
  departmentId: string;
  filiereId: string;
  classeId: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface TimetableCell {
  day: string; // e.g. 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
  timeSlot: string; // e.g. '08:00 - 10:00', '10:15 - 12:15', '14:00 - 16:00', '16:15 - 18:15'
  subject: string;
  teacher: string;
  room: string;
}

export interface TimetableVersion {
  id: string;
  version: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  gridData?: TimetableCell[];
}

export interface Timetable {
  id: string;
  classeId: string;
  universityId: string;
  currentUrl: string;
  currentFileName: string;
  currentFileType: string;
  lastUpdated: string;
  updatedBy: string;
  versions: TimetableVersion[];
  gridData?: TimetableCell[];
}

export interface AcademicDocument {
  id: string;
  classeId: string;
  filiereId: string;
  departmentId: string;
  universityId: string;
  title: string;
  category: 'Cours' | 'TD' | 'TP' | 'Examen' | 'Corrigé' | 'Autre';
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  downloadsCount: number;
}

export interface Commentary {
  id: string;
  messageId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export interface ClassMessage {
  id: string;
  classeId: string;
  universityId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  attachments?: { fileName: string; fileUrl: string; fileType: string }[];
  allowComments: boolean;
  comments?: Commentary[];
}

export interface AcademicNotification {
  id: string;
  userId: string; // Student ID or 'all'
  classeId?: string;
  title: string;
  content: string;
  type: 'timetable' | 'message' | 'document' | 'general';
  read: boolean;
  createdAt: string;
}

export type AcademicRole =
  | 'super_admin'
  | 'admin_university'
  | 'chef_departement'
  | 'responsable_filiere'
  | 'responsable_classe'
  | 'teacher'
  | 'student';

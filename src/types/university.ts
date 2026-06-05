/**
 * University Academic Hierarchy and Multi-Tenant Role-Based Access Control (RBAC) Data Models
 * 
 * Hierarchy:
 * University (Tenant) 
 *  └── Department (Academic Division, e.g., UFR SDS, Sci. Exactes)
 *       └── Field / Filière (Specialized study program, e.g., Informatique, Médecine)
 *            └── Class / Classe (Specific study cohort & level, e.g., L3 Génie Logiciel)
 *                 ├── Student (Academic Student registered in a Classe)
 *                 ├── Timetable (Schedule specific to a Classe)
 *                 └── ClassMessage (Communication hub for a Classe)
 */

export interface University {
  /** Unique identifier of the University (e.g., 'univ_ujkz') */
  id: string;
  /** Complete official name of the university */
  name: string;
  /** Short acronym or code (e.g., 'UJKZ', 'UNB') */
  code: string;
  /** Comprehensive description / history of the institution */
  description: string;
  /** Primary location / postal address in Burkina Faso */
  location: string;
  /** Administrative category of the institution */
  type: 'public' | 'private' | 'institute';
  /** Primary administrative contact email */
  contactEmail: string;
  /** ID of the user which controls the institution (role 'institution') */
  founderId?: string;
  /** Timestamp of integration onto the platform */
  createdAt: string;
  /** Current operating status */
  status: 'active' | 'archived';
}

export interface Department {
  /** Unique identifier of the Department */
  id: string;
  /** Parent University Reference (Multi-tenant partition key) */
  universityId: string;
  /** Name of the UFR or Department (e.g., 'UFR Sciences de la Santé', 'UFR SEG') */
  name: string;
  /** Unique department code prefix (e.g., 'UFR-SDS') */
  code: string;
  /** Objectives and administrative description */
  description: string;
  /** Name or ID of the Academic Head / Executive responsible for this division (e.g., Doyen) */
  responsible: string;
  /** Timestamp of registration */
  createdAt: string;
  /** Current status */
  status: 'active' | 'archived';
}

export interface Field {
  /** Unique identifier of the study program / stream */
  id: string;
  /** Parent Department Reference */
  departmentId: string;
  /** Grandparent University Reference (Enforces clean querying in search boundaries) */
  universityId: string;
  /** Full designation of the program (e.g., 'Génie Logiciel', 'Banque & Finance') */
  name: string;
  /** Unique standard code identifier of the program (e.g., 'GL', 'BF') */
  code: string;
  /** Curricula and syllabus overview */
  description: string;
  /** Name or ID of the Faculty Coordinator */
  responsible: string;
  /** Program current operating status */
  status: 'active' | 'archived';
}

export interface Class {
  /** Unique identifier of the specific student cohort / group */
  id: string;
  /** Parent Field Reference */
  filiereId: string; // Map internally to the Field ID
  /** Grandparent Department Reference */
  departmentId: string;
  /** Great-Grandparent University Reference (Strict tenant boundary validation) */
  universityId: string;
  /** Cohort division label (e.g., 'Licence 3 - Génie Logiciel (L3GL)') */
  name: string;
  /** Short unique registration code suffix */
  code: string;
  /** Current active academic year (e.g., '2025-2026') */
  academicYear: string;
  /** Estimated active counts of pupils in this group */
  studentCount: number;
  /** Academic representative or Delegate responsible for student-to-administrative reporting */
  responsible: string;
  /** Current active status of the class */
  status: 'active' | 'archived';
}

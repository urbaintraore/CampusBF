import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Department, 
  Filiere, 
  Classe, 
  AcademicStudent, 
  Timetable, 
  AcademicDocument, 
  ClassMessage, 
  AcademicNotification 
} from '@/types/academic';

// Seed initial data for a professional look (Joseph Ki-Zerbo University - UJKZ)
const SEED_DEPARTMENTS: Department[] = [
  {
    id: "dept_mi_ujkz",
    universityId: "UJKZ",
    name: "Mathématiques et Informatique",
    code: "MI",
    description: "Département d'enseignement et de recherche en mathématiques, informatique et modélisation.",
    responsible: "Pr. Bernard ZONGO",
    createdAt: "2023-10-12T08:00:00Z",
    status: "active"
  },
  {
    id: "dept_seg_ujkz",
    universityId: "UJKZ",
    name: "Sciences Économiques et de Gestion",
    code: "SEG",
    description: "UFR d'enseignement pour l'économie générale et la gestion d'entreprise.",
    responsible: "Dr. Alassane SOUROU",
    createdAt: "2023-10-15T09:30:00Z",
    status: "active"
  },
  {
    id: "dept_sh_ujkz",
    universityId: "UJKZ",
    name: "Sciences de la Santé",
    code: "SDS",
    description: "UFR pour la médecine générale, pharmacie, et odontostomatologie.",
    responsible: "Pr. Aminata DIALLO",
    createdAt: "2023-11-01T10:00:00Z",
    status: "active"
  }
];

const SEED_FILIERES: Filiere[] = [
  {
    id: "filiere_gl_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    name: "Génie Logiciel",
    code: "GL",
    description: "Conception, développement et maintenance des architectures logicielles et cloud.",
    responsible: "M. Urbain TRAORÉ",
    status: "active"
  },
  {
    id: "filiere_rs_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    name: "Réseaux et Télécoms",
    code: "RT",
    description: "Administration des réseaux informatiques, télécommunications, internet et cyber-défense.",
    responsible: "Pr. Seydou OUATTARA",
    status: "active"
  },
  {
    id: "filiere_mase_ujkz",
    departmentId: "dept_seg_ujkz",
    universityId: "UJKZ",
    name: "Management des Services",
    code: "MASE",
    description: "Gouvernance des organisations burkinabè et stratégies de croissance.",
    responsible: "Mme Safiatou THIOMBIANO",
    status: "active"
  }
];

const SEED_CLASSES: Classe[] = [
  {
    id: "class_l3gl_ujkz",
    filiereId: "filiere_gl_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    name: "L3 Génie Logiciel",
    code: "L3-GL",
    academicYear: "2025-2026",
    studentCount: 5,
    responsible: "Dr. Marc COMPAORÉ",
    status: "active"
  },
  {
    id: "class_m1gl_ujkz",
    filiereId: "filiere_gl_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    name: "M1 Science des Données",
    code: "M1-SD",
    academicYear: "2025-2026",
    studentCount: 3,
    responsible: "Dr. Isabelle SANON",
    status: "active"
  },
  {
    id: "class_l3rt_ujkz",
    filiereId: "filiere_rs_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    name: "L3 Réseaux et Sécurité",
    code: "L3-RT",
    academicYear: "2025-2026",
    studentCount: 2,
    responsible: "Dr. Florent SAWADOGO",
    status: "active"
  }
];

const SEED_STUDENTS: AcademicStudent[] = [
  {
    id: "stud_1",
    firstName: "Adama",
    lastName: "Ouedraogo",
    email: "adama.ouedraogo@campusbf.com",
    phone: "+226 70 12 34 56",
    ine: "B09121800045A",
    universityId: "UJKZ",
    departmentId: "dept_mi_ujkz",
    filiereId: "filiere_gl_ujkz",
    classeId: "class_l3gl_ujkz",
    status: "active",
    createdAt: "2025-09-01T10:00:00Z"
  },
  {
    id: "stud_2",
    firstName: "Fatoumata",
    lastName: "Sangaré",
    email: "fatoumata.sangare@campusbf.com",
    phone: "+226 76 89 45 12",
    ine: "B09121800088Z",
    universityId: "UJKZ",
    departmentId: "dept_mi_ujkz",
    filiereId: "filiere_gl_ujkz",
    classeId: "class_l3gl_ujkz",
    status: "active",
    createdAt: "2025-09-02T11:00:00Z"
  },
  {
    id: "stud_3",
    firstName: "Idrissa",
    lastName: "Kaboré",
    email: "idrissa.kabore@campusbf.com",
    phone: "+226 50 11 22 33",
    ine: "B09121800109P",
    universityId: "UJKZ",
    departmentId: "dept_mi_ujkz",
    filiereId: "filiere_gl_ujkz",
    classeId: "class_m1gl_ujkz",
    status: "active",
    createdAt: "2025-09-03T08:30:00Z"
  }
];

const SEED_TIMETABLES: Timetable[] = [
  {
    id: "schedule_l3gl",
    classeId: "class_l3gl_ujkz",
    universityId: "UJKZ",
    currentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    currentFileName: "EDT_L3_Genie_Logiciel_S5_V2.pdf",
    currentFileType: "pdf",
    lastUpdated: "2026-02-15T16:00:00Z",
    updatedBy: "Dr. Marc COMPAORÉ",
    versions: [
      {
        id: "v2",
        version: 2,
        fileName: "EDT_L3_Genie_Logiciel_S5_V2.pdf",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        uploadedAt: "2026-02-15T16:00:00Z",
        uploadedBy: "Dr. Marc COMPAORÉ",
        description: "Ajustement suite au changement d'horaires d'Algorithmique avancée du mardi matin"
      },
      {
        id: "v1",
        version: 1,
        fileName: "EDT_L3_Genie_Logiciel_S5_Init.pdf",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf",
        uploadedAt: "2026-02-01T08:00:00Z",
        uploadedBy: "Dr. Marc COMPAORÉ",
        description: "Version initiale du semestre"
      }
    ]
  }
];

const SEED_DOCUMENTS: AcademicDocument[] = [
  {
    id: "doc_1",
    classeId: "class_l3gl_ujkz",
    filiereId: "filiere_gl_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    title: "Patrons de conception (Design Patterns) GoF",
    category: "Cours",
    description: "Support de cours détaillé sur les Creational, Structural and Behavioral Patterns avec applications Java/TypeScript.",
    fileName: "Cours_Design_Patterns_L3GL.pdf",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileType: "pdf",
    uploadedAt: "2026-02-10T14:22:00Z",
    uploadedBy: "Pr. Seydou OUATTARA",
    downloadsCount: 147
  },
  {
    id: "doc_2",
    classeId: "class_l3gl_ujkz",
    filiereId: "filiere_gl_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    title: "TD 1 : Modélisation Uml et Architecture MVC",
    category: "TD",
    description: "Énoncé des exercices de révision de modélisation orientée objet avec patrons de conception.",
    fileName: "TD1_UML_MVC.pdf",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileType: "pdf",
    uploadedAt: "2026-02-12T09:15:00Z",
    uploadedBy: "Pr. Seydou OUATTARA",
    downloadsCount: 56
  },
  {
    id: "doc_3",
    classeId: "class_l3gl_ujkz",
    filiereId: "filiere_gl_ujkz",
    departmentId: "dept_mi_ujkz",
    universityId: "UJKZ",
    title: "TP 2 : Création de services REST avec Node.js Express",
    category: "TP",
    description: "Guide pratique pas à pas pour construire une API RESTful robuste sous Express et PostgreSQL.",
    fileName: "TP2_Express_REST_API.pdf",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileType: "pdf",
    uploadedAt: "2026-02-18T11:00:00Z",
    uploadedBy: "M. Urbain TRAORÉ",
    downloadsCount: 92
  }
];

const SEED_MESSAGES: ClassMessage[] = [
  {
    id: "msg_1",
    classeId: "class_l3gl_ujkz",
    universityId: "UJKZ",
    title: "Report de la séance de TD d'Architecture Logicielle",
    content: "Bonjour chers étudiants, le cours de TD de ce vendredi 27 février à 8h00 est reporté au lundi 2 mars à 14h00 en salle 15. Merci de faire passer le message.",
    authorId: "chef_dept_mi",
    authorName: "Pr. Bernard ZONGO",
    authorRole: "Chef de département",
    createdAt: "2026-02-25T14:35:00Z",
    attachments: [
      {
        fileName: "Note_Interne_Report_Cours.pdf",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "pdf"
      }
    ],
    allowComments: true,
    comments: [
      {
        id: "comm_1",
        messageId: "msg_1",
        content: "Bien reçu Monsieur le professeur! La salle 15 est libre.",
        authorId: "stud_2",
        authorName: "Fatoumata Sangaré",
        authorRole: "Déléguée classe",
        createdAt: "2026-02-25T15:10:00Z"
      }
    ]
  },
  {
    id: "msg_2",
    classeId: "class_l3gl_ujkz",
    universityId: "UJKZ",
    title: "Rappel : Date limite du projet d'Intégration Continue",
    content: "Chers étudiants, n'oubliez pas que le rendu final du projet de CI/CD (GitHub Actions et déploiement cloud) est fixé pour dimanche prochain à 23h59. Aucun retard ne sera toléré.",
    authorId: "teacher_gl",
    authorName: "M. Urbain TRAORÉ",
    authorRole: "Enseignant",
    createdAt: "2026-02-24T09:00:00Z",
    allowComments: true,
    comments: []
  }
];

function getStored<T>(key: string, backup: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(backup));
    return backup;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Local storage read error for " + key, e);
    return backup;
  }
}

function setStored<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export const academicService = {
  // --- DEPARTMENTS ---
  getDepartments(universityId: string = "UJKZ"): Department[] {
    const all = getStored<Department>('academic_departments', SEED_DEPARTMENTS);
    return all.filter(d => d.universityId === universityId);
  },

  saveDepartment(dept: Omit<Department, 'id' | 'createdAt'> & { id?: string }): Department {
    const all = getStored<Department>('academic_departments', SEED_DEPARTMENTS);
    const resolvedId = dept.id || "dept_" + Math.random().toString(36).substring(2, 9);
    
    const existingIndex = all.findIndex(d => d.id === resolvedId);
    let finalDept: Department;
    
    if (existingIndex >= 0) {
      finalDept = {
        ...all[existingIndex],
        ...dept,
        id: resolvedId,
      };
      all[existingIndex] = finalDept;
    } else {
      finalDept = {
        id: resolvedId,
        createdAt: new Date().toISOString(),
        ...dept
      } as Department;
      all.push(finalDept);
    }
    
    setStored('academic_departments', all);

    // Dynamic firestore sync background attempt
    try {
      setDoc(doc(db, 'academic_departments', finalDept.id), finalDept, { merge: true }).catch(console.error);
    } catch (e) {}

    return finalDept;
  },

  deleteDepartment(id: string): void {
    const all = getStored<Department>('academic_departments', SEED_DEPARTMENTS);
    const filtered = all.filter(d => d.id !== id);
    setStored('academic_departments', filtered);
    
    try {
      deleteDoc(doc(db, 'academic_departments', id)).catch(console.error);
    } catch (e) {}

    // Cascade delete or archive filieres and classes linked to this dept
    const filieres = getStored<Filiere>('academic_filieres', SEED_FILIERES);
    const filtFil = filieres.filter(f => f.departmentId !== id);
    setStored('academic_filieres', filtFil);
    
    const classes = getStored<Classe>('academic_classes', SEED_CLASSES);
    const filtClass = classes.filter(c => c.departmentId !== id);
    setStored('academic_classes', filtClass);
  },

  // --- FILIERES ---
  getFilieres(departmentId?: string, universityId: string = "UJKZ"): Filiere[] {
    const all = getStored<Filiere>('academic_filieres', SEED_FILIERES);
    let filtered = all.filter(f => f.universityId === universityId);
    if (departmentId) {
      filtered = filtered.filter(f => f.departmentId === departmentId);
    }
    return filtered;
  },

  saveFiliere(fil: Omit<Filiere, 'id'> & { id?: string }): Filiere {
    const all = getStored<Filiere>('academic_filieres', SEED_FILIERES);
    const resolvedId = fil.id || "filiere_" + Math.random().toString(36).substring(2, 9);
    
    const existingIndex = all.findIndex(f => f.id === resolvedId);
    const finalFil: Filiere = {
      id: resolvedId,
      ...fil
    } as Filiere;

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...finalFil };
    } else {
      all.push(finalFil);
    }

    setStored('academic_filieres', all);

    try {
      setDoc(doc(db, 'academic_filieres', finalFil.id), finalFil, { merge: true }).catch(console.error);
    } catch (e) {}

    return finalFil;
  },

  deleteFiliere(id: string): void {
    const all = getStored<Filiere>('academic_filieres', SEED_FILIERES);
    const filtered = all.filter(f => f.id !== id);
    setStored('academic_filieres', filtered);

    try {
      deleteDoc(doc(db, 'academic_filieres', id)).catch(console.error);
    } catch (e) {}

    // Cascade delete classes
    const classes = getStored<Classe>('academic_classes', SEED_CLASSES);
    const filtClass = classes.filter(c => c.filiereId !== id);
    setStored('academic_classes', filtClass);
  },

  // --- CLASSES ---
  getClasses(filiereId?: string, universityId: string = "UJKZ"): Classe[] {
    const all = getStored<Classe>('academic_classes', SEED_CLASSES);
    let filtered = all.filter(c => c.universityId === universityId);
    if (filiereId) {
      filtered = filtered.filter(c => c.filiereId === filiereId);
    }
    return filtered;
  },

  saveClasse(cls: Omit<Classe, 'id' | 'studentCount'> & { id?: string, studentCount?: number }): Classe {
    const all = getStored<Classe>('academic_classes', SEED_CLASSES);
    const resolvedId = cls.id || "class_" + Math.random().toString(36).substring(2, 9);
    const existingIndex = all.findIndex(c => c.id === resolvedId);

    // recalculate student counts
    const studentsAll = getStored<AcademicStudent>('academic_students', SEED_STUDENTS);
    const actualCount = studentsAll.filter(s => s.classeId === resolvedId && s.status === 'active').length;

    const finalCls: Classe = {
      id: resolvedId,
      studentCount: cls.studentCount !== undefined ? cls.studentCount : actualCount,
      ...cls
    } as Classe;

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...finalCls };
    } else {
      all.push(finalCls);
    }

    setStored('academic_classes', all);

    try {
      setDoc(doc(db, 'academic_classes', finalCls.id), finalCls, { merge: true }).catch(console.error);
    } catch (e) {}

    return finalCls;
  },

  deleteClasse(id: string): void {
    const all = getStored<Classe>('academic_classes', SEED_CLASSES);
    const filtered = all.filter(c => c.id !== id);
    setStored('academic_classes', filtered);

    try {
      deleteDoc(doc(db, 'academic_classes', id)).catch(console.error);
    } catch (e) {}
  },

  // --- STUDENTS ---
  getStudents(classeId?: string, universityId: string = "UJKZ"): AcademicStudent[] {
    const all = getStored<AcademicStudent>('academic_students', SEED_STUDENTS);
    let filtered = all.filter(s => s.universityId === universityId);
    if (classeId) {
      filtered = filtered.filter(s => s.classeId === classeId);
    }
    return filtered;
  },

  saveStudent(student: Omit<AcademicStudent, 'id' | 'createdAt'> & { id?: string }): AcademicStudent {
    const all = getStored<AcademicStudent>('academic_students', SEED_STUDENTS);
    const resolvedId = student.id || "stud_" + Math.random().toString(36).substring(2, 9);
    const existingIndex = all.findIndex(s => s.id === resolvedId);

    const finalStudent: AcademicStudent = {
      id: resolvedId,
      createdAt: new Date().toISOString(),
      ...student
    } as AcademicStudent;

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...finalStudent };
    } else {
      all.push(finalStudent);
    }

    setStored('academic_students', all);

    // Increment class size
    this.updateClassStudentCount(student.classeId);

    try {
      setDoc(doc(db, 'academic_students', finalStudent.id), finalStudent, { merge: true }).catch(console.error);
    } catch (e) {}

    return finalStudent;
  },

  importStudents(students: Omit<AcademicStudent, 'id' | 'createdAt'>[]): void {
    const all = getStored<AcademicStudent>('academic_students', SEED_STUDENTS);
    const classesToUpdate = new Set<string>();

    students.forEach(st => {
      const resolvedId = "stud_" + Math.random().toString(36).substring(2, 9);
      const finalStudent: AcademicStudent = {
        id: resolvedId,
        createdAt: new Date().toISOString(),
        ...st
      };
      all.push(finalStudent);
      classesToUpdate.add(st.classeId);

      try {
        setDoc(doc(db, 'academic_students', resolvedId), finalStudent).catch(console.error);
      } catch (e) {}
    });

    setStored('academic_students', all);

    classesToUpdate.forEach(cid => {
      this.updateClassStudentCount(cid);
    });
  },

  deleteStudent(id: string, classeId: string): void {
    const all = getStored<AcademicStudent>('academic_students', SEED_STUDENTS);
    const filtered = all.filter(s => s.id !== id);
    setStored('academic_students', filtered);

    this.updateClassStudentCount(classeId);

    try {
      deleteDoc(doc(db, 'academic_students', id)).catch(console.error);
    } catch (e) {}
  },

  updateClassStudentCount(classeId: string): void {
    const classes = getStored<Classe>('academic_classes', SEED_CLASSES);
    const students = getStored<AcademicStudent>('academic_students', SEED_STUDENTS);
    const count = students.filter(s => s.classeId === classeId && s.status === 'active').length;
    
    const idx = classes.findIndex(c => c.id === classeId);
    if (idx >= 0) {
      classes[idx].studentCount = count;
      setStored('academic_classes', classes);
      
      try {
        updateDoc(doc(db, 'academic_classes', classeId), { studentCount: count }).catch(console.error);
      } catch (e) {}
    }
  },

  // --- TIMETABLES ---
  getTimetable(classeId: string): Timetable | undefined {
    const all = getStored<Timetable>('academic_timetables', SEED_TIMETABLES);
    return all.find(t => t.classeId === classeId);
  },

  addOrReplaceTimetable(
    classeId: string, 
    universityId: string, 
    fileName: string, 
    fileUrl: string, 
    uploadedBy: string, 
    description?: string
  ): Timetable {
    const all = getStored<Timetable>('academic_timetables', SEED_TIMETABLES);
    const existingIndex = all.findIndex(t => t.classeId === classeId);
    
    const nowStr = new Date().toISOString();
    const versionId = "v_" + Math.random().toString(36).substring(2, 9);
    const fileType = fileName.split('.').pop()?.toLowerCase() || 'pdf';

    if (existingIndex >= 0) {
      const existing = all[existingIndex];
      const nextVersionNumber = existing.versions.length > 0 
        ? Math.max(...existing.versions.map(v => v.version)) + 1 
        : 1;

      const newVersion = {
        id: versionId,
        version: nextVersionNumber,
        fileName,
        fileUrl,
        fileType,
        uploadedAt: nowStr,
        uploadedBy,
        description
      };

      const updatedTimetable: Timetable = {
        ...existing,
        currentUrl: fileUrl,
        currentFileName: fileName,
        currentFileType: fileType,
        lastUpdated: nowStr,
        updatedBy: uploadedBy,
        versions: [newVersion, ...existing.versions]
      };

      all[existingIndex] = updatedTimetable;
      setStored('academic_timetables', all);

      try {
        setDoc(doc(db, 'academic_timetables', updatedTimetable.id), updatedTimetable, { merge: true }).catch(console.error);
      } catch (e) {}

      // Add Notification
      this.triggerPushNotification(
        universityId, 
        classeId, 
        "Emploi du temps mis à jour", 
        `Une nouvelle version de l'emploi du temps (${fileName}) a été mise en ligne par ${uploadedBy}.`
      );

      return updatedTimetable;
    } else {
      const newId = "schedule_" + Math.random().toString(36).substring(2, 9);
      const newVersion = {
        id: versionId,
        version: 1,
        fileName,
        fileUrl,
        fileType,
        uploadedAt: nowStr,
        uploadedBy,
        description
      };

      const newTimetable: Timetable = {
        id: newId,
        classeId,
        universityId,
        currentUrl: fileUrl,
        currentFileName: fileName,
        currentFileType: fileType,
        lastUpdated: nowStr,
        updatedBy: uploadedBy,
        versions: [newVersion]
      };

      all.push(newTimetable);
      setStored('academic_timetables', all);

      try {
        setDoc(doc(db, 'academic_timetables', newId), newTimetable).catch(console.error);
      } catch (e) {}

      // Add Notification 
      this.triggerPushNotification(
        universityId, 
        classeId, 
        "Nouvel emploi du temps disponible", 
        `L'emploi du temps initial de votre classe a été publié par ${uploadedBy}.`
      );

      return newTimetable;
    }
  },

  // --- DOCUMENTS ---
  getDocuments(classeId?: string, universityId: string = "UJKZ"): AcademicDocument[] {
    const all = getStored<AcademicDocument>('academic_documents', SEED_DOCUMENTS);
    let filtered = all.filter(d => d.universityId === universityId);
    if (classeId) {
      filtered = filtered.filter(d => d.classeId === classeId);
    }
    return filtered;
  },

  saveDocument(docInput: Omit<AcademicDocument, 'id' | 'downloadsCount' | 'uploadedAt'> & { id?: string }): AcademicDocument {
    const all = getStored<AcademicDocument>('academic_documents', SEED_DOCUMENTS);
    const resolvedId = docInput.id || "doc_" + Math.random().toString(36).substring(2, 9);
    const existingIndex = all.findIndex(d => d.id === resolvedId);

    const finalDoc: AcademicDocument = {
      id: resolvedId,
      downloadsCount: existingIndex >= 0 ? all[existingIndex].downloadsCount : 0,
      uploadedAt: new Date().toISOString(),
      ...docInput
    } as AcademicDocument;

    if (existingIndex >= 0) {
      all[existingIndex] = finalDoc;
    } else {
      all.push(finalDoc);
    }

    setStored('academic_documents', all);

    try {
      setDoc(doc(db, 'academic_documents', finalDoc.id), finalDoc, { merge: true }).catch(console.error);
    } catch (e) {}

    // Add notification about new class documents
    this.triggerPushNotification(
      docInput.universityId,
      docInput.classeId,
      "Nouveau cours en ligne",
      `Le document d'étude "${finalDoc.title}" (${finalDoc.category}) a été ajouté par ${finalDoc.uploadedBy}.`
    );

    return finalDoc;
  },

  deleteDocument(id: string): void {
    const all = getStored<AcademicDocument>('academic_documents', SEED_DOCUMENTS);
    const filtered = all.filter(d => d.id !== id);
    setStored('academic_documents', filtered);

    try {
      deleteDoc(doc(db, 'academic_documents', id)).catch(console.error);
    } catch (e) {}
  },

  incrementDownload(id: string): void {
    const all = getStored<AcademicDocument>('academic_documents', SEED_DOCUMENTS);
    const idx = all.findIndex(d => d.id === id);
    if (idx >= 0) {
      all[idx].downloadsCount += 1;
      setStored('academic_documents', all);

      try {
        updateDoc(doc(db, 'academic_documents', id), { downloadsCount: all[idx].downloadsCount }).catch(console.error);
      } catch (e) {}
    }
  },

  // --- MESSAGES & MESSAGING ---
  getMessages(classeId: string): ClassMessage[] {
    const all = getStored<ClassMessage>('academic_messages', SEED_MESSAGES);
    return all.filter(m => m.classeId === classeId);
  },

  saveMessage(msg: Omit<ClassMessage, 'id' | 'createdAt' | 'comments'> & { id?: string }): ClassMessage {
    const all = getStored<ClassMessage>('academic_messages', SEED_MESSAGES);
    const resolvedId = msg.id || "msg_" + Math.random().toString(36).substring(2, 9);
    const existingIndex = all.findIndex(m => m.id === resolvedId);

    const finalMsg: ClassMessage = {
      id: resolvedId,
      createdAt: new Date().toISOString(),
      comments: existingIndex >= 0 ? all[existingIndex].comments || [] : [],
      ...msg
    } as ClassMessage;

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...finalMsg };
    } else {
      all.push(finalMsg);
    }

    setStored('academic_messages', all);

    try {
      setDoc(doc(db, 'academic_messages', finalMsg.id), finalMsg, { merge: true }).catch(console.error);
    } catch (e) {}

    // trigger notifications for students
    this.triggerPushNotification(
      msg.universityId,
      msg.classeId,
      `Nouveau message: ${msg.title}`,
      `${msg.authorName} (${msg.authorRole}) a posté un nouveau message de classe.`
    );

    return finalMsg;
  },

  addComment(messageId: string, content: string, authorId: string, authorName: string, authorRole: string): ClassMessage | undefined {
    const all = getStored<ClassMessage>('academic_messages', SEED_MESSAGES);
    const idx = all.findIndex(m => m.id === messageId);
    
    if (idx >= 0) {
      const msg = all[idx];
      const comments = msg.comments || [];
      const newComment = {
        id: "comm_" + Math.random().toString(36).substring(2, 9),
        messageId,
        content,
        authorId,
        authorName,
        authorRole,
        createdAt: new Date().toISOString()
      };
      
      comments.push(newComment);
      msg.comments = comments;
      all[idx] = msg;
      
      setStored('academic_messages', all);

      try {
        setDoc(doc(db, 'academic_messages', msg.id), msg, { merge: true }).catch(console.error);
      } catch (e) {}

      return msg;
    }
    return undefined;
  },

  // --- NOTIFICATIONS SYSTEM ---
  getNotifications(userId: string): AcademicNotification[] {
    const all = getStored<AcademicNotification>('academic_notifications', []);
    return all.filter(n => n.userId === userId || n.userId === 'all');
  },

  triggerPushNotification(universityId: string, classeId: string, title: string, content: string): void {
    // Write dynamic internal notifications to local notifications pool
    const all = getStored<AcademicNotification>('academic_notifications', []);
    const studentsInClass = this.getStudents(classeId, universityId);

    const nowStr = new Date().toISOString();

    // Notify each student in the class
    studentsInClass.forEach(student => {
      const newNotif: AcademicNotification = {
        id: "notif_" + Math.random().toString(36).substring(2, 9),
        userId: student.id,
        classeId,
        title,
        content,
        type: title.toLowerCase().includes('emploi') ? 'timetable' : title.toLowerCase().includes('cours') ? 'document' : 'message',
        read: false,
        createdAt: nowStr
      };
      all.push(newNotif);

      try {
        setDoc(doc(db, 'academic_notifications', newNotif.id), newNotif).catch(console.error);
      } catch (e) {}
    });

    setStored('academic_notifications', all);
  },

  markAsRead(notificationId: string): void {
    const all = getStored<AcademicNotification>('academic_notifications', []);
    const idx = all.findIndex(n => n.id === notificationId);
    if (idx >= 0) {
      all[idx].read = true;
      setStored('academic_notifications', all);

      try {
        updateDoc(doc(db, 'academic_notifications', notificationId), { read: true }).catch(console.error);
      } catch (e) {}
    }
  }
};

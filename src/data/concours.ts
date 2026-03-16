export interface Concours {
  id: number;
  title: string;
  level: 'BEPC' | 'BAC' | 'Licence' | 'Doctorat';
  requirements: string; // Détail des séries ou spécialités requises
}

export const CONCOURS_LIST: Concours[] = [
  // Page 1
  { id: 1, title: "Professeur des Ecoles", level: "BAC", requirements: "BAC enseignement général, technologique ou professionnel" },
  { id: 2, title: "Professeur Certifié des Collèges (Physique/Sport)", level: "BAC", requirements: "BAC C, D" },
  { id: 3, title: "Professeur Certifié des Collèges (Maths/PC)", level: "BAC", requirements: "BAC C, D, E" },
  { id: 4, title: "Professeur Certifié des Collèges (Maths/SVT)", level: "BAC", requirements: "BAC C, D, E" },
  { id: 5, title: "Agent Technique de l'Environnement", level: "BEPC", requirements: "BEPC" },
  // Page 2
  { id: 6, title: "Médecin Généraliste", level: "Doctorat", requirements: "Diplôme d'État de Docteur en médecine" },
  { id: 7, title: "Psychologue Clinicien", level: "Licence", requirements: "Licence en psychologie" },
  { id: 8, title: "Conseiller en Economie et Développement", level: "Licence", requirements: "Licence en sciences économiques, juridiques, statistiques, sociologie, géographie, démographie" },
  { id: 9, title: "Conseiller en Aménagement du Territoire et Développement Local", level: "Licence", requirements: "Licence en sociologie, sciences économiques, géographie, aménagement du territoire, statistiques" },
  { id: 10, title: "Assistant en Droits Humains", level: "BAC", requirements: "BAC" },
  { id: 11, title: "Conseiller en Droits Humains", level: "Licence", requirements: "Licence en sciences juridiques" },
  { id: 12, title: "Assistant en Interprétation Judiciaire (Français-Dioula-Mooré-Fulfuldé)", level: "BAC", requirements: "BAC" },
  { id: 13, title: "Assistant en Interprétation Judiciaire (Français-Gourmantché-Mooré-Fulfuldé)", level: "BAC", requirements: "BAC" },
  { id: 14, title: "Agent Technique Géomètre", level: "BEPC", requirements: "BEPC" },
  { id: 15, title: "ENAREF CYCLE A", level: "Licence", requirements: "Licence en sciences économiques ou juridiques" },
  { id: 16, title: "Conseiller en Statistique et Analyse du Développement", level: "Licence", requirements: "Licence en sciences économiques, statistiques, géographie ou informatique" },
  { id: 17, title: "Technicien Supérieur en Agriculture", level: "BAC", requirements: "BAC C, D ou BAC agricole" },
  { id: 18, title: "Technicien Supérieur en Technologie d'Assistance Médicale (Orthophonie)", level: "BAC", requirements: "BAC C, D" },
  { id: 19, title: "Technicien Supérieur en Technologie d'Assistance Médicale (Orthoprothèse)", level: "BAC", requirements: "BAC C, D" },
  { id: 20, title: "Technicien Supérieur en Technologie d'Assistance Médicale (Rééducation fonctionnelle)", level: "BAC", requirements: "BAC C, D" },
  { id: 21, title: "Technicien Supérieur en Maintenance Biomédicale Spécialisée", level: "BAC", requirements: "BAC F1, F2, F3, E, C, D" },
  { id: 22, title: "Adjoint des Affaires Economiques", level: "BEPC", requirements: "BEPC" },
  { id: 23, title: "Agent Technique en Génie Civil", level: "BEPC", requirements: "BEPC" },
  { id: 24, title: "Technicien Supérieur en Génie Civil", level: "BAC", requirements: "BAC C, D, E ou F" },
  { id: 25, title: "Technicien Supérieur du Génie Sanitaire", level: "BAC", requirements: "BAC C ou D" },
  { id: 26, title: "Technicien Supérieur en Nutrition et Diététique", level: "BAC", requirements: "BAC C ou D" },
  // ... (I will add more as needed, this is a good start)
];

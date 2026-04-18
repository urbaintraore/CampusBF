import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateDevReport = () => {
  try {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('CampusBF - Rapport de Développement', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${date}`, 14, 30);
    
    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    // Intro
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('1. Aperçu du Projet', 14, 45);
    doc.setFontSize(10);
    doc.text([
      'CampusBF est une plateforme communautaire universitaire conçue pour les étudiants du Burkina Faso.',
      'Elle vise à faciliter l\'accès aux ressources académiques, aux opportunités professionnelles',
      'et à renforcer l\'entraide entre étudiants.'
    ], 14, 52);

    // Milestones Table
    doc.setFontSize(14);
    doc.text('2. Historique des Discussions et Implémentations', 14, 75);
    
    const milestones = [
      ['Phase 1', 'Création de la structure de base (React + Vite + Firebase)'],
      ['Phase 2', 'Système d\'authentification et gestion des profils multi-rôles'],
      ['Phase 3', 'Plateforme de partage de documents et Marketplace'],
      ['Phase 4', 'Système de gestion des événements et inscriptions'],
      ['Phase 5', 'Intégration de l\'IA Gemini pour l\'assistance et les résumés'],
      ['Phase 6', 'Développement du système de Quiz avancé (inspiré de Moodle)'],
      ['Type de Question QCM', 'Support des choix multiples avec pondération'],
      ['Type de Question Cloze', 'Support des textes à trous complexes'],
      ['Type de Question Appariement', 'Support des associations de textes'],
      ['Phase 7', 'Optimisation mobile et ajout des Flashcards dynamiques'],
      ['Phase 8', 'Module de Concours avec parrainage et classement'],
      ['Phase 9', 'Refonte de l\'espace Administration et Statistiques']
    ];

    autoTable(doc, {
      startY: 82,
      head: [['Milestone', 'Description']],
      body: milestones,
      headStyles: { fillColor: [5, 150, 105] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { top: 80 }
    });

    // Section 3: Stack Technologique
    const finalY3 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('3. Stack Technologique', 14, finalY3);
    
    doc.setFontSize(10);
    doc.text([
      '- Frontend : React 19, Tailwind CSS 4.0, Motion',
      '- Backend : Node.js, Express',
      '- Database & Auth : Firebase (Firestore, Auth)',
      '- Intelligence Artificielle : Google Gemini API',
      '- Outils : TypeScript, Vite, jsPDF'
    ], 14, finalY3 + 7);

    // Section 4: Journal Détaillé des Échanges
    const finalY2 = finalY3 + 45;
    
    // Check if we need a new page
    let currentY = finalY2;
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('4. Journal Détaillé des Échanges (Prompts & Réponses)', 14, currentY);

    const chatHistory = [
      ['Utilisateur', 'Initialiser le projet CampusBF avec React, Vite et Tailwind CSS.'],
      ['IA', 'Mise en place de la structure de base, configuration du routeur et de Firebase.'],
      ['Utilisateur', 'Créer un système d\'authentification avec plusieurs rôles (Étudiant, Répétiteur, Admin).'],
      ['IA', 'Développement de AuthContext et gestion des profils Firestore sécurisés par rôle.'],
      ['Utilisateur', 'Ajouter un espace pour partager des documents académiques et des examens.'],
      ['IA', 'Création de la plateforme Documents avec catégories, recherche et système d\'upload.'],
      ['Utilisateur', 'Mettre en place une Marketplace pour les étudiants.'],
      ['IA', 'Implémentation du service Marketplace avec annonces, images et messagerie intégrée.'],
      ['Utilisateur', 'Besoin d\'un système de covoiturage à moto (MotoRide) pour les trajets universitaires.'],
      ['IA', 'Développement du module MotoRide avec publication de trajets et réservation en temps réel.'],
      ['Utilisateur', 'Créer un forum communautaire pour les discussions entre étudiants.'],
      ['IA', 'Mise en place du module Community avec posts, likes et commentaires.'],
      ['Utilisateur', 'Ajouter un générateur de CV et un espace Portfolio pour les futurs diplômés.'],
      ['IA', 'Création des outils CVGenerator et Portfolio basés sur les données utilisateur.'],
      ['Utilisateur', 'Implémenter un système de mentorat avec les anciens élèves (Alumni).'],
      ['IA', 'Développement de AlumniMentorship pour connecter étudiants et mentors.'],
      ['Utilisateur', 'Ajouter un module de recherche de colocations.'],
      ['IA', 'Implémentation de Colocation avec filtres par ville, quartier et université.'],
      ['Utilisateur', 'Intégrer une IA pour aider les étudiants (IA Chatbot, Résumés).'],
      ['IA', 'Intégration du SDK Gemini API avec des prompts personnalisés pour l\'éducation.'],
      ['Utilisateur', 'Implémenter 10 types de questions Moodle (QCM, Cloze, Appariement, etc.) dans les Quiz.'],
      ['IA', 'Refonte complète du système de Quiz : Types complexes, Générateur IA et Lecteur dynamique.'],
      ['Utilisateur', 'Le générateur IA de QUIZ plante sur les questions à trous.'],
      ['IA', 'Correction des schémas JSON pour le support robuste des questions de type "Cloze".'],
      ['Utilisateur', 'Ajouter des Flashcards animées pour réviser les examens.'],
      ['IA', 'Développement du module FlashcardPlayer avec animations 3D CSS (flip).'],
      ['Utilisateur', 'L\'application pour mobile doit être optimisée.'],
      ['IA', 'Refonte Responsive Design de la navigation et des composants pour iOS et Android.'],
      ['Utilisateur', 'Ajouter un module de Concours avec parrainage.'],
      ['IA', 'Implémentation de Contests avec classement dynamique et gestion des referrals.'],
      ['Utilisateur', 'Activer les exports PDF pour les rapports d\'administration.'],
      ['IA', 'Création du service devReportService avec jspdf-autotable pour la synthèse complète.'],
      ['Utilisateur', 'Le rapport n\'est pas complet, il manque l\'historique historique.'],
      ['IA', 'Expansion majeure du Journal des Échanges pour inclure tous les jalons depuis la création de la plateforme.']
    ];

    autoTable(doc, {
      startY: currentY + 7,
      head: [['Intervenant', 'Contenu de l\'échange']],
      body: chatHistory,
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      alternateRowStyles: { fillColor: [245, 247, 255] }
    });

    // Footer
    const finalFooterY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Ce rapport constitue une preuve technique de l\'évolution itérative de la plateforme CampusBF.', 14, Math.min(finalFooterY, 280));

    // Save the PDF
    doc.save(`Rapport_Developpement_CampusBF_${date.replace(/\//g, '-')}.pdf`);
  } catch (error) {
    console.error("Error generating dev report:", error);
  }
};

export const generateSummaryReport = (data: {
  users: any[];
  documents: any[];
  community: any[];
  marketplace: any[];
}) => {
  try {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105);
    doc.text('CampusBF - Rapport de Synthèse Plateforme', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date : ${date}`, 14, 30);

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    const stats = [
      ['Utilisateurs inscrits', data.users.length.toString()],
      ['Documents partagés', data.documents.length.toString()],
      ['Discussions Forum', data.community.length.toString()],
      ['Annonces Marketplace', data.marketplace.length.toString()],
    ];

    autoTable(doc, {
      startY: 45,
      head: [['Indicateur', 'Valeur']],
      body: stats,
      headStyles: { fillColor: [5, 150, 105] },
    });

    doc.save(`Rapport_Synthese_CampusBF_${date.replace(/\//g, '-')}.pdf`);
  } catch (error) {
    console.error("Error generating summary report:", error);
  }
};

export const generateFullReport = (data: {
  users: any[];
  documents: any[];
  community: any[];
  marketplace: any[];
  logs: any[];
}) => {
  try {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105);
    doc.text('CampusBF - Rapport Complet Plateforme', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date : ${date}`, 14, 30);

    // Section 1: Users
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('1. Liste des Utilisateurs', 14, 45);
    
    const userRows = data.users.map(u => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.role,
      u.university || 'N/A'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Nom', 'Email', 'Rôle', 'Université']],
      body: userRows.slice(0, 50),
      headStyles: { fillColor: [5, 150, 105] },
    });

    // Section 2: Recent Activity (Logs)
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('2. Journaux d\'activité récents', 14, finalY);

    const logRows = data.logs.slice(0, 20).map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.userEmail,
      l.action,
      l.details
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Date', 'Utilisateur', 'Action', 'Détails']],
      body: logRows,
      headStyles: { fillColor: [5, 150, 105] },
    });

    doc.save(`Rapport_Complet_CampusBF_${date.replace(/\//g, '-')}.pdf`);
  } catch (error) {
    console.error("Error generating full report:", error);
  }
};

# Architecture Logicielle de CampusBF 🎓🇧🇫

Bienvenue dans le document technique de référence d'architecture de **CampusBF**, la plateforme numérique complète d'accompagnement académique, de mentorat, de préparation aux concours de la fonction publique, et d'insertion professionnelle pour les étudiants au Burkina Faso.

---

## 🏛️ Vue d'Ensemble de l'Architecture

CampusBF est architecturé comme une application web monolithique modulaire moderne de type **SPA (Single Page Application)** bâtie sur **React 18** et **Vite**, hautement intégrée avec l'écosystème **Firebase (Firestore & Authentication)** pour une persistance temps réel robuste et sécurisée.

```
       ┌────────────────────────────────────────────────────────┐
       │                   Interface Client                     │
       │     (React / Vite SPA + Tailwind CSS + Framer Motion)  │
       └──────────────┬──────────────────────────┬──────────────┘
                      │                          │
        (Temps Réel via SDK Client)       (Appels API REST)
                      │                          │
                      ▼                          ▼
       ┌────────────────────────┐         ┌────────────────────────┐
       │     Firebase Cloud     │         │     Serveur Backend    │
       │   ─ Firestore (Db)     │         │   (Régulation / Proxy) │
       │   ─ Firebase Auth      │         │   ─ Sauvegardes        │
       │   ─ Storage S3-like    │         │   ─ Intégration Gemini │
       └────────────────────────┘         └────────────────────────┘
```

### Principes Directeurs
1. **Real-time par Défaut** : Utilisation intensive d'abonnements Firestore via `onSnapshot` pour assurer une synchronisation instantanée du tableau de bord administratif, des salons de discussion (ClassChat), des offres de colocation et des trajets MotoRide.
2. **Tolérance aux Pannes & Mode Hors-ligne** : Des systèmes de secours locaux complexes basés sur `localStorage` filtrent les échecs réseau. Si Firestore est indisponible ou si la connexion burkinabè est lente, des compteurs et des profils d'éligibilité fictifs de secours sont chargés de façon transparente.
3. **Sécurité Zéro-Trust** : Les règles de sécurité de Firestore (`firestore.rules`) sont hautement structurées, limitant la modification du rôle « Admin » et s'assurant que seuls les propriétaires légitimes peuvent éditer leurs publications.

---

## 📁 Arborescence Modulaire du Code Source

```
src/
├── App.tsx                        # Point d'entrée de navigation globale et de routage applicatif
├── main.tsx                       # Initialisation de l'arbre DOM React et de la configuration de base
├── index.css                      # Styles globaux Tailwind CSS (Définition de la charte de couleurs)
├── components/                    # Composants React modulaires, réutilisables et autonomes
│   ├── layout/                    # Layout structurel de l'application (Barres de navigation, Footers)
│   ├── admin/                     # Modules spécifiques au tableau de bord d'administration (Processeurs IA)
│   ├── ErrorBoundary.tsx          # Gestionnaire de captures d'erreurs d'exécution globales
│   ├── Chatbot.tsx                # Assistant intelligent Gemini intégré 24h/24
│   └── ...                        # Composants interactifs (MotoMap, QuizPlayer, PrintOrderModal, etc.)
├── context/                       # Fournisseurs de contexte globaux
│   ├── AuthContext.tsx            # Gestion unifiée de Firebase Auth, des rôles et des synchronisations
│   └── ThemeContext.tsx           # Gestion des thèmes graphiques et de l'accessibilité lumineuse
├── data/                          # Données physiques statiques et dictionnaires d'initialisation
│   ├── concours.ts                # Banques de sujets pour les révisions de la Fonction Publique
│   └── mock.ts                    # Données locales de secours pour le développement offline
├── hooks/                         # Hooks de cycle de vie et utilitaires de commodité React
│   ├── useCachedQuery.ts          # Mécanisme de mise en cache mémoire de requêtes lourdes
│   └── usePermission.ts           # Validation instantanée des droits d'accès
├── lib/                           # Configurations et intégration de services tiers
│   └── firebase.ts                # Point de connexion et helper de gestion globale du SDK Firebase
├── pages/                         # Vues et écrans principaux (Routés via React Router)
│   ├── AdminDashboard.tsx         # Panneau de contrôle administratif global
│   ├── CVGenerator.tsx            # Éditeur automatisé de CV étudiants téléchargeables
│   ├── Community.tsx              # Espaces d'entraide et forums thématiques d'échanges
│   ├── financing/                 # Pôle de bourses et d'éligibilité financière (FinancingDashboard)
│   └── ...                        # Autres services (MotoRide, Colocation, Quizzes, etc.)
├── services/                      # Services isolés d'appels à la base de données Firestore et aux APIs
│   ├── adminStatisticsService.ts  # Centraliseur temps réel multi-flux pour les compteurs d'administration
│   ├── financingService.ts        # Évaluation des scores de financement et calcul du badge d'éligibilité
│   └── ...                        # Services des 21 fonctionnalités clés (academic, marketplace, deal, etc.)
├── types/                         # Fichiers de définitions de types et interfaces TypeScript strictes
└── utils/                         # Fonctions pures et routines de calcul (Sécurisation des vidéos, seeders)
```

---

## 🔑 Rôles et Modèle de Permissions

CampusBF gère une hiérarchie stricte d'utilisateurs définie par l'attribut `role` au sein de la collection `/users/{userId}`:

| Rôle | Description | Droits et Autorisations |
| :--- | :--- | :--- |
| `student` | Étudiant Burkinabè | Accès standard, soumission de documents, achats sur la marketplace, création de trajets MotoRide, demandes d'aide. |
| `tutor` | Parrain / Étudiant Mentoré | Accompagnement, création de cours de soutien, publication d'offres de répétitions scolaires. |
| `teacher` | Enseignant Officiel | Publication réglementée de Documents académiques et anciens examens, validation de devoirs. |
| `parent` | Support Parental | Surveillance des résultats de quiz de leurs enfants, paiement sécurisé des impressions. |
| `company` | Partenaire Professionnel | Publication d'offres de stages, opportunités de parrainage et bourses privées. |
| `institution` | Établissement / Université | Publication d'annonces officielles, mise en avant de programmes académiques burkinabè. |
| `admin` | Administrateur Principal | Accès total au `AdminDashboard`, modération des contenus signalés, validation des documents traités par IA. |

---

## 🗄️ Architecture de la Base de Données (Firestore Blueprint)

Les documents Firestore respectent les caractéristiques de types configurées dans le manifeste `firebase-blueprint.json` :

### 1. Collections Principales

* **`/users/{userId}`** : Profils de comptes utilisateurs (état de validation, niveau universitaire, informations de parrainage).
* **`/financing_profiles/{userId}`** : Fiches d'évaluation de la vulnérabilité et de l'éligibilité financière :
  * Calcul de score fondé sur : `academicLevelScore`, `profileCompletionScore`, `activityScore` et `documentsScore`.
  * Attribution d'un badge dynamique d'éligibilité (`Peu Éligible`, `Moyennement Éligible`, `Très Éligible`, `Excellent`).
* **`/aid_applications/{applicationId}`** : Demandes d'aide étudiante nominatives (bourses, logement, transport, alimentation) suivies en temps réel.
* **`/processed_documents/{docId}`** : Pièces académiques d'études d'une matière donnée (traites par un système d'IA avec notation automatique et tags).
* **`/public_exam_quizzes/{quizId}`** : Quiz interactifs rattachés aux révisions de la Fonction Publique, validés par des enseignants burkinabè.
* **`/reports/{reportId}`** : Signalements de modération pour des contenus inappropriés ou injurieux sur la communauté.
* **`/community_videos/{videoId}`** : Formats vidéo verticaux d'astuces d'étudiants (avec sous-collections `/comments/{commentId}` et `/video_likes/{likeId}`).
* **`/referrals/{referralId}`** : Gestion des parrainages (génération de codes, calcul des récompenses lors des connexions).

---

## ⚡ Synchronisation Temps Réel et Flux des Statistiques

Plutôt que d'exécuter des lectures individuelles répétées à chaque affichage, les statistiques d'administration utilisent un flux intelligent centralisé :

```
             onSnapshot(users)
             onSnapshot(posts)
     ┌─────► onSnapshot(documents)  ──┐
     │       onSnapshot(marketplace)  │
     │                                │
┌────┴──────────────────────────┐     ▼     ┌───────────────────────────┐
│   adminStatisticsService  ====│==========►│     Envoi direct au       │
│  (Filtre & Agation locale)    │           │    AdminDashboard.tsx     │
└────┬──────────────────────────┘           └─────────────┬─────────────┘
     ▲                                                    │
     │  (Si Hors-ligne / Échec Réseau)                    ▼
     └─────────────────────────────────────────────── Mise en cache local
                                                     & Rendu Immédiat
```

1. **`subscribeDashboardStatistics`** : Établit un ensemble coordinateur d'observateurs Firestore temps réel.
2. Lorsque des modifications de structures (nouvel utilisateur inscrit, nouveau document partagé, annonce vendue) interviennent, la fonction d'agrégation compile les volumes totaux instantanément.
3. Le résultat est retourné à l'identifiant du tableau de bord d'administration et sauvegardé en local dans l'environnement cache.

---

## 🛠️ Dépendances Majeures

* **`react` & `react-dom`** : Noyau de l'application déclarative et interactive.
* **`firebase`** : Bibliothèque SDK de connexion et de persistance instantanée.
* **`motion` (importé de `motion/react`)** : Moteur d'animations fluide pour les changements d'onglets et les affichages de fiches.
* **`lucide-react`** : Bibliothèque universelle d'icônes vectorielles uniformisées.
* **`recharts`** : Module dynamique de rendu de graphiques statistiques d'aide financière et d'activité.
* **`tailwindcss`** : Cadre utilitaire CSS moderne pour une conception web élégante et adaptative.

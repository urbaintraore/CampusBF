# CampusBF 🎓

**CampusBF** est la plateforme "Super-App" de référence pour les étudiants du Burkina Faso. Elle centralise tous les outils nécessaires à la réussite académique et à la vie étudiante en un seul endroit.

![CampusBF Logo](public/logo.svg)

## 🚀 Vision
L'objectif de CampusBF est de digitaliser l'écosystème universitaire burkinabè pour offrir aux étudiants un accès simplifié aux ressources, aux opportunités professionnelles et à une communauté d'entraide sécurisée.

## ✨ Fonctionnalités Clés

### 📚 Académique & Documents
- **Bibliothèque Collaborative** : Partage et téléchargement de sujets d'examens, TD corrigés, résumés de cours et mémoires.
- **Filtres Dynamiques** : Recherche précise par université, filière, matière et année.
- **Annuaire des Enseignants & Répétiteurs** : Mise en relation directe avec des professionnels pour un accompagnement personnalisé.

### 🚗 MotoRide (Covoiturage Étudiant)
- **Sécurité Renforcée** : Interaction restreinte aux étudiants de la **même université**.
- **Économique & Rapide** : Solution de transport adaptée au budget et au rythme des étudiants.
- **Vérification** : Système de vérification des conducteurs et des véhicules.

### 💼 Opportunités & Carrière
- **Stages & Emplois** : Publication et consultation d'offres de stages, bourses et premiers emplois.
- **Formations** : Accès à des formations certifiantes organisées par des experts.

### 🤝 Communauté & Services
- **Marketplace** : Achat et vente de matériel étudiant (livres, ordinateurs, vélos).
- **Forums & Groupes** : Espaces de discussion par université et par centre d'intérêt.
- **Objets Perdus/Trouvés** : Système d'annonces pour retrouver ses effets personnels sur le campus.

## 🛠️ Stack Technique

- **Frontend** : React 19, Vite, Tailwind CSS 4
- **Backend** : Node.js (Express), Firebase (Firestore, Authentication)
- **Animations** : Motion (framer-motion)
- **Cartographie** : Leaflet (pour MotoRide)
- **Design** : Lucide React (Icônes), Responsive Design (Mobile-First)

## 📦 Installation & Développement

1. **Cloner le projet** :
   ```bash
   git clone https://github.com/votre-compte/campusbf.git
   cd campusbf
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configuration de l'environnement** :
   Créez un fichier `.env` à la racine et configurez les variables suivantes (voir `.env.example`) :
   - `GEMINI_API_KEY`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
   - Configuration Firebase (dans `src/lib/firebase.ts` ou via `firebase-applet-config.json`)

4. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```

## 🤝 Contribution

Nous accueillons avec enthousiasme les contributions des développeurs passionnés par l'éducation et la technologie. 
- Pour les bugs ou suggestions, ouvrez une **Issue**.
- Pour proposer du code, soumettez une **Pull Request**.

## 💰 Investisseurs

CampusBF est en pleine croissance et cherche à étendre son impact. Si vous êtes intéressé par le futur de l'EdTech au Burkina Faso, contactez-nous pour obtenir notre **Pitch Deck** et nos statistiques de traction.

---
*Développé avec ❤️ pour la jeunesse burkinabè.*

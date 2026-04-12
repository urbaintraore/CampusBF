# Guide de Contribution à CampusBF 🤝

Merci de l'intérêt que vous portez à **CampusBF** ! En tant que projet communautaire, chaque contribution compte pour améliorer la vie des étudiants au Burkina Faso.

## 🌟 Comment contribuer ?

### 1. Signaler des Bugs 🐛
Si vous trouvez un bug, veuillez ouvrir une "Issue" sur GitHub en précisant :
- Les étapes pour reproduire le bug.
- Votre environnement (navigateur, version mobile/desktop).
- Le comportement attendu vs le comportement actuel.

### 2. Proposer des Fonctionnalités 💡
Vous avez une idée géniale pour la plateforme ? Ouvrez une "Issue" de type "Feature Request" pour en discuter avec l'équipe.

### 3. Soumettre du Code (Pull Requests) 💻
1. **Forkez** le dépôt.
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/ma-super-idee`).
3. **Commitez** vos changements avec des messages clairs.
4. **Poussez** votre branche (`git push origin feature/ma-super-idee`).
5. Ouvrez une **Pull Request**.

## 🛠️ Standards de Code

- **TypeScript** : Le projet est entièrement typé. Évitez l'utilisation de `any`.
- **Tailwind CSS** : Utilisez les classes utilitaires pour le style. Évitez le CSS personnalisé sauf nécessité absolue.
- **Composants** : Créez des composants réutilisables dans `src/components`.
- **Firebase** : Utilisez les services existants dans `src/lib/firebase.ts` pour les interactions avec la base de données.

## 🧪 Tests
Avant de soumettre une PR, assurez-vous que le projet compile correctement :
```bash
npm run build
```

## 📜 Code de Conduite
Soyez respectueux et bienveillants envers les autres contributeurs. L'objectif est de construire ensemble un outil utile pour tous.

---
*Ensemble, construisons le futur de l'université au Burkina !*

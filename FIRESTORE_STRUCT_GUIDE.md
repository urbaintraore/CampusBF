# Guide de Structure de Données de la Hiérarchie Académique (Firestore)

Ce guide décrit l'architecture de la base de données Firestore pour soutenir l'organisation multi-tenant des établissements d'enseignement supérieur au Burkina Faso.

---

## 1. Modèle d'Architecture : Root Collections vs Sub-collections

Pour assurer des performances élevées, une indexation simplifiée et un support optimal du multi-tenant, CampusBF utilise un modèle où chaque entité majeure est stockée de manière **plate dans des collections racine**, tout en maintenant des liaisons relationnelles par clés étrangères (`universityId`, `departmentId`, `filiereId`).

### Avantages de ce modèle :
1. **Multi-tenant d'abord** : Le filtrage par `universityId` dans n'importe quelle requête permet d'isoler instantanément les données par institution.
2. **Requêtes de haut niveau (Cross-department)** : Permet à un recteur d'université de requêter toutes les classes ou tous les étudiants de l'université sans devoir traverser des sous-collections complexes imbriquées.
3. **Sécurité ABAC (Attribute-Based Access Control)** : Les règles Firestore peuvent vérifier directement l'ID de l'université ou du département d'affiliation sans faire d'appels `get()` multiples et récursifs.

---

## 2. Schémas détaillés des Collections

### 10.1 Collection `universities`
* **Chemin** : `/universities/{universityId}`
* **Description** : Liste des universités enregistrées dans CampusBF (ex: Université Joseph Ki-Zerbo).

```json
{
  "id": "univ_ujkz",
  "name": "Université Joseph Ki-Zerbo",
  "code": "UJKZ",
  "description": "Première université publique du Burkina Faso, créée en 1974.",
  "location": "Avenue Charles de Gaulle, Ouagadougou 03 BP 7021",
  "type": "public",
  "contactEmail": "contact@ujkz.bf",
  "founderId": "user_id_universit_admin",
  "createdAt": "2026-06-04T08:00:00Z",
  "status": "active"
}
```

### 10.2 Collection `departments`
* **Chemin** : `/departments/{departmentId}`
* **Description** : Unités de Formation et de Recherche (UFR) ou Instituts au sein d'une université.

```json
{
  "id": "dept_ufr_sds_ujkz",
  "universityId": "univ_ujkz",
  "name": "UFR Sciences de la Santé",
  "code": "UFR-SDS",
  "description": "Département de formation des médecins, pharmaciens et odontostomatologues.",
  "responsible": "Prof. Jean-Baptiste GOUUMBRI (Doyen)",
  "createdAt": "2026-06-04T08:15:00Z",
  "status": "active"
}
```

### 10.3 Collection `filieres`
* **Chemin** : `/filieres/{filiereId}`
* **Description** : Les filières d'apprentissage d'un département donné (parcours/spécialités).

```json
{
  "id": "field_medecine_ujkz",
  "departmentId": "dept_ufr_sds_ujkz",
  "universityId": "univ_ujkz",
  "name": "Doctorat en Médecine Générale",
  "code": "MED",
  "description": "Cursus académique de 8 ans menant au diplôme d'État de Docteur en Médecine.",
  "responsible": "Prof. Assita DIALLO",
  "status": "active"
}
```

### 10.4 Collection `classes`
* **Chemin** : `/classes/{classeId}`
* **Description** : Les promotions / niveaux au sein d'une filière (ex: Licence 3 Génie Logiciel).

```json
{
  "id": "class_l3gl_ujkz",
  "filiereId": "field_genie_logiciel_ujkz",
  "departmentId": "dept_ufr_lac_ujkz",
  "universityId": "univ_ujkz",
  "name": "Licence 3 - Génie Logiciel (L3GL)",
  "code": "L3-GL",
  "academicYear": "2025-2026",
  "studentCount": 114,
  "responsible": "Dr. Ousmane COMPAORE",
  "status": "active"
}
```

---

## 3. Sécurité et Règles d'Accès Multi-tenant (Firestore Rules)

Le multi-tenant est implémenté et validé via des structures strictes de vérification d'identité.

1. **Isolation de Lecture** : Tout utilisateur connecté (`isSignedIn()`) peut consulter les structures pédagogiques de son université de rattachement.
2. **Protection d'Écriture** : Seuls les utilisateurs disposant du rôle `super_admin`, `admin_university` de l'université correspondante ou `chef_departement` du département concerné peuvent créer ou modifier ces entités.

La sécurité s'articule autour d'un système RBAC intégré à la collection `/users/{userId}` :
```javascript
// Exemple de validation de rôle au sein d'un match Firestore
function getUserRole(userId) {
  return get(/databases/$(database)/documents/users/$(userId)).data.role;
}

function getUserUniversity(userId) {
  return get(/databases/$(database)/documents/users/$(userId)).data.university;
}

// Règle d'écriture sur les départements
match /departments/{id} {
  allow write: if isSignedIn() && (
    getUserRole(request.auth.uid) == 'super_admin' ||
    (getUserRole(request.auth.uid) == 'admin_university' && getUserUniversity(request.auth.uid) == request.resource.data.universityId)
  );
}
```

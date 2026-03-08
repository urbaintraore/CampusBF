import { User, Document, Tutor, Internship, MarketplaceItem, Group, Post, Ad, Message, Notification } from '../types';

export const CURRENT_USER: User = {
  id: 'u1',
  firstName: 'Ousmane',
  lastName: 'Sankara',
  university: 'Université Joseph Ki-Zerbo',
  major: 'Informatique',
  level: 'Licence 3',
  email: 'ousmane.sankara@ujkz.bf',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ousmane',
  role: 'student',
  tutorStatus: 'none',
  subscriptionStatus: 'none',
};

export const ADMIN_USER: User = {
  id: 'admin1',
  firstName: 'Admin',
  lastName: 'CampusBF',
  university: 'Administration',
  major: 'Gestion',
  level: 'Staff',
  email: 'admin@campusbf.bf',
  avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
  role: 'admin',
};

import { TutorApplication } from '../types';

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  ADMIN_USER,
  {
    id: 'u2',
    firstName: 'Moussa',
    lastName: 'Koné',
    university: 'UJKZ',
    major: 'Informatique',
    level: 'L3',
    email: 'moussa@test.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Moussa',
    role: 'student',
  },
  {
    id: 'u3',
    firstName: 'Awa',
    lastName: 'Traoré',
    university: 'UTS',
    major: 'Droit',
    level: 'M1',
    email: 'awa@test.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Awa',
    role: 'student',
  },
  {
    id: 'u4',
    firstName: 'Ibrahim',
    lastName: 'Soro',
    university: 'UJKZ',
    major: 'Médecine',
    level: 'D3',
    email: 'ibrahim@test.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ibrahim',
    role: 'tutor',
  },
];

export const MOCK_APPLICATIONS: TutorApplication[] = [
  {
    id: 'app1',
    userId: 'u2',
    user: {
        id: 'u2',
        firstName: 'Moussa',
        lastName: 'Koné',
        university: 'UJKZ',
        major: 'Info',
        level: 'L3',
        email: 'moussa@test.com',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Moussa',
        role: 'student',
    },
    description: 'Je souhaite devenir répétiteur en Java et Algorithmique.',
    documentUrl: '#',
    status: 'pending',
    createdAt: '2024-03-05T08:00:00',
    subjects: ['Java', 'Algorithmique', 'Base de données'],
    hourlyRates: {
      licence: 2500,
      master: 3000
    }
  }
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'Algèbre Linéaire - Sujet Examen 2024',
    type: 'exam',
    university: 'Université Joseph Ki-Zerbo',
    major: 'Mathématiques',
    year: '2024',
    subject: 'Algèbre',
    authorId: 'u2',
    downloadUrl: '#',
    createdAt: '2024-02-15',
    downloads: 124,
    likes: 45,
  },
  {
    id: 'd2',
    title: 'Introduction au Droit Civil - Résumé',
    type: 'summary',
    university: 'Université Thomas Sankara',
    major: 'Droit',
    year: '2023',
    subject: 'Droit Civil',
    authorId: 'u3',
    downloadUrl: '#',
    createdAt: '2023-11-20',
    downloads: 890,
    likes: 210,
  },
  {
    id: 'd3',
    title: 'TD Physique Quantique - Corrigé',
    type: 'exercise',
    university: 'Université Joseph Ki-Zerbo',
    major: 'Physique',
    year: '2024',
    subject: 'Physique',
    authorId: 'u4',
    downloadUrl: '#',
    createdAt: '2024-03-01',
    downloads: 56,
    likes: 12,
  },
];

export const MOCK_TUTORS: Tutor[] = [
  {
    id: 't1',
    userId: 'u5',
    user: {
      id: 'u5',
      firstName: 'Fatima',
      lastName: 'Ouédraogo',
      university: 'Université Joseph Ki-Zerbo',
      major: 'Mathématiques',
      level: 'Master 1',
      email: 'fatima@email.com',
      phone: '+226 70 12 34 56',
      city: 'Ouagadougou',
      neighborhood: 'Gounghin',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
      role: 'tutor',
    },
    subjects: ['Mathématiques', 'Statistiques', 'Probabilités'],
    hourlyRate: 2000,
    description: 'Étudiante en Master 1, je donne des cours de soutien aux étudiants de Licence 1 et 2. Pédagogue et patiente.',
    rating: 4.8,
    reviewsCount: 24,
    university: 'Université Joseph Ki-Zerbo',
  },
  {
    id: 't2',
    userId: 'u6',
    user: {
      id: 'u6',
      firstName: 'Jean',
      lastName: 'Kaboré',
      university: 'Université Thomas Sankara',
      major: 'Économie',
      level: 'Master 2',
      email: 'jean@email.com',
      phone: '+226 76 98 76 54',
      city: 'Ouagadougou',
      neighborhood: 'Dassasgho',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean',
      role: 'tutor',
    },
    subjects: ['Microéconomie', 'Macroéconomie', 'Comptabilité'],
    hourlyRate: 2500,
    description: 'Expert en économie, je vous aide à valider vos modules avec mention.',
    rating: 4.9,
    reviewsCount: 42,
    university: 'Université Thomas Sankara',
  },
];

export const MOCK_INTERNSHIPS: Internship[] = [
  {
    id: 'i1',
    title: 'Stagiaire Développeur Web',
    company: 'Orange Burkina Faso',
    location: 'Ouagadougou',
    type: 'internship',
    description: 'Nous recherchons un stagiaire passionné par le développement web (React, Node.js) pour une durée de 3 mois.',
    postedAt: '2024-03-01',
    deadline: '2024-03-30',
  },
  {
    id: 'i2',
    title: 'Assistant Comptable',
    company: 'Coris Bank International',
    location: 'Bobo-Dioulasso',
    type: 'internship',
    description: 'Stage de perfectionnement au service comptabilité.',
    postedAt: '2024-02-28',
  },
  {
    id: 'i3',
    title: 'Agent Commercial (Job Étudiant)',
    company: 'Canal+ Burkina',
    location: 'Ouagadougou',
    type: 'job',
    description: 'Job étudiant pour les weekends. Promotion des offres Canal+.',
    postedAt: '2024-03-02',
  },
];

export const MOCK_MARKETPLACE: MarketplaceItem[] = [
  {
    id: 'm1',
    title: 'HP EliteBook 840 G3',
    description: 'Core i5, 8GB RAM, 256GB SSD. En très bon état, batterie tient 4h.',
    price: 125000,
    category: 'computer',
    sellerId: 'u7',
    seller: {
      id: 'u7',
      firstName: 'Paul',
      lastName: 'Sawadogo',
      university: 'Université Aube Nouvelle',
      major: 'Informatique',
      level: 'L2',
      email: 'paul@email.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paul',
      role: 'student',
    },
    location: 'Ouagadougou, Zone du Bois',
    postedAt: '2024-03-03',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: 'm2',
    title: 'Livre Droit Constitutionnel',
    description: 'Livre de référence pour les étudiants de L1 Droit. Acheté l\'an passé.',
    price: 5000,
    category: 'book',
    sellerId: 'u8',
    seller: {
      id: 'u8',
      firstName: 'Amina',
      lastName: 'Traoré',
      university: 'Université Thomas Sankara',
      major: 'Droit',
      level: 'L2',
      email: 'amina@email.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina',
      role: 'student',
    },
    location: 'Ouagadougou, Saaba',
    postedAt: '2024-03-04',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Informatique L3 - UJKZ',
    type: 'class',
    membersCount: 145,
    description: 'Groupe de la promotion Licence 3 Informatique de l\'Université Joseph Ki-Zerbo.',
  },
  {
    id: 'g2',
    name: 'Club Anglais - UJKZ',
    type: 'university',
    membersCount: 320,
    description: 'Pour ceux qui veulent pratiquer l\'anglais sur le campus.',
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    groupId: 'g1',
    authorId: 'u2',
    author: {
        id: 'u2',
        firstName: 'Moussa',
        lastName: 'Koné',
        university: 'UJKZ',
        major: 'Info',
        level: 'L3',
        email: 'moussa@test.com',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Moussa',
        role: 'student',
    },
    content: 'Salut les gars, est-ce que quelqu\'un a le cours de Java d\'hier ? J\'étais absent.',
    likes: 5,
    likedBy: [],
    comments: [
      {
        id: 'c1',
        authorId: 'u3',
        author: {
          id: 'u3',
          firstName: 'Awa',
          lastName: 'Traoré',
          university: 'UTS',
          major: 'Droit',
          level: 'M1',
          email: 'awa@test.com',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Awa',
          role: 'student',
        },
        content: 'Oui, je te l\'envoie en PV.',
        createdAt: '2024-03-05T09:45:00',
      },
      {
        id: 'c2',
        authorId: 'u4',
        author: {
          id: 'u4',
          firstName: 'Ibrahim',
          lastName: 'Soro',
          university: 'UJKZ',
          major: 'Médecine',
          level: 'D3',
          email: 'ibrahim@test.com',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ibrahim',
          role: 'tutor',
        },
        content: 'Moi aussi je suis preneur !',
        createdAt: '2024-03-05T10:00:00',
      }
    ],
    createdAt: '2024-03-05T09:30:00',
  }
];

export const MOCK_COMMUNITY = MOCK_POSTS;

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg1',
    senderId: 'u5', // Fatima (Tutor)
    receiverId: 'u1', // Current User
    content: 'Bonjour Ousmane, je suis disponible ce samedi pour le cours de maths.',
    timestamp: '2024-03-05T10:30:00',
    read: false,
  },
  {
    id: 'msg2',
    senderId: 'u1',
    receiverId: 'u5',
    content: 'Super ! 14h ça vous va ?',
    timestamp: '2024-03-05T10:35:00',
    read: true,
  },
  {
    id: 'msg3',
    senderId: 'u7', // Paul (Seller)
    receiverId: 'u1',
    content: 'Le PC est toujours disponible si tu es intéressé.',
    timestamp: '2024-03-04T18:20:00',
    read: true,
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'message',
    title: 'Nouveau message',
    message: 'Fatima Ouédraogo vous a envoyé un message.',
    read: false,
    createdAt: '2024-03-05T10:30:00',
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'success',
    title: 'Document validé',
    message: 'Votre résumé de Droit Civil a été approuvé et publié.',
    read: true,
    createdAt: '2024-03-04T09:15:00',
  },
  {
    id: 'n3',
    userId: 'u1',
    type: 'alert',
    title: 'Rappel cours',
    message: 'Votre cours avec Jean Kaboré commence dans 1 heure.',
    read: true,
    createdAt: '2024-03-03T14:00:00',
  }
];

export const MOCK_ADS: Ad[] = [
  {
    id: 'ad1',
    title: 'Offre Spéciale : -50% sur les fournitures chez Papyrus',
    imageUrl: 'https://images.unsplash.com/photo-1503551723145-6c040742065b?w=800&auto=format&fit=crop&q=60',
    linkUrl: '#',
    active: true,
    createdAt: '2024-03-01T10:00:00',
  },
  {
    id: 'ad2',
    title: 'Nouveau : Cours de soutien en Anglais intensif',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=60',
    linkUrl: '#',
    active: true,
    createdAt: '2024-03-02T11:00:00',
  },
  {
    id: 'ad3',
    title: 'Job Étudiant : Serveur pour les weekends',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60',
    linkUrl: '#',
    active: true,
    createdAt: '2024-03-03T12:00:00',
  }
];

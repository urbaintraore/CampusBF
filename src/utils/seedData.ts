import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const burkinabeNames = [
  "Ousmane Traoré", "Fatoumata Ouédraogo", "Moussa Sawadogo", "Aïssata Diallo",
  "Ibrahim Compaoré", "Mariam Zongo", "Abdoulaye Kaboré", "Aminata Sanou",
  "Souleymane Bationo", "Kadidiatou Yaro", "Issoufou Nana", "Rasmata Ilboudo",
  "Hamidou Tiendrébéogo", "Fatimata Bamogo", "Boukary Kindo", "Salimata Ouattara",
  "Yacouba Dabilgou", "Awa Kabré", "Mahamadi Tapsoba", "Bintou Nikiéma"
];

export const seedContestParticipants = async (contestId: string) => {
  try {
    const participantsCollection = collection(db, 'contest_participants');
    
    const promises = burkinabeNames.map(name => {
      const [firstName, ...lastNameParts] = name.split(' ');
      return addDoc(participantsCollection, {
        contestId,
        userId: 'dummy_' + Math.random().toString(36).substr(2, 9), // Dummy ID
        userName: name,
        status: 'pending',
        registrationDate: new Date().toISOString(),
        stats: {},
        totalScore: 0
      });
    });

    await Promise.all(promises);
    console.log('Seeding complete');
  } catch (error) {
    console.error('Error seeding participants:', error);
    throw error;
  }
};

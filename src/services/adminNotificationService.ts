import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialisation de Firebase Admin
// Les secrets doivent être configurés dans les variables d'environnement
let db: admin.firestore.Firestore | null = null;
let messaging: admin.messaging.Messaging | null = null;
let isInitialized = false;

function ensureInitialized() {
  if (isInitialized) return true;

  if (!admin.apps.length) {
    try {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
        : null;

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Fallback pour le développement local ou si configuré via ADC
        // En environnement de prod sandboxed sans ADC, ceci peut échouer
        admin.initializeApp();
      }
      console.log('Firebase Admin initialisé avec succès');
      isInitialized = true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
      return false;
    }
  } else {
    isInitialized = true;
  }
  
  if (isInitialized) {
    try {
      db = getFirestore();
      messaging = getMessaging();
    } catch (e) {
      console.error('Erreur lors de la récupération des services Firebase Admin:', e);
      isInitialized = false;
    }
  }
  
  return isInitialized;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'documents' | 'internships' | 'forums' | 'contests' | 'events' | 'system';
  data?: Record<string, string>;
}

export const sendNotificationToUser = async (userId: string, payload: NotificationPayload) => {
  if (!ensureInitialized() || !db || !messaging) {
    console.warn('Firebase Admin non initialisé. Notification ignorée.');
    return;
  }
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) return;

    // Vérifier les préférences (On impose aux étudiants)
    const isEnforced = userData.role === 'student';
    if (!isEnforced && userData.notificationPreferences && !userData.notificationPreferences[payload.type]) {
      console.log(`Utilisateur ${userId} a désactivé les notifications de type ${payload.type}`);
      return;
    }

    // FCM Notification
    if (userData.fcmToken) {
      try {
        const message = {
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            ...payload.data,
            type: payload.type,
          },
          token: userData.fcmToken,
        };
        await messaging.send(message);
      } catch (fcmError) {
        console.error(`Erreur FCM pour ${userId}:`, fcmError);
      }
    }

    // MOCK WHATSAPP NOTIFICATION
    if (isEnforced || (userData.notificationPreferences?.whatsappEnabled && userData.notificationPreferences?.whatsappNumber)) {
      const waNumber = userData.notificationPreferences?.whatsappNumber || userData.phone;
      if (waNumber) {
        console.log(`[WHATSAPP NOTIFICATION ENFORCED: ${isEnforced}] Sent to ${waNumber}: ${payload.title} - ${payload.body}`);
      }
    }

    // Enregistrer dans l'historique
    await db.collection('notifications').add({
      userId,
      title: payload.title,
      message: payload.body,
      type: payload.type,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error(`Erreur lors de l'envoi de la notification à ${userId}:`, error);
  }
};

export const notifyUsersByFilter = async (filter: (user: any) => boolean, payload: NotificationPayload) => {
  if (!ensureInitialized() || !db) {
    console.warn('Firebase Admin non initialisé. Notification par filtre ignorée.');
    return;
  }
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(filter);

    console.log(`Envoi de notifications à ${users.length} utilisateurs`);

    const promises = users.map(user => sendNotificationToUser(user.id, payload));
    await Promise.all(promises);
  } catch (error) {
    console.error('Erreur lors de l\'envoi groupé de notifications:', error);
  }
};

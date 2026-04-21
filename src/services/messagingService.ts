import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  try {
    const messagingInstance = await messaging();
    if (!messagingInstance) {
      console.warn('Notifications non supportées sur ce navigateur');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messagingInstance, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // User will need to provide this
      });

      if (token) {
        // Sauvegarder le token dans Firestore
        await updateDoc(doc(db, 'users', userId), {
          fcmToken: token,
          notificationPreferences: {
            documents: true,
            internships: true,
            forums: true,
            contests: true,
            events: true
          }
        });
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la demande de permission notifications:', error);
    return null;
  }
};

export const onMessageListener = async () => {
  const messagingInstance = await messaging();
  if (!messagingInstance) return null;

  return new Promise((resolve) => {
    onMessage(messagingInstance, (payload) => {
      console.log('Message reçu:', payload);
      resolve(payload);
    });
  });
};

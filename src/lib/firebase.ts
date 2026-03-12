import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDar6APKyujjjs0OID7nLRHk6J6zNld04g",
  authDomain: "campusbf-47c22.firebaseapp.com",
  projectId: "campusbf-47c22",
  storageBucket: "campusbf-47c22.firebasestorage.app",
  messagingSenderId: "889411048235",
  appId: "1:889411048235:web:335f3dd8ef770587e4eb6e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

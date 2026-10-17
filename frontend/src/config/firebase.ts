import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isConfigured = false;

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (apiKey && apiKey !== 'AIzaSy...' && apiKey.trim().length > 5) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
  } catch (err) {
    console.warn('[Firebase Client] Initialization error:', err);
  }
} else {
  console.info('[Firebase Client] Client credentials not yet set in frontend/.env. Place your Firebase Web App config in frontend/.env.');
}

export { app, auth, db };

export function isFirebaseClientConfigured(): boolean {
  return isConfigured && auth !== null;
}

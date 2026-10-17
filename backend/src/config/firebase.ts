import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}
dotenv.config(); // fallback default

let db: FirebaseFirestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;
let isConfigured = false;
let configError: string | null = null;

export function initializeFirebaseAdmin(): { configured: boolean; error: string | null } {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
    isConfigured = true;
    return { configured: true, error: null };
  }

  try {
    const candidatePaths = [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.resolve(process.cwd(), 'serviceAccountKey.json'),
      path.resolve(process.cwd(), 'backend', 'serviceAccountKey.json'),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
    ].filter(Boolean) as string[];

    const credPath = candidatePaths.find(p => fs.existsSync(p)) || path.resolve(process.cwd(), 'serviceAccountKey.json');
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (fs.existsSync(credPath)) {
      console.log(`[Firebase Admin] Initializing with service account file: ${credPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      db = admin.firestore();
      auth = admin.auth();
      isConfigured = true;
      console.log(`[Firebase Admin] Successfully connected to Firebase project: ${serviceAccount.project_id || projectId}`);
      return { configured: true, error: null };
    } else if (projectId && clientEmail && privateKey) {
      console.log(`[Firebase Admin] Initializing with environment credentials for project: ${projectId}`);
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      db = admin.firestore();
      auth = admin.auth();
      isConfigured = true;
      console.log(`[Firebase Admin] Successfully connected to Firebase project: ${projectId}`);
      return { configured: true, error: null };
    } else if (projectId) {
      // Attempt Application Default Credentials
      console.log(`[Firebase Admin] Attempting Application Default Credentials for project: ${projectId}`);
      admin.initializeApp({
        projectId,
      });
      db = admin.firestore();
      auth = admin.auth();
      isConfigured = true;
      return { configured: true, error: null };
    } else {
      configError = 'Firebase credentials not configured. Please place serviceAccountKey.json in the backend directory or configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.';
      console.warn(`[Firebase Admin Warning] ${configError}`);
      return { configured: false, error: configError };
    }
  } catch (err: any) {
    configError = `Failed to initialize Firebase Admin: ${err.message}`;
    console.error(`[Firebase Admin Error] ${configError}`);
    return { configured: false, error: configError };
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    const res = initializeFirebaseAdmin();
    if (!res.configured || !db) {
      throw new Error(res.error || 'Firestore database is not initialized. Check your Firebase Admin credentials.');
    }
  }
  return db;
}

export function getAuth(): admin.auth.Auth {
  if (!auth) {
    const res = initializeFirebaseAdmin();
    if (!res.configured || !auth) {
      throw new Error(res.error || 'Firebase Auth is not initialized. Check your Firebase Admin credentials.');
    }
  }
  return auth;
}

export function isFirebaseAdminConfigured(): boolean {
  return isConfigured;
}

export function getFirebaseConfigError(): string | null {
  return configError;
}

export { admin };

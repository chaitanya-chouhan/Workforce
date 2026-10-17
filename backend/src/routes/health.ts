import { Router, Request, Response } from 'express';
import { isFirebaseAdminConfigured, getFirebaseConfigError, getDb } from '../config/firebase';
import { gemmaService } from '../services/gemmaService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const firebaseConfigured = isFirebaseAdminConfigured();
  const firebaseError = getFirebaseConfigError();

  let firestoreWorking = false;
  let firestoreTestMessage = '';

  if (firebaseConfigured) {
    try {
      const db = getDb();
      // Test read/write in a healthCheck collection
      const testRef = db.collection('systemHealth').doc('connectivityTest');
      await testRef.set({
        lastChecked: new Date().toISOString(),
        status: 'ONLINE',
      }, { merge: true });

      const snap = await testRef.get();
      if (snap.exists) {
        firestoreWorking = true;
        firestoreTestMessage = 'Successfully verified Firestore read and write connectivity.';
      }
    } catch (err: any) {
      firestoreTestMessage = `Firestore read/write test failed: ${err.message}`;
    }
  } else {
    firestoreTestMessage = 'Firestore not tested because Firebase Admin credentials are not yet configured.';
  }

  // Check Gemma AI configuration
  const gemmaConfigured = gemmaService.isConfigured();
  const gemmaModel = gemmaService.getModelId();
  let gemmaModelVerification = null;

  if (gemmaConfigured) {
    try {
      gemmaModelVerification = await gemmaService.verifyModelSupport();
    } catch (err: any) {
      gemmaModelVerification = {
        available: false,
        configuredModel: gemmaModel,
        message: err.message,
      };
    }
  }

  const allReady = firebaseConfigured && firestoreWorking;

  res.json({
    status: allReady ? 'HEALTHY' : 'SETUP_REQUIRED',
    timestamp: new Date().toISOString(),
    firebase: {
      configured: firebaseConfigured,
      error: firebaseError,
      firestoreWorking,
      message: firestoreTestMessage,
    },
    ai: {
      configured: gemmaConfigured,
      configuredModel: gemmaModel,
      verification: gemmaModelVerification,
      note: gemmaConfigured
        ? 'Gemma 4 integration active.'
        : 'Set GOOGLE_API_KEY in backend/.env to enable real Gemma 4 diagnostics.',
    },
    setupInstructions: !allReady
      ? 'Please place serviceAccountKey.json in the backend directory and set your Google AI Studio API key in backend/.env.'
      : 'All core backend integrations verified.',
  });
});

export default router;

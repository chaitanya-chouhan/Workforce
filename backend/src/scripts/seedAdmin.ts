import dotenv from 'dotenv';
dotenv.config();

import { getAuth, getDb, isFirebaseAdminConfigured } from '../config/firebase';

async function seedAdmin() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  if (!email) {
    console.error('Usage: npm run seed:admin <user-email>');
    console.error('Example: npm run seed:admin admin@workforce.local');
    process.exit(1);
  }

  if (!isFirebaseAdminConfigured()) {
    console.error('Error: Firebase Admin is not configured. Please supply serviceAccountKey.json.');
    process.exit(1);
  }

  const auth = getAuth();
  const db = getDb();

  try {
    console.log(`Looking up Firebase user for email: ${email}...`);
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    const now = new Date().toISOString();
    const userRef = db.collection('users').doc(userRecord.uid);

    await userRef.set(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || 'Administrator',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        updatedAt: now,
      },
      { merge: true }
    );

    console.log(`✓ Successfully granted ADMIN role to ${email} (UID: ${userRecord.uid}) in Firestore.`);
    process.exit(0);
  } catch (err: any) {
    console.error('Failed to grant admin privileges:', err.message);
    process.exit(1);
  }
}

seedAdmin();

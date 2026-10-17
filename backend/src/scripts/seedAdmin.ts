import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
dotenv.config();

import { getDb, isFirebaseAdminConfigured } from '../config/firebase';
import admin from 'firebase-admin';

async function seedAdmin() {
  console.log('\n======================================================');
  console.log('   WorkForce Administrator Secure Provisioning Setup   ');
  console.log('======================================================\n');

  if (!isFirebaseAdminConfigured()) {
    console.error('Error: Firebase Admin is not configured. Please supply serviceAccountKey.json before running this script.');
    process.exit(1);
  }

  // Target Email: Command-line argument > Environment variable > User requested email
  const targetEmail = (
    process.argv[2] ||
    process.env.ADMIN_EMAIL ||
    'bean170102@gmail.com'
  ).trim().toLowerCase();

  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || '#passAdmin321';
  const db = getDb();
  const auth = admin.auth();
  const now = new Date().toISOString();

  try {
    let userRecord: admin.auth.UserRecord;
    let isNewAuthUser = false;

    // 1. Check if user already exists in Firebase Authentication
    try {
      userRecord = await auth.getUserByEmail(targetEmail);
      console.log(`[Firebase Auth] Found existing account with email: ${targetEmail} (UID: ${userRecord.uid})`);

      // Update authentication credentials with the initial temporary password
      await auth.updateUser(userRecord.uid, {
        password: initialPassword,
        emailVerified: true,
      });
      console.log(`[Firebase Auth] Credentials updated with password "#passAdmin321".`);
    } catch (notFoundErr: any) {
      if (notFoundErr.code === 'auth/user-not-found') {
        isNewAuthUser = true;
        userRecord = await auth.createUser({
          email: targetEmail,
          password: initialPassword,
          displayName: 'WorkForce Administrator',
          emailVerified: true,
        });
        console.log(`[Firebase Auth] Created new user record for: ${targetEmail} (UID: ${userRecord.uid})`);
      } else {
        throw notFoundErr;
      }
    }

    // 2. Set Firebase Custom User Claim: { role: 'ADMIN' }
    // This claim is verified cryptographically by backend roleMiddleware on every protected request.
    await auth.setCustomUserClaims(userRecord.uid, { role: 'ADMIN' });
    console.log(`[Firebase Auth] Custom User Claim successfully set: { role: "ADMIN" }`);

    // 3. Inspect existing Firestore profile document for safe role transition
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    let previousRole: string | null = null;
    let existingName = userRecord.displayName || 'WorkForce Administrator';

    if (userDocSnap.exists) {
      const existingData = userDocSnap.data() || {};
      previousRole = existingData.role || null;
      if (existingData.name) {
        existingName = existingData.name;
      }
      console.log(`[Firestore] Existing user profile found with role: "${previousRole || 'NONE'}"`);

      // SAFE WORKER ROLE MIGRATION:
      if (previousRole === 'WORKER') {
        console.log('\n[Safety Protocol: WORKER Account Detected]');
        console.log('  • Worker profile is being safely retained.');
        console.log('  • Setting worker availability to UNAVAILABLE to prevent customer match dispatching.');

        const workerDocRef = db.collection('workerProfiles').doc(userRecord.uid);
        const workerDocSnap = await workerDocRef.get();
        if (workerDocSnap.exists) {
          await workerDocRef.update({
            availabilityStatus: 'UNAVAILABLE',
            updatedAt: now,
          });
          console.log('  ✓ Worker profile availability set to UNAVAILABLE.');
        }
      } else if (previousRole === 'CUSTOMER') {
        console.log('\n[Safety Protocol: CUSTOMER Account Detected]');
        console.log('  • Prior customer service requests and complaint history are fully preserved.');
      }
    } else {
      console.log(`[Firestore] No previous Firestore profile found; creating new admin profile.`);
    }

    // 4. Update / create Firestore profile document
    await userDocRef.set(
      {
        id: userRecord.uid,
        email: targetEmail,
        name: existingName,
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        mustChangePassword: true,
        ...(previousRole && previousRole !== 'ADMIN' ? { previousRole } : {}),
        updatedAt: now,
        ...(isNewAuthUser || !userDocSnap.exists ? { createdAt: now } : {}),
      },
      { merge: true }
    );
    console.log(`[Firestore] User profile set to role: "ADMIN", accountStatus: "ACTIVE", mustChangePassword: true.`);

    // 5. Record immutable audit log
    const auditAction = isNewAuthUser
      ? 'ADMIN_CREATED'
      : previousRole && previousRole !== 'ADMIN'
      ? 'ROLE_ELEVATED_TO_ADMIN'
      : 'ADMIN_CREDENTIALS_RESET';

    await db.collection('auditLogs').add({
      action: auditAction,
      actorId: userRecord.uid,
      actorEmail: targetEmail,
      actorRole: 'ADMIN',
      targetType: 'USER',
      targetId: userRecord.uid,
      details: {
        method: 'CLI_SEED_SCRIPT',
        previousRole: previousRole || 'NONE',
        newRole: 'ADMIN',
        reason: 'Authorized administrator provisioning via seed script',
        workerAvailabilityDeactivated: previousRole === 'WORKER',
        mustChangePasswordEnforced: true,
      },
      timestamp: now,
    });
    console.log(`[Audit Log] Recorded action "${auditAction}" in Firestore auditLogs collection.`);

    console.log('\n======================================================');
    console.log('✓ SUCCESS: WorkForce Administrator Setup Complete!');
    console.log('======================================================');
    console.log(`  Target Email:     ${targetEmail}`);
    console.log(`  Initial Password: ${initialPassword}`);
    console.log(`  Assigned Role:    ADMIN (Custom Claim + Firestore)`);
    console.log(`  Account Status:   ACTIVE`);
    if (previousRole && previousRole !== 'ADMIN') {
      console.log(`  Previous Role:    ${previousRole} (safely migrated)`);
    }
    console.log('------------------------------------------------------');
    console.log('LOGIN INSTRUCTIONS:');
    console.log('  1. Navigate to: http://localhost:5173/admin/login');
    console.log(`  2. Sign in with: ${targetEmail} and ${initialPassword}`);
    console.log('  3. You will be redirected directly to http://localhost:5173/admin');
    console.log('  4. Go to "Security & Access" tab to set a permanent password.');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Failed to provision administrator account:', error);
    process.exit(1);
  }
}

seedAdmin();

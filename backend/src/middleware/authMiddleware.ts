import { Request, Response, NextFunction } from 'express';
import { getAuth, getDb, isFirebaseAdminConfigured } from '../config/firebase';
import { UserRole } from '../types';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  accountStatus: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware that extracts and verifies the Firebase ID token from the Authorization header.
 * Attaches the verified user profile to req.user.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Authorization header.',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // If Firebase Admin is not configured, inform the client honestly
  if (!isFirebaseAdminConfigured()) {
    // Check if offline dev demo token is passed during initial setup
    if (process.env.DEV_OFFLINE_MODE === 'true' && token.startsWith('demo-')) {
      const parts = token.split('-');
      const role = (parts[1] || 'CUSTOMER').toUpperCase() as UserRole;
      req.user = {
        uid: `demo-${role.toLowerCase()}-123`,
        email: `demo.${role.toLowerCase()}@workforce.local`,
        name: `Demo ${role}`,
        role: role,
        accountStatus: 'ACTIVE',
      };
      next();
      return;
    }

    res.status(503).json({
      success: false,
      error: 'Firebase Admin is not configured on the backend. Please add serviceAccountKey.json or set FIREBASE_PROJECT_ID credentials.',
    });
    return;
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Fetch user profile from Firestore users/{uid}
    const db = getDb();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // Check if registration profile is currently being created
      req.user = {
        uid,
        email: decodedToken.email || '',
        name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User'),
        role: 'CUSTOMER', // Default until profile creation completes
        accountStatus: 'PENDING',
      };
      next();
      return;
    }

    const userData = userDoc.data();
    if (userData?.accountStatus === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        error: 'Your WorkForce account is suspended. Please contact support.',
      });
      return;
    }

    req.user = {
      uid,
      email: decodedToken.email || userData?.email || '',
      name: userData?.name || decodedToken.name || 'User',
      role: (userData?.role as UserRole) || 'CUSTOMER',
      accountStatus: userData?.accountStatus || 'ACTIVE',
    };

    next();
  } catch (err: any) {
    console.error('[AuthMiddleware] Token verification failed:', err.message);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please sign in again.',
    });
  }
}

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getAuth, getDb, isFirebaseAdminConfigured } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { User, WorkerProfile, UserRole } from '../types';

const router = Router();

const registerSchema = z.object({
  uid: z.string().min(1, 'Firebase UID is required'),
  email: z.string().email(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['CUSTOMER', 'WORKER'], {
    errorMap: () => ({ message: 'Public registration allows only CUSTOMER or WORKER roles.' }),
  }),
  phone: z.string().optional(),
  locality: z.string().default('General'),
  district: z.string().default('Central'),
  state: z.string().default('Default State'),
  // Worker-specific profile fields
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  bio: z.string().optional(),
  serviceCategories: z.array(z.string()).optional(),
  serviceArea: z.string().optional(),
  hourlyRate: z.number().optional(),
  minimumVisitFee: z.number().optional(),
});

// POST /api/auth/register
// Authorizes and initializes the user profile in Firestore
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const {
      uid,
      email,
      name,
      role,
      phone,
      locality,
      district,
      state,
      skills,
      experienceYears,
      bio,
      serviceCategories,
      serviceArea,
      hourlyRate,
      minimumVisitFee,
    } = parseResult.data;

    if (!isFirebaseAdminConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Firebase Admin is not configured. Please supply serviceAccountKey.json.',
      });
      return;
    }

    const db = getDb();
    const userRef = db.collection('users').doc(uid);
    const existingDoc = await userRef.get();

    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      res.json({
        success: true,
        message: 'User profile already exists',
        user: existingData,
      });
      return;
    }

    const now = new Date().toISOString();
    const newUser: User = {
      uid,
      email,
      name,
      role: role as UserRole,
      phone: phone || '',
      accountStatus: 'ACTIVE',
      locality,
      district,
      state,
      createdAt: now,
      updatedAt: now,
    };

    // Save user profile in Firestore
    await userRef.set(newUser);

    // If worker, also create initial worker profile
    if (role === 'WORKER') {
      const workerProfileRef = db.collection('workerProfiles').doc(uid);
      const newWorkerProfile: WorkerProfile = {
        userId: uid,
        name,
        email,
        phone: phone || '',
        bio: bio || 'New service provider on WorkForce',
        experienceYears: experienceYears ?? 1,
        skills: skills && skills.length > 0 ? skills : ['general_maintenance'],
        serviceCategories: serviceCategories || [],
        indicativeRates: {
          hourlyRate: hourlyRate || 300,
          minimumVisitFee: minimumVisitFee || 200,
        },
        serviceArea: serviceArea || locality,
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'PENDING', // Admin must review
        identityDocumentSubmitted: false,
        averageRating: 5.0,
        completedJobsCount: 0,
        activeAssignmentCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await workerProfileRef.set(newWorkerProfile);
    }

    res.status(201).json({
      success: true,
      message: 'Account successfully registered and profile initialized in Firestore.',
      user: newUser,
    });
  } catch (err: any) {
    console.error('[Auth Register Error]', err);
    res.status(500).json({
      success: false,
      error: `Failed to create user profile: ${err.message}`,
    });
  }
});

// GET /api/auth/me
// Returns current authenticated user and profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User profile not found in Firestore. Please complete registration.',
      });
      return;
    }

    const userData = userDoc.data() as User;
    let workerProfile: WorkerProfile | null = null;

    if (userData.role === 'WORKER') {
      const workerDoc = await db.collection('workerProfiles').doc(req.user.uid).get();
      if (workerDoc.exists) {
        workerProfile = workerDoc.data() as WorkerProfile;
      }
    }

    res.json({
      success: true,
      user: userData,
      workerProfile,
    });
  } catch (err: any) {
    console.error('[Auth Me Error]', err);
    res.status(500).json({
      success: false,
      error: `Error retrieving profile: ${err.message}`,
    });
  }
});

export default router;

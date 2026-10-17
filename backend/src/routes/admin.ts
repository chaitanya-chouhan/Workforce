import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { WorkerProfile, RateCard, Skill, VerificationStatus } from '../types';

const router = Router();

// All admin endpoints require ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/admin/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const [usersSnap, workersSnap, requestsSnap, feedbackSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('workerProfiles').get(),
      db.collection('serviceRequests').get(),
      db.collection('feedback').get(),
    ]);

    const totalUsers = usersSnap.size;
    const totalWorkers = workersSnap.size;
    const totalRequests = requestsSnap.size;
    const totalReviews = feedbackSnap.size;

    let pendingVerifications = 0;
    let availableWorkers = 0;
    workersSnap.forEach(doc => {
      const w = doc.data() as WorkerProfile;
      if (w.verificationStatus === 'PENDING') pendingVerifications++;
      if (w.availabilityStatus === 'AVAILABLE') availableWorkers++;
    });

    let completedRequests = 0;
    let inProgressRequests = 0;
    requestsSnap.forEach(doc => {
      const r = doc.data();
      if (r.status === 'COMPLETED') completedRequests++;
      if (r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED') inProgressRequests++;
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalWorkers,
        availableWorkers,
        pendingVerifications,
        totalRequests,
        completedRequests,
        inProgressRequests,
        totalReviews,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/workers
router.get('/workers', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('workerProfiles').get();
    const workers: WorkerProfile[] = [];
    snap.forEach(doc => {
      workers.push({ userId: doc.id, ...(doc.data() as Omit<WorkerProfile, 'userId'>) });
    });
    res.json({ success: true, workers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/workers/:workerId/verify
const verifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
});

router.post('/workers/:workerId/verify', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const parse = verifySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const { status, notes } = parse.data;
    const db = getDb();
    const workerRef = db.collection('workerProfiles').doc(workerId);
    const workerDoc = await workerRef.get();

    if (!workerDoc.exists) {
      res.status(404).json({ success: false, error: 'Worker profile not found' });
      return;
    }

    const now = new Date().toISOString();
    await workerRef.update({
      verificationStatus: status,
      updatedAt: now,
    });

    // Record verification audit log
    await db.collection('workerVerifications').add({
      workerId,
      status,
      reviewedBy: req.user!.uid,
      reviewedAt: now,
      notes: notes || '',
    });

    // Notify worker
    await db.collection('notifications').add({
      recipientUid: workerId,
      type: 'ASSIGNMENT_CONFIRMED',
      title: `Worker Verification: ${status}`,
      message: `Your WorkForce provider profile verification status has been updated to ${status}. ${notes ? 'Notes: ' + notes : ''}`,
      read: false,
      createdAt: now,
    });

    res.json({ success: true, message: `Worker verification updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/rate-cards
router.get('/rate-cards', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('rateCards').get();
    const rateCards: RateCard[] = [];
    snap.forEach(doc => {
      rateCards.push({ id: doc.id, ...(doc.data() as Omit<RateCard, 'id'>) });
    });
    res.json({ success: true, rateCards });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/rate-cards
const rateCardSchema = z.object({
  skillId: z.string().min(1),
  skillName: z.string().min(1),
  locality: z.string().default('All Localities'),
  baseLabourRate: z.number().min(0),
  minimumCharge: z.number().min(0),
  travelRate: z.number().min(0),
  indicativeMaterialsAllowance: z.number().min(0),
  currency: z.string().default('INR'),
  active: z.boolean().default(true),
});

router.post('/rate-cards', async (req: Request, res: Response) => {
  try {
    const parse = rateCardSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const db = getDb();
    const docRef = db.collection('rateCards').doc();
    const now = new Date().toISOString();

    const newRateCard: RateCard = {
      id: docRef.id,
      ...parse.data,
      updatedAt: now,
    };

    await docRef.set(newRateCard);
    res.status(201).json({ success: true, rateCard: newRateCard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/skills
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('skills').get();
    const skills: Skill[] = [];
    snap.forEach(doc => {
      skills.push({ id: doc.id, ...(doc.data() as Omit<Skill, 'id'>) });
    });
    res.json({ success: true, skills });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('users').get();
    const users: any[] = [];
    snap.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/requests
router.get('/requests', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('serviceRequests').get();
    const requests: any[] = [];
    snap.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

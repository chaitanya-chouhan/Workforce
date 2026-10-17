import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  locality: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
});

// GET /api/users/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.user!.uid).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }
    res.json({ success: true, user: doc.data() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/users/me
router.patch('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parseResult.error.errors });
      return;
    }

    const updates = parseResult.data;
    const db = getDb();
    const userRef = db.collection('users').doc(req.user!.uid);

    await userRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await userRef.get();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedDoc.data(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

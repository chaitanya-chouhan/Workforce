import { Router, Request, Response } from 'express';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { Notification } from '../types';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db
      .collection('notifications')
      .where('recipientUid', '==', req.user!.uid)
      .get();

    const notifications: Notification[] = [];
    for (const doc of snap.docs) {
      notifications.push({ id: doc.id, ...(doc.data() as Omit<Notification, 'id'>) });
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    if (doc.data()?.recipientUid !== req.user!.uid) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await docRef.update({ read: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/notifications/:id – delete a single notification
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    if (doc.data()?.recipientUid !== req.user!.uid) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await docRef.delete();
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/notifications – clear all notifications for the logged‑in user
router.delete('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db
      .collection('notifications')
      .where('recipientUid', '==', req.user!.uid)
      .get();

    if (snap.empty) {
      res.json({ success: true, message: 'No notifications to clear' });
      return;
    }

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { ServiceRequest, WorkerProfile, Feedback } from '../types';

const router = Router();

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, 'Comment must be at least 3 characters'),
});

// POST /api/requests/:id/feedback
// Customer submits feedback for a completed service task
router.post('/:id/feedback', authenticateToken, requireRole('CUSTOMER'), async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;
    const parse = feedbackSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const { rating, comment } = parse.data;
    const customerUid = req.user!.uid;
    const db = getDb();

    const reqDoc = await db.collection('serviceRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const requestData = reqDoc.data() as ServiceRequest;
    if (requestData.customerId !== customerUid) {
      res.status(403).json({ success: false, error: 'You do not own this service request' });
      return;
    }

    if (requestData.status !== 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: `Feedback can only be submitted for COMPLETED tasks. Current status: ${requestData.status}.`,
      });
      return;
    }

    const workerId = requestData.assignedWorkerId;
    if (!workerId) {
      res.status(400).json({ success: false, error: 'No worker was assigned to this task.' });
      return;
    }

    // Check if feedback already submitted
    const existingFeedback = await db
      .collection('feedback')
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (!existingFeedback.empty) {
      res.status(400).json({ success: false, error: 'Feedback has already been submitted for this task.' });
      return;
    }

    const now = new Date().toISOString();
    const fbDocRef = db.collection('feedback').doc();

    const newFeedback: Feedback = {
      id: fbDocRef.id,
      requestId,
      customerId: customerUid,
      customerName: req.user!.name,
      workerId,
      rating,
      comment,
      createdAt: now,
    };

    // Calculate updated worker average rating
    const allWorkerFeedbacks = await db
      .collection('feedback')
      .where('workerId', '==', workerId)
      .get();

    let totalRating = rating;
    let count = 1;
    for (const d of allWorkerFeedbacks.docs) {
      const fb = d.data() as Feedback;
      totalRating += fb.rating;
      count += 1;
    }
    const newAverageRating = Math.round((totalRating / count) * 10) / 10;

    const batch = db.batch();
    batch.set(fbDocRef, newFeedback);

    // Update worker profile
    batch.update(db.collection('workerProfiles').doc(workerId), {
      averageRating: newAverageRating,
      updatedAt: now,
    });

    // Notify worker
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      id: notifRef.id,
      recipientUid: workerId,
      type: 'FEEDBACK_SUBMITTED',
      title: 'New Customer Feedback',
      message: `${req.user!.name} rated you ${rating} stars for "${requestData.title}".`,
      requestId,
      read: false,
      createdAt: now,
    });

    await batch.commit();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      feedback: newFeedback,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workers/:id/feedback
// Public reviews for a worker
router.get('/workers/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id: workerId } = req.params;
    const db = getDb();
    const snap = await db
      .collection('feedback')
      .where('workerId', '==', workerId)
      .get();

    const reviews: Feedback[] = [];
    for (const doc of snap.docs) {
      reviews.push({ id: doc.id, ...(doc.data() as Omit<Feedback, 'id'>) });
    }

    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

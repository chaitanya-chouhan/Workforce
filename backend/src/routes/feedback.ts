import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { ServiceRequest, WorkerProfile, Feedback, ReviewOption } from '../types';

const router = Router();

const REVIEW_MAP: Record<string, number> = {
  'very bad': 1,
  'bad': 2,
  'ok': 3,
  'good': 4,
  'very good': 5,
};

const NUMERIC_TO_REVIEW: Record<number, ReviewOption> = {
  1: 'very bad',
  2: 'bad',
  3: 'ok',
  4: 'good',
  5: 'very good',
};

const feedbackSchema = z.object({
  review: z.enum(['very bad', 'bad', 'ok', 'good', 'very good']).optional(),
  rating: z
    .union([
      z.enum(['very bad', 'bad', 'ok', 'good', 'very good']),
      z.number().min(1).max(5),
    ])
    .optional(),
  comment: z.string().optional().default(''),
});

// Handler for submitting feedback (mounted across /api/requests/:id/feedback, /api/feedback/:id, etc.)
const handleFeedbackSubmission = async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;
    const parse = feedbackSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const { review, rating, comment } = parse.data;
    const customerUid = req.user!.uid;
    const db = getDb();

    // Map to numeric rating (1-5) and review string ('very good' | 'good' | 'ok' | 'bad' | 'very bad')
    let numericRating = 4;
    let reviewQuality: ReviewOption = 'good';

    if (review) {
      reviewQuality = review;
      numericRating = REVIEW_MAP[review] || 4;
    } else if (typeof rating === 'string' && rating in REVIEW_MAP) {
      reviewQuality = rating as ReviewOption;
      numericRating = REVIEW_MAP[rating] || 4;
    } else if (typeof rating === 'number') {
      numericRating = Math.min(5, Math.max(1, Math.round(rating)));
      reviewQuality = NUMERIC_TO_REVIEW[numericRating] || 'good';
    }

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
      rating: numericRating,
      review: reviewQuality,
      comment: comment ? comment.trim() : reviewQuality,
      createdAt: now,
    };

    // Calculate updated worker average rating from all historical reviews
    const allWorkerFeedbacks = await db
      .collection('feedback')
      .where('workerId', '==', workerId)
      .get();

    let totalRating = numericRating;
    let count = 1;
    for (const d of allWorkerFeedbacks.docs) {
      const fb = d.data() as Feedback;
      if (typeof fb.rating === 'number' && !isNaN(fb.rating)) {
        totalRating += fb.rating;
        count += 1;
      }
    }
    const newAverageRating = Math.round((totalRating / count) * 10) / 10;

    const batch = db.batch();
    batch.set(fbDocRef, newFeedback);

    // Update worker profile with new average rating
    batch.set(
      db.collection('workerProfiles').doc(workerId),
      {
        averageRating: newAverageRating,
        ratingCount: count,
        updatedAt: now,
      },
      { merge: true }
    );

    // Also update users collection for the worker
    const workerUserRef = db.collection('users').doc(workerId);
    batch.set(
      workerUserRef,
      {
        averageRating: newAverageRating,
        updatedAt: now,
      },
      { merge: true }
    );

    // Notify worker of their review
    const notifRef = db.collection('notifications').doc();
    batch.set(notifRef, {
      id: notifRef.id,
      recipientUid: workerId,
      type: 'FEEDBACK_SUBMITTED',
      title: `New Review: ${reviewQuality.toUpperCase()}`,
      message: `${req.user!.name} rated your service as "${reviewQuality}" (${numericRating} stars) for "${requestData.title}".`,
      requestId,
      read: false,
      createdAt: now,
    });

    await batch.commit();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      feedback: newFeedback,
      workerNewAverageRating: newAverageRating,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mount for both POST /:id/feedback and POST /:id
router.post('/:id/feedback', authenticateToken, requireRole('CUSTOMER'), handleFeedbackSubmission);
router.post('/:id', authenticateToken, requireRole('CUSTOMER'), handleFeedbackSubmission);

// Handler for retrieving worker reviews
const handleGetWorkerReviews = async (req: Request, res: Response) => {
  try {
    const workerId = req.params.id || req.params.workerId;
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
};

router.get('/workers/:id/feedback', handleGetWorkerReviews);
router.get('/:id/feedback', handleGetWorkerReviews);
router.get('/:id', handleGetWorkerReviews);

export default router;

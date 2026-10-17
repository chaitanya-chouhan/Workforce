import { Router, Request, Response } from 'express';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { ServiceRequest, WorkerProfile } from '../types';

const router = Router();

// GET /api/tasks/assigned
// Worker views all tasks assigned to them
router.get('/assigned', authenticateToken, requireRole('WORKER'), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const workerUid = req.user!.uid;

    const snap = await db
      .collection('serviceRequests')
      .where('assignedWorkerId', '==', workerUid)
      .get();

    const tasks: any[] = [];
    for (const doc of snap.docs) {
      const data = { id: doc.id, ...doc.data() } as ServiceRequest;
      // Fetch AI analysis if present
      let aiAnalysis = null;
      if (data.aiAnalysisId) {
        const aiDoc = await db.collection('aiAnalyses').doc(data.aiAnalysisId).get();
        if (aiDoc.exists) {
          aiAnalysis = aiDoc.data();
        }
      }
      tasks.push({ ...data, aiAnalysis });
    }

    // Sort newest first
    tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/start
// Worker begins work on an assigned task
router.post('/:id/start', authenticateToken, requireRole('WORKER'), async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;
    const workerUid = req.user!.uid;
    const db = getDb();

    const docRef = db.collection('serviceRequests').doc(requestId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const data = doc.data() as ServiceRequest;
    if (data.assignedWorkerId !== workerUid) {
      res.status(403).json({ success: false, error: 'You are not the assigned worker for this task' });
      return;
    }

    if (data.status !== 'ASSIGNED') {
      res.status(400).json({
        success: false,
        error: `Cannot start a task with status ${data.status}. Must be ASSIGNED.`,
      });
      return;
    }

    const now = new Date().toISOString();
    await docRef.update({
      status: 'IN_PROGRESS',
      updatedAt: now,
    });

    // Notify customer
    await db.collection('notifications').add({
      recipientUid: data.customerId,
      type: 'TASK_STARTED',
      title: 'Work In Progress',
      message: `${req.user!.name} has started work on your service request "${data.title}".`,
      requestId,
      read: false,
      createdAt: now,
    });

    res.json({ success: true, message: 'Task marked as In Progress' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/complete
// Worker indicates they have finished the work
router.post('/:id/complete', authenticateToken, requireRole('WORKER'), async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;
    const workerUid = req.user!.uid;
    const db = getDb();

    const docRef = db.collection('serviceRequests').doc(requestId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const data = doc.data() as ServiceRequest;
    if (data.assignedWorkerId !== workerUid) {
      res.status(403).json({ success: false, error: 'You are not the assigned worker for this task' });
      return;
    }

    if (data.status !== 'IN_PROGRESS') {
      res.status(400).json({
        success: false,
        error: `Cannot complete a task with status ${data.status}. Must be IN_PROGRESS.`,
      });
      return;
    }

    const now = new Date().toISOString();
    await docRef.update({
      status: 'COMPLETION_PENDING_CONFIRMATION',
      updatedAt: now,
    });

    // Notify customer
    await db.collection('notifications').add({
      recipientUid: data.customerId,
      type: 'TASK_COMPLETED',
      title: 'Work Completed by Worker',
      message: `${req.user!.name} has finished work on "${data.title}". Please inspect and confirm completion.`,
      requestId,
      read: false,
      createdAt: now,
    });

    res.json({ success: true, message: 'Work completion submitted. Awaiting customer confirmation.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:id/confirm-completion
// Customer inspects and confirms the work is fully complete
router.post('/:id/confirm-completion', authenticateToken, requireRole('CUSTOMER'), async (req: Request, res: Response) => {
  try {
    const { id: requestId } = req.params;
    const customerUid = req.user!.uid;
    const db = getDb();

    await db.runTransaction(async transaction => {
      const docRef = db.collection('serviceRequests').doc(requestId);
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        throw new Error('Service request not found');
      }

      const data = doc.data() as ServiceRequest;
      if (data.customerId !== customerUid) {
        throw new Error('You do not own this service request');
      }

      if (data.status !== 'COMPLETION_PENDING_CONFIRMATION' && data.status !== 'IN_PROGRESS') {
        throw new Error(`Cannot confirm completion on task with status ${data.status}`);
      }

      const now = new Date().toISOString();

      // Update task status
      transaction.update(docRef, {
        status: 'COMPLETED',
        updatedAt: now,
      });

      // Update worker profile counts
      if (data.assignedWorkerId) {
        const workerRef = db.collection('workerProfiles').doc(data.assignedWorkerId);
        const workerDoc = await transaction.get(workerRef);
        if (workerDoc.exists) {
          const wProfile = workerDoc.data() as WorkerProfile;
          transaction.update(workerRef, {
            completedJobsCount: (wProfile.completedJobsCount || 0) + 1,
            activeAssignmentCount: Math.max(0, (wProfile.activeAssignmentCount || 1) - 1),
            updatedAt: now,
          });
        }

        // Notify worker
        const notifRef = db.collection('notifications').doc();
        transaction.set(notifRef, {
          id: notifRef.id,
          recipientUid: data.assignedWorkerId,
          type: 'TASK_COMPLETED',
          title: 'Job Confirmed Complete!',
          message: `Customer ${req.user!.name} confirmed completion of "${data.title}". Thank you!`,
          requestId,
          read: false,
          createdAt: now,
        });
      }
    });

    res.json({ success: true, message: 'Job completion confirmed successfully! You can now leave feedback.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

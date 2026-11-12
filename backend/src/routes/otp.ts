import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole, requireActiveAccount } from '../middleware/roleMiddleware';
import { generateAssignmentOtp, verifyOtp, OTP_EXPIRY_MINUTES } from '../services/otpService';
import { ServiceRequest, WorkerProfile, Assignment } from '../types';

const router = Router();

const generateOtpSchema = z.object({
  workerId: z.string().min(1, 'workerId is required'),
});

const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

// POST /api/requests/:id/assignment-otp
// Customer generates an assignment confirmation OTP for the selected worker
router.post(
  '/:id/assignment-otp',
  authenticateToken,
  requireRole('CUSTOMER'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const { id: requestId } = req.params;
      const parse = generateOtpSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
        return;
      }

      const { workerId } = parse.data;
      const customerUid = req.user!.uid;
      const db = getDb();

      // Check service request
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

      if (
        requestData.status !== 'OPEN_FOR_WORKERS' &&
        requestData.status !== 'AWAITING_ASSIGNMENT_CONFIRMATION'
      ) {
        res.status(400).json({
          success: false,
          error: `Cannot generate assignment OTP for a request with status ${requestData.status}.`,
        });
        return;
      }

      // Check worker availability and eligibility
      const workerDoc = await db.collection('workerProfiles').doc(workerId).get();
      if (!workerDoc.exists) {
        res.status(404).json({ success: false, error: 'Selected worker profile not found.' });
        return;
      }

      const workerData = workerDoc.data() as WorkerProfile;
      if (workerData.availabilityStatus !== 'AVAILABLE') {
        res.status(400).json({
          success: false,
          error: 'This worker is currently marked Unavailable.',
        });
        return;
      }
      if (workerData.verificationStatus !== 'VERIFIED' && workerData.verificationStatus !== 'APPROVED') {
        res.status(400).json({
          success: false,
          error: 'This worker has not yet completed administrator verification.',
        });
        return;
      }

      // Check worker user account status
      const workerUserDoc = await db.collection('users').doc(workerId).get();
      if (workerUserDoc.exists) {
        const workerUserData = workerUserDoc.data();
        if (workerUserData?.accountStatus === 'BANNED' || workerUserData?.accountStatus === 'SUSPENDED') {
          res.status(400).json({
            success: false,
            error: 'This worker account has been suspended or banned by administration.',
          });
          return;
        }
      }
      if (workerData.activeAssignmentCount >= 3) {
        res.status(400).json({
          success: false,
          error: 'This worker has reached their maximum active assignment capacity.',
        });
        return;
      }

      // Generate cryptographically secure OTP
      const { otp, otpHash, expiresAt } = generateAssignmentOtp();
      const now = new Date().toISOString();

      // Invalidate any prior assignments for this request
      const existingAssignSnap = await db
        .collection('assignments')
        .where('requestId', '==', requestId)
        .get();

      const batch = db.batch();
      for (const d of existingAssignSnap.docs) {
        batch.delete(d.ref);
      }

      // Create new assignment document with hashed OTP
      const assignRef = db.collection('assignments').doc();
      const newAssignment: Assignment = {
        id: assignRef.id,
        requestId,
        customerId: customerUid,
        workerId,
        status: 'PENDING_OTP',
        otpHash,
        otpExpiresAt: expiresAt,
        otpAttemptCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(assignRef, newAssignment);

      // Update service request status to AWAITING_ASSIGNMENT_CONFIRMATION
      batch.update(db.collection('serviceRequests').doc(requestId), {
        status: 'AWAITING_ASSIGNMENT_CONFIRMATION',
        selectedWorkerId: workerId,
        updatedAt: now,
      });

      // Add notification for the worker
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        id: notifRef.id,
        recipientUid: workerId,
        type: 'OTP_GENERATED',
        title: 'Assignment Proposed',
        message: `Customer ${req.user!.name} proposed you for "${requestData.title}". Request the 6-digit confirmation OTP from the customer to accept.`,
        requestId,
        read: false,
        createdAt: now,
      });

      await batch.commit();

      // Return the plaintext OTP ONLY to the customer
      res.status(200).json({
        success: true,
        message: `Assignment OTP generated. It expires in ${OTP_EXPIRY_MINUTES} minutes. Share this 6-digit code with the worker to confirm assignment.`,
        otp, // Plaintext OTP returned ONLY to customer
        expiresAt,
        assignmentId: assignRef.id,
      });
    } catch (err: any) {
      console.error('[Generate OTP Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/requests/:id/verify-assignment-otp
// Worker enters the customer-generated OTP to confirm the job assignment atomically
router.post(
  '/:id/verify-assignment-otp',
  authenticateToken,
  requireRole('WORKER'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const { id: requestId } = req.params;
      const parse = verifyOtpSchema.safeParse(req.body);
      if (!parse.success) {
        res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
        return;
      }

      const { otp } = parse.data;
      const workerUid = req.user!.uid;
      const db = getDb();

      // Execute atomic transaction to prevent concurrent race conditions
      const result = await db.runTransaction(async transaction => {
        // 1. Fetch Request
        const reqRef = db.collection('serviceRequests').doc(requestId);
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists) {
          throw new Error('Service request not found');
        }
        const reqData = reqDoc.data() as ServiceRequest;

        if (
          reqData.status !== 'AWAITING_ASSIGNMENT_CONFIRMATION' &&
          reqData.status !== 'OPEN_FOR_WORKERS'
        ) {
          throw new Error(`This request cannot be confirmed. Current status: ${reqData.status}`);
        }

        // 2. Fetch pending assignment
        const assignQuery = await transaction.get(
          db
            .collection('assignments')
            .where('requestId', '==', requestId)
            .where('workerId', '==', workerUid)
            .where('status', '==', 'PENDING_OTP')
            .limit(1)
        );

        if (assignQuery.empty) {
          throw new Error('No pending assignment found for you on this request.');
        }

        const assignDoc = assignQuery.docs[0];
        const assignData = assignDoc.data() as Assignment;

        // 3. Fetch worker profile (MUST read before any writes)
        const workerRef = db.collection('workerProfiles').doc(workerUid);
        const workerDoc = await transaction.get(workerRef);
        if (!workerDoc.exists) {
          throw new Error('Worker profile not found.');
        }
        const workerProfile = workerDoc.data() as WorkerProfile;
        if (workerProfile.availabilityStatus !== 'AVAILABLE') {
          throw new Error('You are currently marked Unavailable.');
        }
        if (workerProfile.verificationStatus !== 'VERIFIED' && workerProfile.verificationStatus !== 'APPROVED') {
          throw new Error('This worker has not yet completed administrator verification.');
        }

        // 4. Fetch task interests for this request (MUST read before any writes)
        const interestsSnap = await transaction.get(
          db.collection('taskInterests').where('requestId', '==', requestId)
        );

        // 5. Verify OTP cryptographic hash and attempt limits
        const otpCheck = verifyOtp(
          otp,
          assignData.otpHash || '',
          assignData.otpExpiresAt || '',
          assignData.otpAttemptCount || 0
        );

        if (!otpCheck.valid) {
          // Increment attempt count
          transaction.update(assignDoc.ref, {
            otpAttemptCount: (assignData.otpAttemptCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          });
          throw new Error(otpCheck.reason || 'Invalid OTP');
        }

        const now = new Date().toISOString();

        // 6. Update assignment atomically
        transaction.update(assignDoc.ref, {
          status: 'CONFIRMED',
          otpUsedAt: now,
          assignedAt: now,
          updatedAt: now,
          // Delete hash once used
          otpHash: null,
        });

        // 7. Update service request atomically
        transaction.update(reqRef, {
          status: 'ASSIGNED',
          assignedWorkerId: workerUid,
          updatedAt: now,
        });

        // 8. Increment worker's active assignment count
        transaction.update(workerRef, {
          activeAssignmentCount: (workerProfile.activeAssignmentCount || 0) + 1,
          updatedAt: now,
        });

        // 9. Update task interests for this request (accept this worker, reject others)
        for (const iDoc of interestsSnap.docs) {
          const iData = iDoc.data();
          if (iData.workerId === workerUid) {
            transaction.update(iDoc.ref, {
              status: 'ACCEPTED',
              updatedAt: now,
            });
          } else {
            transaction.update(iDoc.ref, {
              status: 'REJECTED',
              updatedAt: now,
            });
          }
        }

        // 10. Add customer notification
        const notifRef = db.collection('notifications').doc();
        transaction.set(notifRef, {
          id: notifRef.id,
          recipientUid: reqData.customerId,
          type: 'ASSIGNMENT_CONFIRMED',
          title: 'Assignment Confirmed!',
          message: `${req.user!.name} has successfully verified the OTP and accepted "${reqData.title}".`,
          requestId,
          read: false,
          createdAt: now,
        });

        return {
          assignmentId: assignDoc.id,
          requestId,
          workerName: req.user!.name,
        };
      });

      // Mark unread task interest notifications for this request as read
      try {
        const notifsSnap = await db
          .collection('notifications')
          .where('requestId', '==', requestId)
          .where('type', '==', 'INTEREST_EXPRESSED')
          .get();
        if (!notifsSnap.empty) {
          const batch = db.batch();
          for (const nDoc of notifsSnap.docs) {
            batch.update(nDoc.ref, { read: true, updatedAt: new Date().toISOString() });
          }
          await batch.commit();
        }
      } catch (nErr) {
        console.warn('[Verify OTP] Could not mark interest notifications as read:', nErr);
      }

      res.json({
        success: true,
        message: 'Assignment successfully confirmed with customer OTP!',
        result,
      });
    } catch (err: any) {
      console.error('[Verify OTP Error]', err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

export default router;

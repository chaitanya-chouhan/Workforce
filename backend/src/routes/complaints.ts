import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireActiveAccount } from '../middleware/roleMiddleware';
import { Complaint, ComplaintStatus, User, ServiceRequest } from '../types';
import { uploadComplaintEvidence, verifyFileSignature, removePrivateFile } from '../config/storage';

const router = Router();

const complaintCategories = [
  'Unprofessional Behavior',
  'Property Damage',
  'Payment Dispute',
  'No Show',
  'Harassment or Abuse',
  'Poor Work Quality',
  'Safety Hazard',
  'Unauthorized Charges',
  'Other',
] as const;

// POST /api/complaints
// Submit a complaint with optional evidence file
router.post(
  '/',
  authenticateToken,
  requireActiveAccount,
  uploadComplaintEvidence.single('evidence'),
  async (req: Request, res: Response) => {
    try {
      const complainantId = req.user!.uid;
      const complainantRole = req.user!.role as 'CUSTOMER' | 'WORKER';
      const complainantName = req.user!.name;

      const targetUserId = (req.body.targetUserId || '').trim();
      const category = (req.body.category || '').trim();
      const description = (req.body.description || '').trim();
      const requestId = (req.body.requestId || '').trim() || undefined;
      const assignmentId = (req.body.assignmentId || '').trim() || undefined;

      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'targetUserId is required' });
        return;
      }

      if (targetUserId === complainantId) {
        res.status(400).json({ success: false, error: 'You cannot file a complaint against yourself' });
        return;
      }

      if (!description || description.length < 10) {
        if (req.file) removePrivateFile(req.file.path);
        res.status(400).json({ success: false, error: 'Complaint description must be at least 10 characters' });
        return;
      }

      // Verify file signature if evidence was uploaded
      if (req.file && !verifyFileSignature(req.file.path, req.file.mimetype)) {
        removePrivateFile(req.file.path);
        res.status(400).json({
          success: false,
          error: 'Uploaded evidence file content does not match its expected format. Please attach a valid JPEG, PNG, WebP image or PDF document.',
        });
        return;
      }

      const db = getDb();

      // Verify target user exists
      const targetUserDoc = await db.collection('users').doc(targetUserId).get();
      if (!targetUserDoc.exists) {
        res.status(404).json({ success: false, error: 'Reported user does not exist' });
        return;
      }

      const targetUserData = targetUserDoc.data() as User;
      const targetUserRole = targetUserData.role as 'CUSTOMER' | 'WORKER';

      // Validate roles: customer reports worker, or worker reports customer
      if (complainantRole === 'CUSTOMER' && targetUserRole !== 'WORKER') {
        res.status(400).json({ success: false, error: 'Customers can only submit complaints against service providers' });
        return;
      }
      if (complainantRole === 'WORKER' && targetUserRole !== 'CUSTOMER') {
        res.status(400).json({ success: false, error: 'Workers can only submit complaints against customers' });
        return;
      }

      let requestTitle: string | undefined;

      // Validate relationship to service request if specified
      if (requestId) {
        const reqDoc = await db.collection('serviceRequests').doc(requestId).get();
        if (!reqDoc.exists) {
          res.status(404).json({ success: false, error: 'Related service request not found' });
          return;
        }
        const reqData = reqDoc.data() as ServiceRequest;
        requestTitle = reqData.title;

        // Complainant must be associated with this request
        if (complainantRole === 'CUSTOMER' && reqData.customerId !== complainantId) {
          res.status(403).json({ success: false, error: 'You are not the customer for this service request' });
          return;
        }
        if (complainantRole === 'WORKER') {
          const isAssigned = reqData.assignedWorkerId === complainantId || reqData.selectedWorkerId === complainantId;
          if (!isAssigned) {
            // Check if expressed interest
            const intSnap = await db
              .collection('taskInterests')
              .where('requestId', '==', requestId)
              .where('workerId', '==', complainantId)
              .get();
            if (intSnap.empty) {
              res.status(403).json({ success: false, error: 'You are not involved with this service request' });
              return;
            }
          }
        }
      }

      const now = new Date().toISOString();
      const complaintRef = db.collection('complaints').doc();

      const newComplaint: Complaint = {
        id: complaintRef.id,
        complainantId,
        complainantRole,
        complainantName,
        targetUserId,
        targetUserRole,
        targetUserName: targetUserData.name,
        ...(requestId ? { requestId, requestTitle } : {}),
        ...(assignmentId ? { assignmentId } : {}),
        category: category || 'Other',
        description,
        ...(req.file
          ? {
              evidenceFileName: req.file.originalname,
              evidenceMimeType: req.file.mimetype,
              evidenceStoragePath: req.file.path,
              evidenceSize: req.file.size,
            }
          : {}),
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      };

      await complaintRef.set(newComplaint);

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully and forwarded to administration for review.',
        complaint: newComplaint,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/complaints/my
// Returns all complaints filed by the authenticated user
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db
      .collection('complaints')
      .where('complainantId', '==', req.user!.uid)
      .get();

    const complaints: Complaint[] = [];
    for (const doc of snap.docs) {
      complaints.push(doc.data() as Complaint);
    }

    complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, complaints });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/complaints/:id/evidence
// Securely streams the private evidence document (accessible only to complainant or ADMIN)
router.get('/:id/evidence', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const doc = await db.collection('complaints').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    const complaint = doc.data() as Complaint;

    // Check authorization: must be complainant or ADMIN
    if (complaint.complainantId !== req.user!.uid && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Unauthorized to view this complaint evidence' });
      return;
    }

    if (!complaint.evidenceStoragePath || !fs.existsSync(complaint.evidenceStoragePath)) {
      res.status(404).json({ success: false, error: 'Evidence file not found in storage' });
      return;
    }

    const safeFileName = (complaint.evidenceFileName || 'evidence').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', complaint.evidenceMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
    res.sendFile(complaint.evidenceStoragePath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

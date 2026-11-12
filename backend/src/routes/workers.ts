import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole, requireActiveAccount } from '../middleware/roleMiddleware';
import { WorkerProfile, ServiceRequest, TaskInterest, WorkerDocument } from '../types';
import { findMatchingWorkers } from '../services/matchingService';
import { uploadIdentityDocument, removePrivateFile, verifyFileSignature } from '../config/storage';

const router = Router();

const updateWorkerProfileSchema = z.object({
  bio: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  skills: z.array(z.string()).optional(),
  serviceArea: z.string().optional(),
  serviceRadiusKm: z.number().min(1).optional(),
  indicativeRates: z
    .object({
      hourlyRate: z.number().min(50).optional(),
      minimumVisitFee: z.number().min(50).optional(),
    })
    .optional(),
});

const availabilitySchema = z.object({
  availabilityStatus: z.enum(['AVAILABLE', 'UNAVAILABLE']),
});

// GET /api/workers/me
router.get('/me', authenticateToken, requireRole('WORKER'), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection('workerProfiles').doc(req.user!.uid).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Worker profile not found.' });
      return;
    }
    res.json({ success: true, profile: doc.data() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/workers/me
router.patch('/me', authenticateToken, requireRole('WORKER'), async (req: Request, res: Response) => {
  try {
    const parse = updateWorkerProfileSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const db = getDb();
    const workerRef = db.collection('workerProfiles').doc(req.user!.uid);

    await workerRef.update({
      ...parse.data,
      updatedAt: new Date().toISOString(),
    });

    const updated = await workerRef.get();
    res.json({ success: true, message: 'Worker profile updated', profile: updated.data() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workers/me/identity-document
// Uploads government/Aadhaar identity document to private, access-controlled storage
router.post(
  '/me/identity-document',
  authenticateToken,
  requireRole('WORKER'),
  requireActiveAccount,
  uploadIdentityDocument.single('document'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No identity document file was uploaded. Please attach a valid JPEG, PNG, WebP, or PDF file.',
        });
        return;
      }

      // Verify file signature magic bytes to prevent spoofing
      if (!verifyFileSignature(req.file.path, req.file.mimetype)) {
        removePrivateFile(req.file.path);
        res.status(400).json({
          success: false,
          error: 'Uploaded file contents do not match the expected file signature. Please upload a genuine JPEG, PNG, WebP image or PDF document.',
        });
        return;
      }

      const db = getDb();
      const workerId = req.user!.uid;
      const maskedAadhaar = (req.body.maskedAadhaar || '').trim();

      // Check for previous document to delete file from private storage
      const prevDocSnap = await db.collection('workerDocuments').where('workerId', '==', workerId).get();
      for (const d of prevDocSnap.docs) {
        const docData = d.data() as WorkerDocument;
        if (docData.storagePath) {
          removePrivateFile(docData.storagePath);
        }
        await d.ref.delete();
      }

      const now = new Date().toISOString();
      const docRef = db.collection('workerDocuments').doc();

      const newDoc: WorkerDocument = {
        id: docRef.id,
        workerId,
        documentType: 'AADHAAR',
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        storagePath: req.file.path,
        ...(maskedAadhaar ? { maskedNumber: maskedAadhaar } : {}),
        uploadedAt: now,
        verificationStatus: 'PENDING',
      };

      await docRef.set(newDoc);

      // Update worker profile
      const workerRef = db.collection('workerProfiles').doc(workerId);
      await workerRef.set({
        identityDocumentId: docRef.id,
        identityDocumentSubmitted: true,
        ...(maskedAadhaar ? { maskedAadhaar } : {}),
        verificationStatus: 'PENDING',
        updatedAt: now,
      }, { merge: true });

      res.status(201).json({
        success: true,
        message: 'Identity document uploaded securely for administrator verification.',
        documentId: docRef.id,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/workers/me/document
// Securely streams the worker's own uploaded identity document
router.get(
  '/me/document',
  authenticateToken,
  requireRole('WORKER'),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const workerId = req.user!.uid;

      let docData: WorkerDocument | null = null;
      const workerProfileSnap = await db.collection('workerProfiles').doc(workerId).get();
      if (workerProfileSnap.exists) {
        const wp = workerProfileSnap.data() as WorkerProfile;
        if (wp.identityDocumentId) {
          const directDoc = await db.collection('workerDocuments').doc(wp.identityDocumentId).get();
          if (directDoc.exists) {
            docData = directDoc.data() as WorkerDocument;
          }
        }
      }

      if (!docData) {
        const snap = await db.collection('workerDocuments').where('workerId', '==', workerId).get();
        if (snap.empty) {
          res.status(404).json({ success: false, error: 'No identity document on file.' });
          return;
        }
        const sorted = snap.docs
          .map(d => d.data() as WorkerDocument)
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        docData = sorted[0];
      }

      if (!fs.existsSync(docData.storagePath)) {
        res.status(404).json({ success: false, error: 'Document file not found in storage.' });
        return;
      }

      const safeFileName = (docData.originalFileName || 'identity_document').replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Type', docData.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
      res.sendFile(docData.storagePath);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// PATCH & POST /api/workers/me/availability
const handleAvailabilityToggle = async (req: Request, res: Response) => {
  try {
    const parse = availabilitySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Invalid availability status. Must be AVAILABLE or UNAVAILABLE.' });
      return;
    }

    const db = getDb();
    const workerRef = db.collection('workerProfiles').doc(req.user!.uid);

    await workerRef.set({
      availabilityStatus: parse.data.availabilityStatus,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    res.json({
      success: true,
      message: `Availability updated to ${parse.data.availabilityStatus}`,
      availabilityStatus: parse.data.availabilityStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.patch('/me/availability', authenticateToken, requireRole('WORKER'), requireActiveAccount, handleAvailabilityToggle);
router.post('/me/availability', authenticateToken, requireRole('WORKER'), requireActiveAccount, handleAvailabilityToggle);
router.patch('/availability', authenticateToken, requireRole('WORKER'), requireActiveAccount, handleAvailabilityToggle);
router.post('/availability', authenticateToken, requireRole('WORKER'), requireActiveAccount, handleAvailabilityToggle);

// GET /api/workers/matches?requestId=...
router.get('/matches', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestId = req.query.requestId as string;
    if (!requestId) {
      res.status(400).json({ success: false, error: 'Query parameter requestId is required' });
      return;
    }

    const db = getDb();
    const reqDoc = await db.collection('serviceRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const request = { id: reqDoc.id, ...(reqDoc.data() as Omit<ServiceRequest, 'id'>) };

    // Get recommended skills from AI analysis if available
    let requiredSkills: string[] = [];
    if (request.aiAnalysisId) {
      const aiDoc = await db.collection('aiAnalyses').doc(request.aiAnalysisId).get();
      if (aiDoc.exists) {
        requiredSkills = aiDoc.data()?.recommendedSkills || [];
      }
    }
    if (requiredSkills.length === 0 && request.category) {
      requiredSkills = [request.category];
    }
    if (requiredSkills.length === 0) {
      requiredSkills = ['general_maintenance'];
    }

    const matches = await findMatchingWorkers(request, requiredSkills);
    res.json({ success: true, matches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workers/open-tasks
// Returns service requests that are open for workers to view and express interest
router.get('/open-tasks', authenticateToken, requireRole('WORKER'), async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db
      .collection('serviceRequests')
      .where('status', 'in', ['OPEN_FOR_WORKERS', 'AWAITING_ASSIGNMENT_CONFIRMATION'])
      .get();

    const tasks: any[] = [];
    for (const doc of snapshot.docs) {
      const taskData = { id: doc.id, ...doc.data() } as ServiceRequest;

      // Fetch AI analysis summary and cost estimate if exists
      let aiSummary = null;
      if (taskData.aiAnalysisId) {
        const aiDoc = await db.collection('aiAnalyses').doc(taskData.aiAnalysisId).get();
        if (aiDoc.exists) {
          aiSummary = aiDoc.data();
        }
      }

      // Check if current worker has already expressed interest
      const interestSnap = await db
        .collection('taskInterests')
        .where('requestId', '==', doc.id)
        .where('workerId', '==', req.user!.uid)
        .limit(1)
        .get();

      tasks.push({
        ...taskData,
        aiAnalysis: aiSummary,
        hasExpressedInterest: !interestSnap.empty,
      });
    }

    // Sort newest first
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workers/tasks/:requestId/interest
// Worker expresses interest in an open service request
router.post('/tasks/:requestId/interest', authenticateToken, requireRole('WORKER'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;
    const workerUid = req.user!.uid;

    const db = getDb();

    // Check worker profile and verification status
    const workerProfileDoc = await db.collection('workerProfiles').doc(workerUid).get();
    const workerProfile = workerProfileDoc.data() as WorkerProfile | undefined;

    if (workerProfile?.verificationStatus !== 'VERIFIED' && workerProfile?.verificationStatus !== 'APPROVED') {
      res.status(403).json({
        success: false,
        error: 'This worker has not yet completed administrator verification. You cannot accept or express interest in tasks until approved.',
      });
      return;
    }

    const reqDoc = await db.collection('serviceRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const requestData = reqDoc.data() as ServiceRequest;
    if (requestData.status !== 'OPEN_FOR_WORKERS' && requestData.status !== 'AWAITING_ASSIGNMENT_CONFIRMATION') {
      res.status(400).json({ success: false, error: `Cannot express interest in task with status ${requestData.status}` });
      return;
    }

    // Check duplicate interest
    const existingInterest = await db
      .collection('taskInterests')
      .where('requestId', '==', requestId)
      .where('workerId', '==', workerUid)
      .limit(1)
      .get();

    if (!existingInterest.empty) {
      res.status(400).json({ success: false, error: 'You have already expressed interest in this task.' });
      return;
    }

    const now = new Date().toISOString();
    const interestDocRef = db.collection('taskInterests').doc();
    const newInterest: TaskInterest = {
      id: interestDocRef.id,
      requestId,
      workerId: workerUid,
      workerName: req.user!.name,
      workerRating: workerProfile?.averageRating || 5.0,
      workerSkills: workerProfile?.skills || [],
      status: 'PENDING',
      message: message || 'I am available and interested in this service task.',
      createdAt: now,
      updatedAt: now,
    };

    await interestDocRef.set(newInterest);

    // Notify customer
    await db.collection('notifications').add({
      recipientUid: requestData.customerId,
      type: 'INTEREST_EXPRESSED',
      title: 'Worker Expressed Interest',
      message: `${req.user!.name} has expressed interest in your request "${requestData.title}".`,
      requestId,
      read: false,
      createdAt: now,
    });

    res.status(201).json({
      success: true,
      message: 'Interest recorded successfully',
      interest: newInterest,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

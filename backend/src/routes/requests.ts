import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole, requireActiveAccount } from '../middleware/roleMiddleware';
import { ServiceRequest, AIAnalysis, CostEstimate } from '../types';
import { gemmaService } from '../services/gemmaService';
import { getRateCardForSkill, calculateEstimate } from '../services/costEstimationService';
import { pricingService } from '../services/pricingService';

const router = Router();

// Multer memory storage configuration (no persistent disk/cloud storage needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are supported.'));
    }
  },
});

const createRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().optional(),
  locality: z.string().min(2, 'Locality is required'),
  district: z.string().default('Central'),
  state: z.string().default('Default State'),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).default('medium'),
  preferredTime: z.string().optional(),
});

// POST /api/requests
// Create a new service request
router.post('/', authenticateToken, requireRole('CUSTOMER'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const parse = createRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const db = getDb();
    const docRef = db.collection('serviceRequests').doc();
    const now = new Date().toISOString();

    const newRequest: ServiceRequest = {
      id: docRef.id,
      customerId: req.user!.uid,
      ...(req.user!.name ? { customerName: req.user!.name } : {}),
      title: parse.data.title,
      description: parse.data.description,
      category: parse.data.category || 'General',
      locality: parse.data.locality,
      district: parse.data.district,
      state: parse.data.state,
      urgency: parse.data.urgency,
      ...(parse.data.preferredTime && parse.data.preferredTime.trim().length > 0
        ? { preferredTime: parse.data.preferredTime.trim() }
        : {}),
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(newRequest);

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      request: newRequest,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/requests
// List customer's requests (or all if admin)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    let query: FirebaseFirestore.Query = db.collection('serviceRequests');

    if (req.user!.role === 'CUSTOMER') {
      query = query.where('customerId', '==', req.user!.uid);
    }

    const snapshot = await query.get();
    const requests: ServiceRequest[] = [];

    for (const doc of snapshot.docs) {
      requests.push({ id: doc.id, ...(doc.data() as Omit<ServiceRequest, 'id'>) });
    }

    // Sort descending by createdAt
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/requests/:id
// Get single request details including AI analysis, cost estimate, and interested workers
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const doc = await db.collection('serviceRequests').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const requestData = { id: doc.id, ...(doc.data() as Omit<ServiceRequest, 'id'>) };

    // Authorization check: Customer can only view their own requests
    if (
      req.user!.role === 'CUSTOMER' &&
      requestData.customerId !== req.user!.uid
    ) {
      res.status(403).json({ success: false, error: 'Access denied to this request' });
      return;
    }

    // Fetch AI Analysis if present
    let aiAnalysis: AIAnalysis | null = null;
    if (requestData.aiAnalysisId) {
      const aiDoc = await db.collection('aiAnalyses').doc(requestData.aiAnalysisId).get();
      if (aiDoc.exists) {
        aiAnalysis = { id: aiDoc.id, ...(aiDoc.data() as Omit<AIAnalysis, 'id'>) };
      }
    }

    // Fetch Task Interests with full worker profile details
    const interestsSnap = await db
      .collection('taskInterests')
      .where('requestId', '==', id)
      .get();

    const interestedWorkers: any[] = [];
    for (const iDoc of interestsSnap.docs) {
      const iData = iDoc.data();
      let workerName = iData.workerName;
      let averageRating = 5.0;
      let skills: string[] = [];
      let completedJobsCount = 0;
      let serviceArea = '';

      if (iData.workerId) {
        const wpDoc = await db.collection('workerProfiles').doc(iData.workerId).get();
        if (wpDoc.exists) {
          const wpData = wpDoc.data();
          if (wpData?.name) workerName = wpData.name;
          if (typeof wpData?.averageRating === 'number') averageRating = wpData.averageRating;
          if (Array.isArray(wpData?.skills)) skills = wpData.skills;
          if (typeof wpData?.completedJobsCount === 'number') completedJobsCount = wpData.completedJobsCount;
          if (wpData?.serviceArea) serviceArea = wpData.serviceArea;
        }
        if (!workerName || workerName === iData.workerId) {
          const uDoc = await db.collection('users').doc(iData.workerId).get();
          if (uDoc.exists && uDoc.data()?.name) {
            workerName = uDoc.data()!.name;
          }
        }
      }

      interestedWorkers.push({
        id: iDoc.id,
        ...iData,
        workerName: workerName || 'Local Technician',
        workerRating: averageRating,
        workerSkills: skills,
        workerCompletedJobsCount: completedJobsCount,
        workerServiceArea: serviceArea,
      });
    }

    // Fetch Active Assignment if any
    const assignmentSnap = await db
      .collection('assignments')
      .where('requestId', '==', id)
      .limit(1)
      .get();

    let assignment = null;
    if (!assignmentSnap.empty) {
      const aDoc = assignmentSnap.docs[0];
      const aData = aDoc.data();
      let workerName = aData.workerName;
      if (!workerName || workerName === aData.workerId) {
        const uDoc = await db.collection('users').doc(aData.workerId).get();
        if (uDoc.exists && uDoc.data()?.name) {
          workerName = uDoc.data()!.name;
        }
      }
      // Omit otpHash for safety
      const { otpHash, ...safeAssignment } = aData;
      assignment = {
        id: aDoc.id,
        ...safeAssignment,
        workerName: workerName || 'Assigned Worker',
      };
    }

    res.json({
      success: true,
      request: requestData,
      aiAnalysis,
      interestedWorkers,
      assignment,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/requests/:id/analyze
// Runs Gemma 4 analysis on the request with optional uploaded image
router.post(
  '/:id/analyze',
  authenticateToken,
  requireRole('CUSTOMER'),
  requireActiveAccount,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const docRef = db.collection('serviceRequests').doc(id);
      const reqDoc = await docRef.get();

      if (!reqDoc.exists) {
        res.status(404).json({ success: false, error: 'Service request not found' });
        return;
      }

      const requestData = reqDoc.data() as ServiceRequest;
      if (requestData.customerId !== req.user!.uid) {
        res.status(403).json({ success: false, error: 'Unauthorized to analyze this request' });
        return;
      }

      // Update state to ANALYZING
      await docRef.update({
        status: 'ANALYZING',
        updatedAt: new Date().toISOString(),
      });

      let aiResult;
      try {
        aiResult = await gemmaService.analyzeProblem({
          description: requestData.description,
          category: requestData.category,
          locality: requestData.locality,
          imageBuffer: req.file?.buffer,
          imageMimeType: req.file?.mimetype,
        });
      } catch (aiErr: any) {
        // Rollback status to SUBMITTED if AI failed
        await docRef.update({
          status: 'SUBMITTED',
          updatedAt: new Date().toISOString(),
        });
        res.status(502).json({
          success: false,
          error: `Gemma 4 Analysis failed: ${aiErr.message}`,
        });
        return;
      }

      // Calculate realistic itemized cost using modular pricing service
      const primarySkill = aiResult.recommendedSkills[0] || 'general_maintenance';
      let costEstimate: CostEstimate | undefined;

      try {
        costEstimate = await pricingService.calculateRealisticEstimate({
          skillId: primarySkill,
          locality: requestData.locality,
          district: requestData.district,
          severity: aiResult.severity,
          description: requestData.description,
          possibleCauses: aiResult.possibleCauses,
          recommendedRepair: aiResult.recommendedRepair,
        });
      } catch (priceErr) {
        console.warn('[PricingService] Fallback to base rate card calculation:', priceErr);
        const rateCard = await getRateCardForSkill(primarySkill, requestData.locality);
        if (rateCard) {
          costEstimate = calculateEstimate(rateCard, aiResult.severity);
        }
      }

      const now = new Date().toISOString();
      const aiDocRef = db.collection('aiAnalyses').doc();

      const aiRecord: AIAnalysis = {
        id: aiDocRef.id,
        requestId: id,
        customerId: req.user!.uid,
        modelId: gemmaService.getModelId(),
        problemSummary: aiResult.problemSummary,
        issueSummary: aiResult.issueSummary || aiResult.problemSummary,
        observations: aiResult.observations,
        possibleCauses: aiResult.possibleCauses,
        confidence: aiResult.confidence || 'medium',
        imageAssessment: aiResult.imageAssessment,
        recommendedRepair: aiResult.recommendedRepair,
        recommendedSkills: aiResult.recommendedSkills,
        severity: aiResult.severity,
        uncertainty: aiResult.uncertainty,
        assumptions: aiResult.assumptions || [],
        diyEligibility: aiResult.diyEligibility,
        basicChecks: aiResult.basicChecks,
        safetyWarnings: aiResult.safetyWarnings,
        requiresProfessional: aiResult.requiresProfessional,
        professionalInspectionRequired: aiResult.professionalInspectionRequired ?? true,
        inspectionQuestions: aiResult.inspectionQuestions || [],
        factorsAffectingPrice: costEstimate?.factorsAffectingPrice || aiResult.factorsAffectingPrice || [],
        ...(aiResult.estimatedCostCategory ? { estimatedCostCategory: aiResult.estimatedCostCategory } : {}),
        ...(costEstimate ? { costEstimate } : {}),
        createdAt: now,
      };

      await aiDocRef.set(aiRecord);

      // Update request to OPEN_FOR_WORKERS
      await docRef.update({
        status: 'OPEN_FOR_WORKERS',
        aiAnalysisId: aiDocRef.id,
        urgency: aiResult.severity === 'emergency' ? 'emergency' : aiResult.severity === 'high' ? 'high' : requestData.urgency,
        updatedAt: now,
      });

      res.json({
        success: true,
        message: 'Diagnostic analysis completed successfully',
        analysis: aiRecord,
      });
    } catch (err: any) {
      console.error('[Analyze Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/requests/:id/cancel
router.post('/:id/cancel', authenticateToken, requireRole('CUSTOMER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const docRef = db.collection('serviceRequests').doc(id);
    const reqDoc = await docRef.get();

    if (!reqDoc.exists) {
      res.status(404).json({ success: false, error: 'Service request not found' });
      return;
    }

    const requestData = reqDoc.data() as ServiceRequest;
    if (requestData.customerId !== req.user!.uid && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Unauthorized to cancel this request' });
      return;
    }

    if (requestData.status === 'COMPLETED' || requestData.status === 'IN_PROGRESS') {
      res.status(400).json({
        success: false,
        error: `Cannot cancel request that is already ${requestData.status}.`,
      });
      return;
    }

    await docRef.update({
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Service request cancelled successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/requests/:id/interests/:workerId/decline
// Customer explicitly declines/cancels an interest expressed by a worker
router.post(
  '/:id/interests/:workerId/decline',
  authenticateToken,
  requireRole('CUSTOMER'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const { id: requestId, workerId } = req.params;
      const db = getDb();

      const reqDoc = await db.collection('serviceRequests').doc(requestId).get();
      if (!reqDoc.exists) {
        res.status(404).json({ success: false, error: 'Service request not found' });
        return;
      }

      const requestData = reqDoc.data() as ServiceRequest;
      if (requestData.customerId !== req.user!.uid && req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'You do not own this service request' });
        return;
      }

      const interestQuery = await db
        .collection('taskInterests')
        .where('requestId', '==', requestId)
        .where('workerId', '==', workerId)
        .get();

      if (interestQuery.empty) {
        res.status(404).json({ success: false, error: 'No interest record found for this worker' });
        return;
      }

      const now = new Date().toISOString();
      const batch = db.batch();

      for (const doc of interestQuery.docs) {
        batch.update(doc.ref, {
          status: 'REJECTED',
          updatedAt: now,
        });
      }

      // Notify the worker politely
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        id: notifRef.id,
        recipientUid: workerId,
        type: 'INTEREST_EXPRESSED',
        title: 'Task Interest Update',
        message: `The customer has chosen another technician or declined interest for "${requestData.title}".`,
        requestId,
        read: false,
        createdAt: now,
      });

      await batch.commit();

      res.json({ success: true, message: 'Worker interest declined.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/requests/:id/cancel-assignment
// Allows customer to cancel a pending OTP assignment and choose a different worker
router.post(
  '/:id/cancel-assignment',
  authenticateToken,
  requireRole('CUSTOMER'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const { id: requestId } = req.params;
      const db = getDb();

      const reqDoc = await db.collection('serviceRequests').doc(requestId).get();
      if (!reqDoc.exists) {
        res.status(404).json({ success: false, error: 'Service request not found' });
        return;
      }

      const requestData = reqDoc.data() as ServiceRequest;
      if (requestData.customerId !== req.user!.uid && req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, error: 'You do not own this service request' });
        return;
      }

      if (requestData.status === 'COMPLETED' || requestData.status === 'IN_PROGRESS') {
        res.status(400).json({
          success: false,
          error: `Cannot cancel assignment when task is already ${requestData.status}.`,
        });
        return;
      }

      const assignSnap = await db
        .collection('assignments')
        .where('requestId', '==', requestId)
        .where('status', 'in', ['PENDING_OTP', 'CONFIRMED'])
        .get();

      const now = new Date().toISOString();
      const batch = db.batch();

      for (const aDoc of assignSnap.docs) {
        batch.update(aDoc.ref, {
          status: 'CANCELLED',
          updatedAt: now,
        });
      }

      // Reset request status to OPEN_FOR_WORKERS so customer can select another worker
      batch.update(reqDoc.ref, {
        status: 'OPEN_FOR_WORKERS',
        assignedWorkerId: null,
        assignedWorkerName: null,
        updatedAt: now,
      });

      await batch.commit();

      res.json({ success: true, message: 'Assignment cancelled. You can now select another worker.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDb } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { ServiceRequest, AIAnalysis, CostEstimate } from '../types';
import { gemmaService } from '../services/gemmaService';
import { getRateCardForSkill, calculateEstimate } from '../services/costEstimationService';

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
router.post('/', authenticateToken, requireRole('CUSTOMER'), async (req: Request, res: Response) => {
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
      customerName: req.user!.name,
      title: parse.data.title,
      description: parse.data.description,
      category: parse.data.category || 'General',
      locality: parse.data.locality,
      district: parse.data.district,
      state: parse.data.state,
      urgency: parse.data.urgency,
      preferredTime: parse.data.preferredTime,
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

    // Fetch Task Interests
    const interestsSnap = await db
      .collection('taskInterests')
      .where('requestId', '==', id)
      .get();

    const interestedWorkers: any[] = [];
    for (const iDoc of interestsSnap.docs) {
      interestedWorkers.push({ id: iDoc.id, ...iDoc.data() });
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
      // Omit otpHash for safety
      const { otpHash, ...safeAssignment } = aData;
      assignment = { id: aDoc.id, ...safeAssignment };
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

      // Calculate approximate cost using configured rate cards
      const primarySkill = aiResult.recommendedSkills[0] || 'general_maintenance';
      const rateCard = await getRateCardForSkill(primarySkill, requestData.locality);
      let costEstimate: CostEstimate | undefined;

      if (rateCard) {
        costEstimate = calculateEstimate(rateCard, aiResult.severity);
      }

      const now = new Date().toISOString();
      const aiDocRef = db.collection('aiAnalyses').doc();

      const aiRecord: AIAnalysis = {
        id: aiDocRef.id,
        requestId: id,
        customerId: req.user!.uid,
        modelId: gemmaService.getModelId(),
        problemSummary: aiResult.problemSummary,
        observations: aiResult.observations,
        possibleCauses: aiResult.possibleCauses,
        recommendedSkills: aiResult.recommendedSkills,
        severity: aiResult.severity,
        uncertainty: aiResult.uncertainty,
        diyEligibility: aiResult.diyEligibility,
        basicChecks: aiResult.basicChecks,
        safetyWarnings: aiResult.safetyWarnings,
        requiresProfessional: aiResult.requiresProfessional,
        inspectionQuestions: aiResult.inspectionQuestions,
        estimatedCostCategory: aiResult.estimatedCostCategory,
        costEstimate,
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
        message: 'Gemma 4 diagnostic analysis completed successfully',
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

export default router;

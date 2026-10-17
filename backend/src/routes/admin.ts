import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { getDb, getAuth, isFirebaseAdminConfigured } from '../config/firebase';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import {
  WorkerProfile,
  RateCard,
  Skill,
  User,
  Complaint,
  AuditLog,
  WorkerDocument,
  Assignment,
  ServiceRequest,
} from '../types';

const router = Router();

// All admin endpoints strictly require an authenticated session and verified ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

// Helper to record audit events in Firestore
async function recordAuditLog(log: Omit<AuditLog, 'id'>) {
  try {
    const db = getDb();
    const docRef = db.collection('auditLogs').doc();
    await docRef.set({ id: docRef.id, ...log });
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log:', err);
  }
}

// GET /api/admin/stats
// Returns real counts derived from database records
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    const [usersSnap, workersSnap, requestsSnap, feedbackSnap, complaintsSnap, auditSnap] =
      await Promise.all([
        db.collection('users').get(),
        db.collection('workerProfiles').get(),
        db.collection('serviceRequests').get(),
        db.collection('feedback').get(),
        db.collection('complaints').get(),
        db.collection('auditLogs').orderBy('timestamp', 'desc').limit(5).get(),
      ]);

    const totalUsers = usersSnap.size;
    const totalWorkers = workersSnap.size;
    const totalRequests = requestsSnap.size;
    const totalReviews = feedbackSnap.size;

    let pendingVerifications = 0;
    let approvedWorkers = 0;
    let rejectedWorkers = 0;
    let resubmissionWorkers = 0;
    let availableWorkers = 0;

    workersSnap.forEach(doc => {
      const w = doc.data() as WorkerProfile;
      if (w.verificationStatus === 'PENDING') pendingVerifications++;
      else if (w.verificationStatus === 'VERIFIED' || w.verificationStatus === 'APPROVED') approvedWorkers++;
      else if (w.verificationStatus === 'REJECTED') rejectedWorkers++;
      else if (w.verificationStatus === 'RESUBMISSION_REQUIRED') resubmissionWorkers++;

      if (w.availabilityStatus === 'AVAILABLE') availableWorkers++;
    });

    let bannedAccounts = 0;
    usersSnap.forEach(doc => {
      const u = doc.data() as User;
      if (u.accountStatus === 'BANNED' || u.accountStatus === 'SUSPENDED') {
        bannedAccounts++;
      }
    });

    let openComplaintsWorkers = 0;
    let openComplaintsCustomers = 0;
    complaintsSnap.forEach(doc => {
      const c = doc.data() as Complaint;
      if (c.status === 'OPEN' || c.status === 'UNDER_REVIEW') {
        if (c.targetUserRole === 'WORKER') openComplaintsWorkers++;
        else openComplaintsCustomers++;
      }
    });

    let completedRequests = 0;
    let inProgressRequests = 0;
    requestsSnap.forEach(doc => {
      const r = doc.data();
      if (r.status === 'COMPLETED') completedRequests++;
      if (r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED') inProgressRequests++;
    });

    const recentAuditActions: AuditLog[] = [];
    auditSnap.forEach(doc => {
      recentAuditActions.push(doc.data() as AuditLog);
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalWorkers,
        availableWorkers,
        pendingVerifications,
        approvedWorkers,
        rejectedWorkers,
        resubmissionWorkers,
        bannedAccounts,
        openComplaintsWorkers,
        openComplaintsCustomers,
        totalRequests,
        completedRequests,
        inProgressRequests,
        totalReviews,
      },
      recentAuditActions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/workers
// Returns worker profiles merged with their user account status and document submission status
router.get('/workers', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { status, search } = req.query;

    const [workersSnap, usersSnap, docsSnap] = await Promise.all([
      db.collection('workerProfiles').get(),
      db.collection('users').where('role', '==', 'WORKER').get(),
      db.collection('workerDocuments').get(),
    ]);

    const usersMap = new Map<string, User>();
    usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as User));

    const docsMap = new Map<string, WorkerDocument>();
    docsSnap.forEach(doc => {
      const d = doc.data() as WorkerDocument;
      docsMap.set(d.workerId, d);
    });

    let workers: (WorkerProfile & { accountStatus?: string; hasDocument?: boolean; maskedNumber?: string })[] = [];

    workersSnap.forEach(doc => {
      const w = doc.data() as WorkerProfile;
      const u = usersMap.get(doc.id);
      const d = docsMap.get(doc.id);

      workers.push({
        ...w,
        userId: doc.id,
        accountStatus: u?.accountStatus || 'ACTIVE',
        hasDocument: Boolean(d || w.identityDocumentSubmitted),
        maskedNumber: d?.maskedNumber || w.maskedAadhaar || undefined,
      });
    });

    if (status && status !== 'ALL') {
      workers = workers.filter(w => w.verificationStatus === status || (status === 'VERIFIED' && w.verificationStatus === 'APPROVED'));
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      workers = workers.filter(
        w =>
          (w.name || '').toLowerCase().includes(q) ||
          (w.email || '').toLowerCase().includes(q) ||
          (w.serviceArea || '').toLowerCase().includes(q) ||
          w.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, workers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/workers/:workerId/document
// Securely streams the worker's identity document to authorized administrators
router.get('/workers/:workerId/document', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const db = getDb();

    const snap = await db.collection('workerDocuments').where('workerId', '==', workerId).limit(1).get();
    if (snap.empty) {
      res.status(404).json({ success: false, error: 'Identity document not found for this worker.' });
      return;
    }

    const docData = snap.docs[0].data() as WorkerDocument;
    if (!docData.storagePath || !fs.existsSync(docData.storagePath)) {
      res.status(404).json({ success: false, error: 'Identity document file is missing from private storage.' });
      return;
    }

    res.setHeader('Content-Type', docData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${docData.originalFileName || 'document'}"`);
    res.sendFile(docData.storagePath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/workers/:workerId/verify
// Approves, rejects, or requests resubmission for a worker's identity and profile
const verifyWorkerSchema = z.object({
  status: z.enum(['VERIFIED', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED']),
  notes: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

router.post('/workers/:workerId/verify', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const parse = verifyWorkerSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const { status, notes, expectedUpdatedAt } = parse.data;

    if ((status === 'REJECTED' || status === 'RESUBMISSION_REQUIRED') && (!notes || notes.trim().length < 3)) {
      res.status(400).json({
        success: false,
        error: `A descriptive reason is required when rejecting or requesting document resubmission.`,
      });
      return;
    }

    const canonicalStatus = status === 'APPROVED' ? 'VERIFIED' : status;
    const db = getDb();
    const workerRef = db.collection('workerProfiles').doc(workerId);
    const workerDoc = await workerRef.get();

    if (!workerDoc.exists) {
      res.status(404).json({ success: false, error: 'Worker profile not found' });
      return;
    }

    const workerData = workerDoc.data() as WorkerProfile;

    // Concurrency control: prevent overwriting another administrator's concurrent decision
    if (expectedUpdatedAt && workerData.updatedAt && workerData.updatedAt !== expectedUpdatedAt) {
      res.status(409).json({
        success: false,
        error: 'This worker profile was modified by another administrator. Please refresh before proceeding.',
      });
      return;
    }

    const now = new Date().toISOString();

    await workerRef.update({
      verificationStatus: canonicalStatus,
      verificationNotes: notes || '',
      verifiedAt: now,
      verifiedBy: req.user!.uid,
      updatedAt: now,
    });

    // Update worker document record if exists
    const docSnap = await db.collection('workerDocuments').where('workerId', '==', workerId).get();
    for (const d of docSnap.docs) {
      await d.ref.update({
        verificationStatus: canonicalStatus,
        verificationNotes: notes || '',
        updatedAt: now,
      });
    }

    // Record audit event
    const actionName =
      canonicalStatus === 'VERIFIED'
        ? 'WORKER_APPROVED'
        : canonicalStatus === 'REJECTED'
        ? 'WORKER_REJECTED'
        : 'WORKER_RESUBMISSION_REQUESTED';

    await recordAuditLog({
      adminId: req.user!.uid,
      adminEmail: req.user!.email,
      action: actionName,
      targetType: 'WORKER',
      targetId: workerId,
      targetName: workerData.name,
      reason: notes || 'Approved by administrator',
      timestamp: now,
    });

    // Send notification to worker
    await db.collection('notifications').add({
      recipientUid: workerId,
      type: 'VERIFICATION_STATUS',
      title: `Verification Update: ${canonicalStatus.replace(/_/g, ' ')}`,
      message:
        canonicalStatus === 'VERIFIED'
          ? 'Congratulations! Your WorkForce provider profile and identity document have been verified. You can now accept assignments.'
          : canonicalStatus === 'RESUBMISSION_REQUIRED'
          ? `Action Required: Please resubmit your identity document. Reason: ${notes}`
          : `Your provider profile verification was not approved. Reason: ${notes}`,
      read: false,
      createdAt: now,
    });

    res.json({
      success: true,
      message: `Worker verification status updated to ${canonicalStatus}.`,
      status: canonicalStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users
// Account directory with search and role/status filtering
router.get('/users', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { role, status, search } = req.query;

    const snap = await db.collection('users').get();
    let users: User[] = [];

    snap.forEach(doc => {
      users.push(doc.data() as User);
    });

    if (role && role !== 'ALL') {
      users = users.filter(u => u.role === role);
    }

    if (status && status !== 'ALL') {
      users = users.filter(u => u.accountStatus === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      users = users.filter(
        u =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.locality || '').toLowerCase().includes(q) ||
          (u.district || '').toLowerCase().includes(q)
      );
    }

    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:userId/ban
// Bans a customer or worker account and safely cancels active assignments
const banSchema = z.object({
  reason: z.string().min(5, 'A ban reason of at least 5 characters is required'),
});

router.post('/users/:userId/ban', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const parse = banSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    if (userId === req.user!.uid) {
      res.status(400).json({ success: false, error: 'Administrators cannot ban their own account' });
      return;
    }

    const db = getDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    const userData = userDoc.data() as User;
    if (userData.role === 'ADMIN') {
      res.status(400).json({ success: false, error: 'Administrator accounts cannot be banned via this endpoint' });
      return;
    }

    const now = new Date().toISOString();
    const reason = parse.data.reason.trim();

    // 1. Update user account status
    await userRef.update({
      accountStatus: 'BANNED',
      banReason: reason,
      bannedAt: now,
      bannedBy: req.user!.uid,
      updatedAt: now,
    });

    // 2. If worker, mark unavailable
    if (userData.role === 'WORKER') {
      const workerRef = db.collection('workerProfiles').doc(userId);
      const wDoc = await workerRef.get();
      if (wDoc.exists) {
        await workerRef.update({
          availabilityStatus: 'UNAVAILABLE',
          updatedAt: now,
        });
      }
    }

    // 3. Safe Assignment Policy: Cancel active/pending assignments
    const activeAssignmentsSnap = await db
      .collection('assignments')
      .where(userData.role === 'WORKER' ? 'workerId' : 'customerId', '==', userId)
      .where('status', 'in', ['PENDING_OTP', 'CONFIRMED', 'IN_PROGRESS'])
      .get();

    for (const aDoc of activeAssignmentsSnap.docs) {
      const assign = aDoc.data() as Assignment;
      await aDoc.ref.update({
        status: 'CANCELLED',
        cancellationReason: `Counterparty account was suspended by platform administration: ${reason}`,
        updatedAt: now,
      });

      // Update related service request
      if (assign.requestId) {
        const reqRef = db.collection('serviceRequests').doc(assign.requestId);
        const rDoc = await reqRef.get();
        if (rDoc.exists) {
          if (userData.role === 'WORKER') {
            // Reopen request for other workers
            await reqRef.update({
              status: 'OPEN_FOR_WORKERS',
              assignedWorkerId: null,
              selectedWorkerId: null,
              updatedAt: now,
            });
            // Notify customer
            await db.collection('notifications').add({
              recipientUid: assign.customerId,
              type: 'ASSIGNMENT_CANCELLED',
              title: 'Worker Assignment Cancelled',
              message: `Your assigned worker has been suspended by administration. Your service request has been safely reopened so you can select another provider.`,
              requestId: assign.requestId,
              read: false,
              createdAt: now,
            });
          } else {
            // Customer banned: cancel the request
            await reqRef.update({
              status: 'CANCELLED',
              updatedAt: now,
            });
            // Notify worker
            await db.collection('notifications').add({
              recipientUid: assign.workerId,
              type: 'ASSIGNMENT_CANCELLED',
              title: 'Job Order Cancelled',
              message: `Service request #${assign.requestId.slice(0, 8)} was cancelled because the customer account was suspended.`,
              requestId: assign.requestId,
              read: false,
              createdAt: now,
            });
          }
        }
      }
    }

    // Record audit log
    await recordAuditLog({
      adminId: req.user!.uid,
      adminEmail: req.user!.email,
      action: 'USER_BANNED',
      targetType: userData.role === 'WORKER' ? 'WORKER' : 'CUSTOMER',
      targetId: userId,
      targetName: userData.name,
      reason,
      timestamp: now,
    });

    res.json({
      success: true,
      message: `Account for ${userData.name} (${userData.role}) has been BANNED. Active assignments were cancelled safely.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:userId/unban
// Unbans a customer or worker account
const unbanSchema = z.object({
  reason: z.string().min(3, 'An unban reason is required'),
});

router.post('/users/:userId/unban', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const parse = unbanSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const db = getDb();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    const userData = userDoc.data() as User;
    const now = new Date().toISOString();
    const reason = parse.data.reason.trim();

    await userRef.update({
      accountStatus: 'ACTIVE',
      banReason: null,
      unbannedAt: now,
      unbannedBy: req.user!.uid,
      updatedAt: now,
    });

    // Record audit log
    await recordAuditLog({
      adminId: req.user!.uid,
      adminEmail: req.user!.email,
      action: 'USER_UNBANNED',
      targetType: userData.role === 'WORKER' ? 'WORKER' : 'CUSTOMER',
      targetId: userId,
      targetName: userData.name,
      reason,
      timestamp: now,
    });

    res.json({
      success: true,
      message: `Account for ${userData.name} has been restored to ACTIVE status.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/complaints
// List complaints with filtering
router.get('/complaints', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { targetRole, status, category, search } = req.query;

    const snap = await db.collection('complaints').get();
    let complaints: Complaint[] = [];

    snap.forEach(doc => {
      complaints.push(doc.data() as Complaint);
    });

    if (targetRole && targetRole !== 'ALL') {
      complaints = complaints.filter(c => c.targetUserRole === targetRole);
    }

    if (status && status !== 'ALL') {
      complaints = complaints.filter(c => c.status === status);
    }

    if (category && category !== 'ALL') {
      complaints = complaints.filter(c => c.category === category);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      complaints = complaints.filter(
        c =>
          c.id.toLowerCase().includes(q) ||
          (c.complainantName || '').toLowerCase().includes(q) ||
          (c.targetUserName || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );
    }

    complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, complaints });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/complaints/:id
// Get single complaint with target user's complaint history
router.get('/complaints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const doc = await db.collection('complaints').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    const complaint = doc.data() as Complaint;

    // Fetch previous complaints against the same target user
    const historySnap = await db
      .collection('complaints')
      .where('targetUserId', '==', complaint.targetUserId)
      .get();

    const relatedComplaints: Complaint[] = [];
    historySnap.forEach(d => {
      if (d.id !== id) {
        relatedComplaints.push(d.data() as Complaint);
      }
    });

    res.json({ success: true, complaint, relatedComplaints });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/complaints/:id/status
// Updates complaint review status with notes
const updateComplaintSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  adminNotes: z.string().optional(),
  resolutionReason: z.string().optional(),
});

router.patch('/complaints/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parse = updateComplaintSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const { status, adminNotes, resolutionReason } = parse.data;
    const db = getDb();
    const complaintRef = db.collection('complaints').doc(id);
    const doc = await complaintRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    const now = new Date().toISOString();
    const updateData: any = {
      status,
      updatedAt: now,
      ...(adminNotes ? { adminNotes } : {}),
      ...(resolutionReason ? { resolutionReason } : {}),
      reviewedBy: req.user!.uid,
      reviewedAt: now,
    };

    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.resolvedAt = now;
    }

    await complaintRef.update(updateData);

    // Record audit log
    await recordAuditLog({
      adminId: req.user!.uid,
      adminEmail: req.user!.email,
      action: 'COMPLAINT_STATUS_UPDATED',
      targetType: 'COMPLAINT',
      targetId: id,
      reason: resolutionReason || adminNotes || `Status updated to ${status}`,
      timestamp: now,
    });

    res.json({ success: true, message: `Complaint status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/audit-logs
// Returns administrative audit logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('auditLogs').orderBy('timestamp', 'desc').limit(100).get();
    const auditLogs: AuditLog[] = [];

    snap.forEach(doc => {
      auditLogs.push(doc.data() as AuditLog);
    });

    res.json({ success: true, auditLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/password/change
// Administrator password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.post('/password/change', async (req: Request, res: Response) => {
  try {
    const parse = passwordChangeSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const { newPassword } = parse.data;

    if (newPassword === '#passAdmin321') {
      res.status(400).json({
        success: false,
        error: 'New password cannot be the default bootstrap password.',
      });
      return;
    }

    if (isFirebaseAdminConfigured()) {
      const auth = getAuth();
      await auth.updateUser(req.user!.uid, {
        password: newPassword,
      });
    }

    const db = getDb();
    const now = new Date().toISOString();
    await db.collection('users').doc(req.user!.uid).update({
      mustChangePassword: false,
      updatedAt: now,
    });

    await recordAuditLog({
      adminId: req.user!.uid,
      adminEmail: req.user!.email,
      action: 'ADMIN_PASSWORD_CHANGED',
      targetType: 'ADMIN',
      targetId: req.user!.uid,
      reason: 'Administrator updated account password',
      timestamp: now,
    });

    res.json({ success: true, message: 'Administrator password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/rate-cards
router.get('/rate-cards', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('rateCards').get();
    const rateCards: RateCard[] = [];
    snap.forEach(doc => {
      rateCards.push({ id: doc.id, ...(doc.data() as Omit<RateCard, 'id'>) });
    });
    res.json({ success: true, rateCards });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/rate-cards
const rateCardSchema = z.object({
  skillId: z.string().min(1),
  skillName: z.string().min(1),
  locality: z.string().default('All Localities'),
  baseLabourRate: z.number().min(0),
  minimumCharge: z.number().min(0),
  travelRate: z.number().min(0),
  indicativeMaterialsAllowance: z.number().min(0),
  currency: z.string().default('INR'),
  active: z.boolean().default(true),
});

router.post('/rate-cards', async (req: Request, res: Response) => {
  try {
    const parse = rateCardSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parse.error.errors });
      return;
    }

    const db = getDb();
    const docRef = db.collection('rateCards').doc();
    const now = new Date().toISOString();

    const newRateCard: RateCard = {
      id: docRef.id,
      ...parse.data,
      updatedAt: now,
    };

    await docRef.set(newRateCard);
    res.status(201).json({ success: true, rateCard: newRateCard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/skills
router.get('/skills', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('skills').get();
    const skills: Skill[] = [];
    snap.forEach(doc => {
      skills.push({ id: doc.id, ...(doc.data() as Omit<Skill, 'id'>) });
    });
    res.json({ success: true, skills });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/requests
router.get('/requests', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection('serviceRequests').get();
    const requests: any[] = [];
    snap.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

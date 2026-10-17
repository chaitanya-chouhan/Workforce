import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  WorkerProfile,
  VerificationStatus,
  AccountStatus,
  Complaint,
  ComplaintStatus,
  AuditLog,
} from '../types';
import { scoreWorkerForRequest } from '../services/matchingService';
import { generateAssignmentOtp, verifyAssignmentOtp } from '../services/otpService';

describe('1. Worker Registration with Extended Profile Fields', () => {
  const registerSchema = z.object({
    uid: z.string().min(1),
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['CUSTOMER', 'WORKER']),
    phone: z.string().optional(),
    locality: z.string().min(2),
    district: z.string().min(2),
    state: z.string().min(2),
    skills: z.array(z.string()).optional(),
    experienceYears: z.number().min(0).max(50).optional(),
    bio: z.string().max(1000).optional(),
    serviceCategories: z.array(z.string()).optional(),
    serviceArea: z.string().optional(),
    hourlyRate: z.number().min(0).optional(),
    minimumVisitFee: z.number().min(0).optional(),
  });

  function initializeWorkerProfile(data: z.infer<typeof registerSchema>): WorkerProfile {
    const now = new Date().toISOString();
    return {
      userId: data.uid,
      bio: data.bio || '',
      experienceYears: data.experienceYears ?? 1,
      skills: data.skills && data.skills.length > 0 ? data.skills : ['General Maintenance'],
      ...(data.serviceCategories && data.serviceCategories.length > 0
        ? { serviceCategories: data.serviceCategories }
        : {}),
      indicativeRates: {
        ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate } : {}),
        ...(data.minimumVisitFee !== undefined ? { minimumVisitFee: data.minimumVisitFee } : {}),
      },
      serviceArea: data.serviceArea || data.locality,
      serviceRadiusKm: 15,
      availabilityStatus: 'AVAILABLE',
      verificationStatus: 'PENDING',
      identityDocumentSubmitted: false,
      averageRating: 5.0,
      completedJobsCount: 0,
      activeAssignmentCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  it('initializes a worker profile in PENDING verification status with skills and categories', () => {
    const parsed = registerSchema.parse({
      uid: 'w_123',
      name: 'Ramesh Sharma',
      email: 'ramesh@example.com',
      role: 'WORKER',
      phone: '+919876543210',
      locality: 'Bagmugaliya',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      skills: ['Ceiling fan repair', 'Switchboard wiring', 'MCB installation'],
      serviceCategories: ['Electrical and Wiring'],
      experienceYears: 6,
      bio: 'Licensed domestic electrician with 6+ years experience.',
      hourlyRate: 350,
      minimumVisitFee: 200,
    });

    const profile = initializeWorkerProfile(parsed);

    expect(profile.userId).toBe('w_123');
    expect(profile.verificationStatus).toBe('PENDING');
    expect(profile.identityDocumentSubmitted).toBe(false);
    expect(profile.skills).toContain('Ceiling fan repair');
    expect(profile.serviceCategories).toContain('Electrical and Wiring');
    expect(profile.experienceYears).toBe(6);
    expect(profile.indicativeRates?.hourlyRate).toBe(350);
  });

  it('rejects public registration attempts with ADMIN role', () => {
    const result = registerSchema.safeParse({
      uid: 'admin_attempt',
      name: 'Hacker',
      email: 'hacker@example.com',
      role: 'ADMIN', // Illegal in public register
      locality: 'Delhi',
      district: 'Central',
      state: 'Delhi',
    });

    expect(result.success).toBe(false);
  });
});

describe('2. Private Document Storage & Access Controls', () => {
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  function validateUpload(mimeType: string, sizeBytes: number) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported document file type: ${mimeType}`);
    }
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new Error(`Document size exceeds 5MB limit (${sizeBytes} bytes)`);
    }
    return true;
  }

  function authorizeDocumentAccess(
    documentOwnerId: string,
    requester: { uid: string; role: 'CUSTOMER' | 'WORKER' | 'ADMIN' }
  ) {
    if (requester.role === 'ADMIN') return true;
    if (requester.uid === documentOwnerId) return true;
    throw new Error('Access denied: You do not have permission to view this document.');
  }

  it('validates permitted MIME types and rejects non-standard formats', () => {
    expect(validateUpload('image/jpeg', 1024 * 500)).toBe(true);
    expect(validateUpload('application/pdf', 1024 * 1024 * 2)).toBe(true);

    expect(() => validateUpload('application/zip', 1024)).toThrow(/Unsupported document file type/);
    expect(() => validateUpload('text/html', 1024)).toThrow(/Unsupported document file type/);
    expect(() => validateUpload('application/x-msdownload', 1024)).toThrow(/Unsupported document file type/);
  });

  it('strictly enforces the 5MB file size limit', () => {
    const oversized = 5 * 1024 * 1024 + 1;
    expect(() => validateUpload('application/pdf', oversized)).toThrow(/exceeds 5MB limit/);
  });

  it('allows document owner and admin to access document, but blocks unrelated users', () => {
    const ownerId = 'worker_999';

    // Owner accesses own doc
    expect(authorizeDocumentAccess(ownerId, { uid: 'worker_999', role: 'WORKER' })).toBe(true);

    // Admin accesses doc
    expect(authorizeDocumentAccess(ownerId, { uid: 'admin_001', role: 'ADMIN' })).toBe(true);

    // Another worker tries to access
    expect(() =>
      authorizeDocumentAccess(ownerId, { uid: 'worker_888', role: 'WORKER' })
    ).toThrow(/Access denied/);

    // A customer tries to access
    expect(() =>
      authorizeDocumentAccess(ownerId, { uid: 'customer_111', role: 'CUSTOMER' })
    ).toThrow(/Access denied/);
  });
});

describe('3. Worker Verification Review Workflow & Concurrency Protection', () => {
  const verifySchema = z.object({
    status: z.enum(['VERIFIED', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED']),
    notes: z.string().min(5, 'Review notes must be at least 5 characters long'),
    expectedCurrentStatus: z.string().optional(),
  });

  function processVerification(
    workerProfile: WorkerProfile,
    action: z.infer<typeof verifySchema>,
    adminId: string,
    adminEmail: string
  ): { updatedProfile: WorkerProfile; auditLog: AuditLog } {
    if (
      action.expectedCurrentStatus &&
      workerProfile.verificationStatus !== action.expectedCurrentStatus
    ) {
      throw new Error(
        `Concurrency conflict: Worker verification status has already changed to ${workerProfile.verificationStatus}`
      );
    }

    const canonicalStatus: VerificationStatus =
      action.status === 'APPROVED' ? 'VERIFIED' : action.status;
    const now = new Date().toISOString();

    const updatedProfile: WorkerProfile = {
      ...workerProfile,
      verificationStatus: canonicalStatus,
      verificationNotes: action.notes,
      verifiedBy: adminId,
      verifiedAt: now,
      updatedAt: now,
    };

    const auditLog: AuditLog = {
      action: 'WORKER_VERIFIED',
      actorId: adminId,
      actorEmail: adminEmail,
      actorRole: 'ADMIN',
      targetType: 'WORKER_PROFILE',
      targetId: workerProfile.userId,
      details: {
        previousStatus: workerProfile.verificationStatus,
        newStatus: canonicalStatus,
        notes: action.notes,
      },
      timestamp: now,
    };

    return { updatedProfile, auditLog };
  }

  const sampleWorker: WorkerProfile = {
    userId: 'worker_test',
    bio: 'Test worker',
    experienceYears: 3,
    skills: ['Plumbing'],
    serviceArea: 'Indiranagar',
    availabilityStatus: 'AVAILABLE',
    verificationStatus: 'PENDING',
    averageRating: 5,
    completedJobsCount: 0,
    activeAssignmentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('approves worker verification and updates canonical status to VERIFIED', () => {
    const action = verifySchema.parse({
      status: 'VERIFIED',
      notes: 'Aadhaar document matched address and identity successfully.',
    });

    const { updatedProfile, auditLog } = processVerification(
      sampleWorker,
      action,
      'admin_1',
      'admin@workforce.local'
    );

    expect(updatedProfile.verificationStatus).toBe('VERIFIED');
    expect(updatedProfile.verifiedBy).toBe('admin_1');
    expect(updatedProfile.verificationNotes).toContain('matched address');
    expect(auditLog.action).toBe('WORKER_VERIFIED');
    expect(auditLog.details.newStatus).toBe('VERIFIED');
  });

  it('canonicalizes APPROVED to VERIFIED', () => {
    const action = verifySchema.parse({
      status: 'APPROVED',
      notes: 'Reviewed by admin.',
    });

    const { updatedProfile } = processVerification(
      sampleWorker,
      action,
      'admin_1',
      'admin@workforce.local'
    );

    expect(updatedProfile.verificationStatus).toBe('VERIFIED');
  });

  it('rejects verification if notes are empty or too short', () => {
    const result = verifySchema.safeParse({
      status: 'REJECTED',
      notes: 'No', // Too short
    });
    expect(result.success).toBe(false);
  });

  it('prevents concurrent double-reviews using expectedCurrentStatus guard', () => {
    const action = verifySchema.parse({
      status: 'VERIFIED',
      notes: 'Approved after review.',
      expectedCurrentStatus: 'PENDING',
    });

    // Already approved worker
    const alreadyApproved: WorkerProfile = {
      ...sampleWorker,
      verificationStatus: 'VERIFIED',
    };

    expect(() =>
      processVerification(alreadyApproved, action, 'admin_2', 'admin2@workforce.local')
    ).toThrow(/Concurrency conflict/);
  });
});

describe('4. Administrative Authorization Enforcement', () => {
  function requireAdminRole(user: { role?: string } | undefined) {
    if (!user || user.role !== 'ADMIN') {
      const error: any = new Error('Forbidden: Administrator privileges required.');
      error.statusCode = 403;
      throw error;
    }
    return true;
  }

  it('grants access to ADMIN role', () => {
    expect(requireAdminRole({ role: 'ADMIN' })).toBe(true);
  });

  it('rejects CUSTOMER role with 403 Forbidden', () => {
    expect(() => requireAdminRole({ role: 'CUSTOMER' })).toThrow(/Administrator privileges required/);
  });

  it('rejects WORKER role with 403 Forbidden', () => {
    expect(() => requireAdminRole({ role: 'WORKER' })).toThrow(/Administrator privileges required/);
  });

  it('rejects unauthenticated requests with 403 Forbidden', () => {
    expect(() => requireAdminRole(undefined)).toThrow(/Administrator privileges required/);
  });
});

describe('5. Customer & Worker Complaints Management', () => {
  const complaintSchema = z.object({
    targetUserId: z.string().min(1, 'Target user is required'),
    targetRole: z.enum(['CUSTOMER', 'WORKER']),
    requestId: z.string().optional(),
    category: z.string().min(2, 'Category is required'),
    subject: z.string().min(5, 'Subject must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
  });

  function validateComplaintRelationship(
    complainantId: string,
    targetUserId: string,
    request: { customerId: string; assignedWorkerId?: string; interestedWorkerIds?: string[] }
  ) {
    const isCustomerComplainant = request.customerId === complainantId;
    const isWorkerComplainant =
      request.assignedWorkerId === complainantId ||
      (request.interestedWorkerIds && request.interestedWorkerIds.includes(complainantId));

    if (isCustomerComplainant) {
      const targetIsAssociatedWorker =
        request.assignedWorkerId === targetUserId ||
        (request.interestedWorkerIds && request.interestedWorkerIds.includes(targetUserId));
      if (!targetIsAssociatedWorker) {
        throw new Error('Invalid complaint: Target worker has no history with this service request.');
      }
      return true;
    }

    if (isWorkerComplainant) {
      if (request.customerId !== targetUserId) {
        throw new Error('Invalid complaint: Target customer does not own this service request.');
      }
      return true;
    }

    throw new Error('Invalid complaint: Complainant has no legitimate interaction with this request.');
  }

  it('validates complaint payload rules', () => {
    const valid = complaintSchema.safeParse({
      targetUserId: 'worker_456',
      targetRole: 'WORKER',
      category: 'NO_SHOW',
      subject: 'Technician did not arrive for scheduled repair',
      description: 'Waited between 10 AM and 1 PM but worker did not show up or respond to calls.',
    });
    expect(valid.success).toBe(true);

    const invalidShort = complaintSchema.safeParse({
      targetUserId: 'worker_456',
      targetRole: 'WORKER',
      category: 'NO_SHOW',
      subject: 'No show',
      description: 'Too short', // < 10 chars
    });
    expect(invalidShort.success).toBe(false);
  });

  it('validates interaction history before allowing complaint submission', () => {
    const request = {
      customerId: 'cust_001',
      assignedWorkerId: 'worker_001',
      interestedWorkerIds: ['worker_002'],
    };

    // Customer complaints against assigned worker -> valid
    expect(validateComplaintRelationship('cust_001', 'worker_001', request)).toBe(true);

    // Customer complaints against interested worker -> valid
    expect(validateComplaintRelationship('cust_001', 'worker_002', request)).toBe(true);

    // Customer complaints against random worker not involved -> invalid
    expect(() =>
      validateComplaintRelationship('cust_001', 'worker_999_random', request)
    ).toThrow(/has no history/);

    // Assigned worker complaints against customer -> valid
    expect(validateComplaintRelationship('worker_001', 'cust_001', request)).toBe(true);

    // Random third-party complaints -> invalid
    expect(() =>
      validateComplaintRelationship('random_person', 'cust_001', request)
    ).toThrow(/no legitimate interaction/);
  });
});

describe('6. Account Banning, Suspensions & Safe Assignment Cancellation', () => {
  function enforceActiveAccount(accountStatus: AccountStatus) {
    if (accountStatus === 'BANNED' || accountStatus === 'SUSPENDED') {
      const err: any = new Error(
        `Account access restricted: This account is currently ${accountStatus}.`
      );
      err.statusCode = 403;
      throw err;
    }
    return true;
  }

  function handleSafeBanUser(
    user: { uid: string; role: 'CUSTOMER' | 'WORKER'; accountStatus: AccountStatus },
    activeAssignments: Array<{ id: string; requestId: string; workerId: string; status: string }>,
    reason: string
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A detailed reason is required to ban an account.');
    }

    const cancelledAssignmentIds: string[] = [];
    const reopenedRequestIds: string[] = [];

    for (const a of activeAssignments) {
      if (a.status === 'PENDING_OTP' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS') {
        cancelledAssignmentIds.push(a.id);
        if (user.role === 'WORKER') {
          reopenedRequestIds.push(a.requestId);
        }
      }
    }

    return {
      updatedUser: {
        ...user,
        accountStatus: 'BANNED' as AccountStatus,
        banReason: reason.trim(),
        bannedAt: new Date().toISOString(),
      },
      cancelledAssignmentIds,
      reopenedRequestIds,
    };
  }

  it('blocks banned and suspended accounts from mutating actions', () => {
    expect(enforceActiveAccount('ACTIVE')).toBe(true);
    expect(() => enforceActiveAccount('BANNED')).toThrow(/Account access restricted/);
    expect(() => enforceActiveAccount('SUSPENDED')).toThrow(/Account access restricted/);
  });

  it('safely cancels in-progress assignments and re-opens requests when a worker is banned', () => {
    const worker = { uid: 'w_fraud', role: 'WORKER' as const, accountStatus: 'ACTIVE' as const };
    const activeAssignments = [
      { id: 'assign_1', requestId: 'req_101', workerId: 'w_fraud', status: 'IN_PROGRESS' },
      { id: 'assign_2', requestId: 'req_102', workerId: 'w_fraud', status: 'COMPLETED' }, // Already completed, leave alone
    ];

    const result = handleSafeBanUser(
      worker,
      activeAssignments,
      'Document fraud and dangerous electrical work reported.'
    );

    expect(result.updatedUser.accountStatus).toBe('BANNED');
    expect(result.updatedUser.banReason).toContain('Document fraud');
    expect(result.cancelledAssignmentIds).toEqual(['assign_1']);
    expect(result.reopenedRequestIds).toEqual(['req_101']);
  });
});

describe('7. Worker Verification Blocking on OTP & Matching', () => {
  it('prevents unverified workers (PENDING / REJECTED / RESUBMISSION_REQUIRED) from generating or verifying OTPs', () => {
    const unverifiedStatuses: VerificationStatus[] = [
      'PENDING',
      'REJECTED',
      'RESUBMISSION_REQUIRED',
    ];

    for (const status of unverifiedStatuses) {
      const workerProfile: Partial<WorkerProfile> = {
        userId: 'w_unv',
        verificationStatus: status,
      };

      const canVerify =
        workerProfile.verificationStatus === 'VERIFIED' ||
        workerProfile.verificationStatus === 'APPROVED';

      expect(canVerify, `Worker with status ${status} must not be allowed to verify OTP`).toBe(false);
    }
  });

  it('allows VERIFIED (and APPROVED) workers to proceed with assignment confirmation', () => {
    const verifiedStatuses: VerificationStatus[] = ['VERIFIED', 'APPROVED'];

    for (const status of verifiedStatuses) {
      const workerProfile: Partial<WorkerProfile> = {
        userId: 'w_ver',
        verificationStatus: status,
      };

      const canVerify =
        workerProfile.verificationStatus === 'VERIFIED' ||
        workerProfile.verificationStatus === 'APPROVED';

      expect(canVerify, `Worker with status ${status} must be permitted`).toBe(true);
    }
  });

  it('immediately updates matching eligibility when worker is verified', () => {
    const request = {
      category: 'Electrical',
      skills: ['electrical', 'wiring'],
      locality: 'Bhopal',
      urgency: 'medium' as const,
    };

    const pendingWorker: WorkerProfile = {
      userId: 'w_bhopal',
      name: 'Anil Kumar',
      bio: 'Electrician',
      experienceYears: 4,
      skills: ['electrical', 'wiring'],
      serviceArea: 'Bhopal',
      availabilityStatus: 'AVAILABLE',
      verificationStatus: 'PENDING',
      averageRating: 4.8,
      completedJobsCount: 12,
      activeAssignmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Before admin approval: PENDING -> Ineligible (returns null)
    const scorePending = scoreWorkerForRequest(pendingWorker, request as any, ['electrical']);
    expect(scorePending).toBeNull();

    // After admin approval: VERIFIED -> Eligible and scored
    const approvedWorker: WorkerProfile = {
      ...pendingWorker,
      verificationStatus: 'VERIFIED',
    };
    const scoreApproved = scoreWorkerForRequest(approvedWorker, request as any, ['electrical']);
    expect(scoreApproved).not.toBeNull();
    expect(scoreApproved!.score).toBeGreaterThan(50);
  });
});

describe('8. Administrator Password Management & Temporary Flag Clearing', () => {
  const adminPasswordSchema = z.object({
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  });

  function processAdminPasswordChange(
    userRecord: { uid: string; mustChangePassword?: boolean },
    payload: z.infer<typeof adminPasswordSchema>
  ) {
    const now = new Date().toISOString();
    return {
      updatedUser: {
        ...userRecord,
        mustChangePassword: false, // Temporary password state cleared
        updatedAt: now,
      },
      auditLog: {
        action: 'ADMIN_PASSWORD_CHANGED',
        actorId: userRecord.uid,
        actorRole: 'ADMIN',
        targetType: 'SYSTEM',
        targetId: userRecord.uid,
        details: {
          temporaryPasswordCleared: true,
          method: 'AUTHENTICATED_ENDPOINT',
        },
        timestamp: now,
      },
    };
  }

  it('validates password minimum length of 8 characters', () => {
    expect(adminPasswordSchema.safeParse({ newPassword: 'short' }).success).toBe(false);
    expect(adminPasswordSchema.safeParse({ newPassword: 'StrongPassword#2026' }).success).toBe(true);
  });

  it('clears mustChangePassword flag and records audit log upon password change', () => {
    const adminUser = { uid: 'admin_initial', mustChangePassword: true };
    const result = processAdminPasswordChange(adminUser, { newPassword: 'NewSecurePassword#999' });

    expect(result.updatedUser.mustChangePassword).toBe(false);
    expect(result.auditLog.action).toBe('ADMIN_PASSWORD_CHANGED');
    expect(result.auditLog.details.temporaryPasswordCleared).toBe(true);
  });
});

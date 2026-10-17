export type UserRole = 'CUSTOMER' | 'WORKER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING';
export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'OPEN_FOR_WORKERS'
  | 'AWAITING_ASSIGNMENT_CONFIRMATION'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETION_PENDING_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELLED';

export type AssignmentStatus =
  | 'PENDING_OTP'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'emergency';
export type DiyEligibility = 'allowed' | 'limited' | 'not_allowed';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  accountStatus: AccountStatus;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  mustChangePassword?: boolean;
  locality?: string;
  district?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerProfile {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  bio: string;
  experienceYears: number;
  skills: string[]; // Skill IDs or names
  serviceCategories?: string[];
  indicativeRates?: {
    hourlyRate?: number;
    minimumVisitFee?: number;
  };
  serviceArea: string; // Locality or District
  serviceRadiusKm?: number;
  availabilityStatus: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  identityDocumentId?: string;
  identityDocumentSubmitted?: boolean;
  maskedAadhaar?: string;
  averageRating: number;
  completedJobsCount: number;
  activeAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerDocument {
  id: string;
  workerId: string;
  documentType: 'AADHAAR' | 'GOVT_ID';
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  maskedNumber?: string;
  uploadedAt: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
}

export type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface Complaint {
  id: string;
  complainantId: string;
  complainantRole: 'CUSTOMER' | 'WORKER';
  complainantName: string;
  targetUserId: string;
  targetUserRole: 'CUSTOMER' | 'WORKER';
  targetUserName?: string;
  requestId?: string;
  requestTitle?: string;
  assignmentId?: string;
  category: string;
  description: string;
  evidenceFileName?: string;
  evidenceMimeType?: string;
  evidenceStoragePath?: string;
  evidenceSize?: number;
  status: ComplaintStatus;
  adminNotes?: string;
  resolutionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action:
    | 'WORKER_APPROVED'
    | 'WORKER_REJECTED'
    | 'WORKER_RESUBMISSION_REQUESTED'
    | 'USER_BANNED'
    | 'USER_UNBANNED'
    | 'COMPLAINT_STATUS_UPDATED'
    | 'ADMIN_PASSWORD_CHANGED';
  targetType: 'WORKER' | 'CUSTOMER' | 'COMPLAINT' | 'ADMIN';
  targetId: string;
  targetName?: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  title: string;
  description: string;
  category?: string;
  locality: string;
  district: string;
  state: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferredTime?: string;
  status: RequestStatus;
  selectedWorkerId?: string;
  assignedWorkerId?: string;
  aiAnalysisId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PossibleCause {
  cause: string;
  reason: string;
  likelihood: 'low' | 'medium' | 'high';
  requiresInspection: boolean;
}

export interface AIAnalysis {
  id?: string;
  requestId: string;
  customerId: string;
  modelId: string;
  problemSummary: string;
  observations: string[];
  possibleCauses: PossibleCause[];
  recommendedSkills: string[];
  severity: SeverityLevel;
  uncertainty: string;
  diyEligibility: DiyEligibility;
  basicChecks: string[];
  safetyWarnings: string[];
  requiresProfessional: boolean;
  inspectionQuestions: string[];
  estimatedCostCategory?: string;
  costEstimate?: CostEstimate;
  createdAt: string;
}

export interface CostEstimate {
  skillId: string;
  skillName: string;
  baseLabourRate: number;
  travelRate: number;
  materialsAllowance: number;
  indicativeTotal: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
  currency: string;
  disclaimer: string;
}

export interface RateCard {
  id: string;
  skillId: string;
  skillName: string;
  locality: string;
  baseLabourRate: number;
  minimumCharge: number;
  travelRate: number;
  indicativeMaterialsAllowance: number;
  currency: string;
  active: boolean;
  updatedAt: string;
}

export interface TaskInterest {
  id: string;
  requestId: string;
  workerId: string;
  workerName?: string;
  workerRating?: number;
  workerSkills?: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  requestId: string;
  customerId: string;
  workerId: string;
  status: AssignmentStatus;
  otpHash?: string;
  otpExpiresAt?: string;
  otpAttemptCount: number;
  otpUsedAt?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientUid: string;
  type: 'INTEREST_EXPRESSED' | 'OTP_GENERATED' | 'ASSIGNMENT_CONFIRMED' | 'TASK_STARTED' | 'TASK_COMPLETED' | 'FEEDBACK_SUBMITTED';
  title: string;
  message: string;
  requestId?: string;
  read: boolean;
  createdAt: string;
}

export type ReviewOption = 'very bad' | 'bad' | 'ok' | 'good' | 'very good';

export interface Feedback {
  id: string;
  requestId: string;
  customerId: string;
  customerName?: string;
  workerId: string;
  rating: number; // 1-5
  review?: ReviewOption;
  comment: string;
  createdAt: string;
}

export interface WorkerVerification {
  id?: string;
  workerId: string;
  status: VerificationStatus;
  reviewedBy: string;
  reviewedAt: string;
  notes?: string;
}

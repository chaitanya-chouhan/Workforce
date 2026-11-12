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
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkerProfile {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  bio: string;
  experienceYears: number;
  skills: string[];
  serviceCategories?: string[];
  indicativeRates?: {
    hourlyRate?: number;
    minimumVisitFee?: number;
  };
  serviceArea: string;
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
  storagePath?: string;
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
  subject: string;
  description: string;
  evidenceFileId?: string;
  evidenceFileName?: string;
  evidenceMimeType?: string;
  evidenceSize?: number;
  status: ComplaintStatus;
  adminNotes?: string;
  resolutionNotes?: string;
  resolutionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId?: string;
  adminEmail?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  details?: Record<string, any>;
  reason?: string;
  metadata?: Record<string, any>;
  notes?: string;
  timestamp: string;
}

export interface RequiredPart {
  name: string;
  partSpecification?: string;
  estimatedCost: number;
  priceSource: string;
}

export interface PossibleCause {
  cause: string;
  reason: string;
  likelihood: 'low' | 'medium' | 'high';
  requiresInspection: boolean;
  recommendedRepair?: string;
  partsRequired?: string[];
  estimatedLabourCost?: number;
  estimatedTotalCost?: number;
}

export interface ImageQualityAssessment {
  isClear: boolean;
  lighting: 'good' | 'too_dark' | 'overexposed' | 'adequate';
  componentVisible: boolean;
  resolutionSufficient: boolean;
  obstructions: 'none' | 'partial' | 'cropped' | 'obstructed';
  watermarksOrOverlays: boolean;
  notes?: string;
}

export interface ImageAuthenticityAssessment {
  status: 'verified_authentic' | 'suspicious' | 'unable_to_verify';
  heuristicNotes: string;
  heuristicIndicators: string[];
}

export interface ImageAssessment {
  hasImage: boolean;
  quality?: ImageQualityAssessment;
  authenticity?: ImageAuthenticityAssessment;
  guidance?: string;
  qualitySufficientForDiagnosis: boolean;
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
  // Extended modular pricing breakdown
  partsCost?: number;
  travelCost?: number;
  labourCost?: number;
  additionalCost?: number;
  requiredParts?: RequiredPart[];
  complexityLevel?: 'routine' | 'moderate' | 'complex' | 'specialized';
  expectedDurationHours?: number;
  pricingLocality?: string;
  pricingMethod?: string;
  factorsAffectingPrice?: string[];
}

export interface AIAnalysis {
  id?: string;
  requestId: string;
  customerId: string;
  modelId: string;
  problemSummary: string;
  issueSummary?: string;
  observations: string[];
  possibleCauses: PossibleCause[];
  confidence?: 'low' | 'medium' | 'high';
  imageAssessment?: ImageAssessment;
  recommendedRepair?: string;
  recommendedSkills: string[];
  severity: 'low' | 'medium' | 'high' | 'emergency';
  uncertainty: string;
  assumptions?: string[];
  diyEligibility: 'allowed' | 'limited' | 'not_allowed';
  basicChecks: string[];
  safetyWarnings: string[];
  requiresProfessional: boolean;
  professionalInspectionRequired?: boolean;
  inspectionQuestions: string[];
  estimatedCostCategory?: string;
  costEstimate?: CostEstimate;
  factorsAffectingPrice?: string[];
  createdAt: string;
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

export interface TaskInterest {
  id: string;
  requestId: string;
  workerId: string;
  workerName?: string;
  workerRating?: number;
  workerSkills?: string[];
  workerCompletedJobsCount?: number;
  workerServiceArea?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  requestId: string;
  customerId: string;
  customerName?: string;
  workerId: string;
  workerName?: string;
  status: AssignmentStatus;
  otpExpiresAt?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredWorker {
  worker: WorkerProfile;
  score: number;
  breakdown: {
    skillScore: number;
    capacityScore: number;
    areaScore: number;
    reliabilityScore: number;
    costScore: number;
  };
  matchedSkills: string[];
  reasons: string[];
}

export interface Notification {
  id: string;
  recipientUid: string;
  type: string;
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
  rating: number;
  review?: ReviewOption;
  comment: string;
  createdAt: string;
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

export interface Skill {
  id: string;
  name: string;
  category: string;
  description?: string;
  active?: boolean;
}


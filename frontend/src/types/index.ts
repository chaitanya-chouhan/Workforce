export type UserRole = 'CUSTOMER' | 'WORKER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

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
  indicativeRates?: {
    hourlyRate?: number;
    minimumVisitFee?: number;
  };
  serviceArea: string;
  serviceRadiusKm?: number;
  availabilityStatus: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  averageRating: number;
  completedJobsCount: number;
  activeAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PossibleCause {
  cause: string;
  reason: string;
  likelihood: 'low' | 'medium' | 'high';
  requiresInspection: boolean;
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

export interface AIAnalysis {
  id?: string;
  requestId: string;
  customerId: string;
  modelId: string;
  problemSummary: string;
  observations: string[];
  possibleCauses: PossibleCause[];
  recommendedSkills: string[];
  severity: 'low' | 'medium' | 'high' | 'emergency';
  uncertainty: string;
  diyEligibility: 'allowed' | 'limited' | 'not_allowed';
  basicChecks: string[];
  safetyWarnings: string[];
  requiresProfessional: boolean;
  inspectionQuestions: string[];
  estimatedCostCategory?: string;
  costEstimate?: CostEstimate;
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

export interface Feedback {
  id: string;
  requestId: string;
  customerId: string;
  customerName?: string;
  workerId: string;
  rating: number;
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


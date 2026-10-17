import { WorkerProfile, ServiceRequest } from '../types';
import { getDb, isFirebaseAdminConfigured } from '../config/firebase';
import { normalizeSkillKey } from './costEstimationService';

export interface ScoredWorker {
  worker: WorkerProfile;
  score: number; // 0 to 100
  breakdown: {
    skillScore: number;       // max 35
    capacityScore: number;    // max 25
    areaScore: number;        // max 20
    reliabilityScore: number; // max 10
    costScore: number;        // max 10
  };
  matchedSkills: string[];
  reasons: string[];
}

export interface MatchResult {
  requestId: string;
  requiredSkills: string[];
  workers: ScoredWorker[];
  suggestedTeam?: ScoredWorker[];
  message?: string;
}

const MAX_ACTIVE_ASSIGNMENTS = 3;

/**
 * Deterministic worker matching and ranking algorithm.
 */
export function scoreWorkerForRequest(
  worker: WorkerProfile,
  request: ServiceRequest,
  requiredSkills: string[]
): ScoredWorker | null {
  // 1. Mandatory eligibility checks
  if (worker.availabilityStatus !== 'AVAILABLE') return null;
  if (worker.verificationStatus !== 'VERIFIED') return null;
  if (worker.activeAssignmentCount >= MAX_ACTIVE_ASSIGNMENTS) return null;

  const normalizedRequired = requiredSkills.map(s => normalizeSkillKey(s));
  const workerNormalizedSkills = worker.skills.map(s => normalizeSkillKey(s));

  // Find intersection of skills
  const matchedSkills = normalizedRequired.filter(s => workerNormalizedSkills.includes(s));
  if (matchedSkills.length === 0 && normalizedRequired.length > 0) {
    // No skill overlap
    return null;
  }

  // 2. Skill Match Score (35%)
  const skillRatio = normalizedRequired.length > 0 ? matchedSkills.length / normalizedRequired.length : 1;
  const skillScore = Math.round(skillRatio * 35);

  // 3. Availability and Capacity Score (25%)
  // Capacity: fewer active jobs = higher score
  const remainingCapacity = Math.max(0, MAX_ACTIVE_ASSIGNMENTS - worker.activeAssignmentCount);
  const capacityRatio = remainingCapacity / MAX_ACTIVE_ASSIGNMENTS;
  const capacityScore = Math.round(capacityRatio * 25);

  // 4. Service-Area Match Score (20%)
  let areaScore = 0;
  const workerArea = (worker.serviceArea || '').toLowerCase().trim();
  const reqLocality = (request.locality || '').toLowerCase().trim();
  const reqDistrict = (request.district || '').toLowerCase().trim();

  if (workerArea === 'all localities' || workerArea === 'all' || workerArea === reqLocality) {
    areaScore = 20; // Exact locality match or city-wide coverage
  } else if (workerArea.includes(reqDistrict) || reqLocality.includes(workerArea)) {
    areaScore = 14; // District / nearby match
  } else {
    areaScore = 5;  // Baseline regional coverage
  }

  // 5. Reliability and Completed-Job History (10%)
  // Rating: 0 to 5 stars -> 0 to 6 points
  // Completed jobs: 0 to 10+ jobs -> 0 to 4 points
  const ratingScore = Math.min(6, (worker.averageRating / 5) * 6);
  const jobsScore = Math.min(4, (worker.completedJobsCount / 10) * 4);
  const reliabilityScore = Math.round(ratingScore + jobsScore);

  // 6. Cost Suitability Score (10%)
  // Workers with reasonable hourly rates get up to 10 points
  const rate = worker.indicativeRates?.hourlyRate || 300;
  let costScore = 8;
  if (rate <= 300) costScore = 10;
  else if (rate <= 450) costScore = 8;
  else if (rate <= 600) costScore = 6;
  else costScore = 4;

  const totalScore = Math.min(100, skillScore + capacityScore + areaScore + reliabilityScore + costScore);

  const reasons: string[] = [];
  if (skillRatio === 1) reasons.push('Possesses all required skills');
  else reasons.push(`Matches ${matchedSkills.length} of ${normalizedRequired.length} required skills`);

  if (worker.activeAssignmentCount === 0) reasons.push('Fully available with immediate capacity');
  else reasons.push(`${remainingCapacity} active capacity slots open`);

  if (areaScore === 20) reasons.push(`Serves ${request.locality}`);
  if (worker.completedJobsCount > 0) reasons.push(`${worker.completedJobsCount} jobs completed (${worker.averageRating.toFixed(1)}/5 rating)`);

  return {
    worker,
    score: totalScore,
    breakdown: {
      skillScore,
      capacityScore,
      areaScore,
      reliabilityScore,
      costScore,
    },
    matchedSkills,
    reasons,
  };
}

/**
 * Finds eligible matching workers for a service request.
 */
export async function findMatchingWorkers(
  request: ServiceRequest,
  requiredSkills: string[]
): Promise<MatchResult> {
  const allWorkers: WorkerProfile[] = [];

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getDb();
      // Fetch available, verified workers from Firestore
      const snap = await db
        .collection('workerProfiles')
        .where('availabilityStatus', '==', 'AVAILABLE')
        .where('verificationStatus', '==', 'VERIFIED')
        .get();

      for (const doc of snap.docs) {
        allWorkers.push({ userId: doc.id, ...(doc.data() as Omit<WorkerProfile, 'userId'>) });
      }
    } catch (err) {
      console.warn('[Matching] Firestore query failed, falling back:', err);
    }
  }

  const scoredWorkers: ScoredWorker[] = [];

  for (const worker of allWorkers) {
    const scored = scoreWorkerForRequest(worker, request, requiredSkills);
    if (scored) {
      scoredWorkers.push(scored);
    }
  }

  // Sort descending by score
  scoredWorkers.sort((a, b) => b.score - a.score);

  // If multiple distinct skills are required, identify team coverage if no single worker covers all
  let suggestedTeam: ScoredWorker[] | undefined;
  const singleWorkerCoversAll = scoredWorkers.some(
    w => w.matchedSkills.length >= requiredSkills.length
  );

  if (!singleWorkerCoversAll && requiredSkills.length > 1 && scoredWorkers.length > 1) {
    const team: ScoredWorker[] = [];
    const covered = new Set<string>();

    for (const w of scoredWorkers) {
      const newSkills = w.matchedSkills.filter(s => !covered.has(s));
      if (newSkills.length > 0) {
        team.push(w);
        newSkills.forEach(s => covered.add(s));
      }
      if (covered.size >= requiredSkills.length) break;
    }

    if (team.length > 1 && covered.size > 1) {
      suggestedTeam = team;
    }
  }

  const message =
    scoredWorkers.length === 0
      ? 'No available, verified workers currently match the required skills in this area. You can expand your search or wait for local providers to mark themselves available.'
      : undefined;

  return {
    requestId: request.id,
    requiredSkills,
    workers: scoredWorkers,
    suggestedTeam,
    message,
  };
}

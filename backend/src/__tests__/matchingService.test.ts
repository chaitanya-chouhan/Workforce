import { describe, it, expect } from 'vitest';
import { scoreWorkerForRequest } from '../services/matchingService';
import { WorkerProfile, ServiceRequest } from '../types';

const mockRequest: ServiceRequest = {
  id: 'req_123',
  customerId: 'cust_abc',
  title: 'Leaking pipe under kitchen sink',
  description: 'Water leaking steadily from PVC junction pipe under sink',
  locality: 'Indiranagar',
  district: 'Bengaluru',
  state: 'Karnataka',
  urgency: 'medium',
  status: 'OPEN_FOR_WORKERS',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const baseWorker: WorkerProfile = {
  userId: 'worker_001',
  name: 'Ramesh Kumar',
  bio: 'Experienced licensed plumber',
  experienceYears: 7,
  skills: ['plumbing'],
  indicativeRates: { hourlyRate: 300, minimumVisitFee: 200 },
  serviceArea: 'Indiranagar',
  availabilityStatus: 'AVAILABLE',
  verificationStatus: 'VERIFIED',
  averageRating: 4.8,
  completedJobsCount: 15,
  activeAssignmentCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Worker Matching Service', () => {
  it('scores an eligible, available, verified worker with matching skills', () => {
    const scored = scoreWorkerForRequest(baseWorker, mockRequest, ['plumbing']);

    expect(scored).not.toBeNull();
    expect(scored!.score).toBeGreaterThan(70);
    expect(scored!.matchedSkills).toContain('plumbing');
    expect(scored!.breakdown.skillScore).toBe(35); // 100% skill match
    expect(scored!.breakdown.capacityScore).toBe(25); // 0 active jobs
    expect(scored!.breakdown.areaScore).toBe(20); // Exact locality match
  });

  it('excludes an unavailable worker', () => {
    const unavailableWorker: WorkerProfile = {
      ...baseWorker,
      availabilityStatus: 'UNAVAILABLE',
    };

    const scored = scoreWorkerForRequest(unavailableWorker, mockRequest, ['plumbing']);
    expect(scored).toBeNull();
  });

  it('excludes an unverified worker', () => {
    const unverifiedWorker: WorkerProfile = {
      ...baseWorker,
      verificationStatus: 'PENDING',
    };

    const scored = scoreWorkerForRequest(unverifiedWorker, mockRequest, ['plumbing']);
    expect(scored).toBeNull();
  });

  it('excludes a worker who does not have the required skill', () => {
    const carpenterWorker: WorkerProfile = {
      ...baseWorker,
      skills: ['carpentry'],
    };

    const scored = scoreWorkerForRequest(carpenterWorker, mockRequest, ['plumbing']);
    expect(scored).toBeNull();
  });

  it('excludes a worker who has reached maximum active assignments capacity', () => {
    const busyWorker: WorkerProfile = {
      ...baseWorker,
      activeAssignmentCount: 3,
    };

    const scored = scoreWorkerForRequest(busyWorker, mockRequest, ['plumbing']);
    expect(scored).toBeNull();
  });
});

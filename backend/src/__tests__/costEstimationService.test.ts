import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RATE_CARDS,
  calculateEstimate,
  normalizeSkillKey,
  formatINR,
} from '../services/costEstimationService';

describe('Cost Estimation Service', () => {
  it('normalizes skill names into canonical skill keys', () => {
    expect(normalizeSkillKey('Bathroom Plumber')).toBe('plumbing');
    expect(normalizeSkillKey('Electrician & Fan Repair')).toBe('electrical');
    expect(normalizeSkillKey('Wooden Door Carpenter')).toBe('carpentry');
    expect(normalizeSkillKey('Washing Machine Repair')).toBe('appliance_repair');
    expect(normalizeSkillKey('Wall Painting')).toBe('painting');
  });

  it('correctly calculates indicative totals and reasonable min/max range', () => {
    const plumbingCard = DEFAULT_RATE_CARDS['plumbing'];
    expect(plumbingCard).toBeDefined();

    const estimate = calculateEstimate(plumbingCard, 'medium');

    expect(estimate.skillId).toBe('plumbing');
    expect(estimate.baseLabourRate).toBe(250);
    expect(estimate.travelRate).toBe(50);
    expect(estimate.materialsAllowance).toBe(100);
    expect(estimate.indicativeTotal).toBe(400); // 250 + 50 + 100

    // Range should bracket indicative total
    expect(estimate.estimatedCostMin).toBeLessThanOrEqual(estimate.indicativeTotal);
    expect(estimate.estimatedCostMax).toBeGreaterThanOrEqual(estimate.indicativeTotal);
    expect(estimate.disclaimer).toContain('Approximate estimate based on the current sample rate card');
  });

  it('adjusts rates upward for emergency and high severity issues', () => {
    const electricalCard = DEFAULT_RATE_CARDS['electrical'];
    const normalEst = calculateEstimate(electricalCard, 'medium');
    const emergencyEst = calculateEstimate(electricalCard, 'emergency');

    expect(emergencyEst.indicativeTotal).toBeGreaterThan(normalEst.indicativeTotal);
    expect(emergencyEst.baseLabourRate).toBeGreaterThan(normalEst.baseLabourRate);
  });

  it('formats amounts in Indian Rupee format correctly', () => {
    const formatted = formatINR(400);
    // Should include currency symbol ₹
    expect(formatted).toContain('₹');
    expect(formatted).toContain('400');
  });
});

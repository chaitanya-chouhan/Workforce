import { describe, it, expect } from 'vitest';
import { evaluateSafety } from '../services/safetyService';

describe('Safety Evaluation Service', () => {
  it('triggers emergency safety escalation on gas leak detection', () => {
    const res = evaluateSafety('There is a strong smell of gas coming from the kitchen pipeline', 'Plumbing');

    expect(res.isDangerous).toBe(true);
    expect(res.severity).toBe('emergency');
    expect(res.diyAllowed).toBe(false);
    expect(res.requiresProfessional).toBe(true);
    expect(res.dangerCategory).toBe('GAS_LEAK');
    expect(res.restrictedActions.some(a => a.includes('DO NOT turn on or off any electrical switches'))).toBe(true);
  });

  it('triggers high safety escalation on electrical sparking / exposed wiring', () => {
    const res = evaluateSafety('The switch board is sparking and giving mild electrical shocks', 'Electrical');

    expect(res.isDangerous).toBe(true);
    expect(res.severity).toBe('high');
    expect(res.diyAllowed).toBe(false);
    expect(res.requiresProfessional).toBe(true);
    expect(res.dangerCategory).toBe('ELECTRICAL_HAZARD');
    expect(res.protectiveActions.some(a => a.includes('main electrical breaker (MCB)'))).toBe(true);
  });

  it('triggers emergency safety escalation on active fire / flames', () => {
    const res = evaluateSafety('Smoke and flames coming from the attic', 'General');

    expect(res.isDangerous).toBe(true);
    expect(res.severity).toBe('emergency');
    expect(res.diyAllowed).toBe(false);
    expect(res.dangerCategory).toBe('FIRE_HAZARD');
  });

  it('triggers high safety escalation on structural collapse risks', () => {
    const res = evaluateSafety('There is a deep crack in pillar and the ceiling seems to be collapsing', 'Civil');

    expect(res.isDangerous).toBe(true);
    expect(res.severity).toBe('high');
    expect(res.diyAllowed).toBe(false);
    expect(res.dangerCategory).toBe('STRUCTURAL_HAZARD');
  });

  it('allows safe baseline guidance for non-hazardous household issues', () => {
    const res = evaluateSafety('My bathroom tap is dripping water slowly', 'Plumbing');

    expect(res.isDangerous).toBe(false);
    expect(res.severity).toBe('low');
    expect(res.diyAllowed).toBe(true);
  });
});

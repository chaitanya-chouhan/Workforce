export interface SafetyEvaluation {
  isDangerous: boolean;
  severity: 'low' | 'medium' | 'high' | 'emergency';
  diyAllowed: boolean;
  requiresProfessional: boolean;
  safetyWarnings: string[];
  protectiveActions: string[];
  restrictedActions: string[];
  dangerCategory?: 'GAS_LEAK' | 'ELECTRICAL_HAZARD' | 'FIRE_HAZARD' | 'STRUCTURAL_HAZARD' | 'CHEMICAL_SEWAGE_HAZARD';
}

const DANGER_PATTERNS = [
  {
    category: 'GAS_LEAK' as const,
    regex: /\b(gas\s*leak|smell\s*(of\s*)?gas|lpg\s*leak|cylinder\s*leak|gas\s*pipe|rotten\s*egg\s*smell|pipeline\s*leak)\b/i,
    severity: 'emergency' as const,
    warnings: [
      'CRITICAL SAFETY HAZARD: Suspected combustible gas leak detected.',
      'Risk of catastrophic fire, explosion, or asphyxiation.',
    ],
    protectiveActions: [
      'Evacuate all people and pets from the premises immediately.',
      'Extinguish any open flames or incense.',
      'Shut off the main gas cylinder regulator or pipeline isolation valve if safely accessible.',
      'Leave doors and windows open only if you can do so immediately on your way out.',
      'Call the emergency gas hotline or local fire emergency services from a safe distance outside the building.',
    ],
    restrictedActions: [
      'DO NOT turn on or off any electrical switches, appliances, doorbells, or mobile phones inside.',
      'DO NOT ignite matches, lighters, or any flame.',
      'DO NOT attempt any DIY repair or disassembly of the gas valve or pipeline.',
    ],
  },
  {
    category: 'ELECTRICAL_HAZARD' as const,
    regex: /\b(electric(al)?\s*shock|spark(ing|s|ed)?|exposed\s*wire(s)?|burning\s*(\w+\s*)?wire(s)?|smoke\s*from\s*(socket|switch|board|appliance)|short\s*circuit|buzzing\s*breaker|water\s*in\s*(switch|outlet|panel))\b/i,
    severity: 'high' as const,
    warnings: [
      'ELECTRICAL SHOCK & FIRE HAZARD: Exposed voltage, sparking, or active short-circuit.',
      'Risk of fatal electrocution and electrical structure fires.',
    ],
    protectiveActions: [
      'Turn off the main electrical breaker (MCB) immediately if the distribution board is dry and safely accessible.',
      'Keep clear of standing water near electrical points.',
      'Unplug affected appliances ONLY if safe and the main power is cut.',
      'Keep children and household members away from the affected area.',
      'Require an authorized licensed electrician for on-site inspection.',
    ],
    restrictedActions: [
      'DO NOT touch exposed conductors, damaged wiring, or smoking components with bare hands.',
      'DO NOT use water to extinguish electrical flames or smoke; use a Class C/dry chemical fire extinguisher if trained.',
      'DO NOT attempt DIY rewiring on live circuits.',
    ],
  },
  {
    category: 'FIRE_HAZARD' as const,
    regex: /\b(fire|flames|smoke\s*detector|burning\s*smell\s*from|smoldering)\b/i,
    severity: 'emergency' as const,
    warnings: [
      'ACTIVE FIRE / COMBUSTION HAZARD detected.',
      'Immediate risk to life and property.',
    ],
    protectiveActions: [
      'Evacuate the area immediately and alert household members.',
      'Call the emergency fire department (e.g. 101/112) without delay.',
      'Close doors behind you as you evacuate to slow the spread of smoke.',
    ],
    restrictedActions: [
      'DO NOT re-enter a burning or smoke-filled building for possessions.',
      'DO NOT use elevators during a fire evacuation.',
    ],
  },
  {
    category: 'STRUCTURAL_HAZARD' as const,
    regex: /\b(ceiling\s*collapse|wall\s*collapse|deep\s*crack\s*in\s*pillar|sagging\s*roof|foundation\s*shift|structural\s*failure)\b/i,
    severity: 'high' as const,
    warnings: [
      'STRUCTURAL STABILITY WARNING: Potential load-bearing or ceiling failure.',
      'Risk of sudden collapse or falling debris.',
    ],
    protectiveActions: [
      'Cordon off the room or area immediately.',
      'Evacuate rooms directly below or adjoining the damaged structure.',
      'Engage a qualified civil engineer or certified structural contractor.',
    ],
    restrictedActions: [
      'DO NOT place ladders or stand beneath cracked or sagging slabs.',
      'DO NOT apply load or attempt temporary prop-ups without engineering oversight.',
    ],
  },
];

/**
 * Deterministic safety gate.
 * Evaluates problem description and category before AI processing.
 * Never allows DIY repairs on high-risk hazards.
 */
export function evaluateSafety(description: string, category?: string): SafetyEvaluation {
  const combinedText = `${category || ''} ${description}`.trim();

  for (const pattern of DANGER_PATTERNS) {
    if (pattern.regex.test(combinedText)) {
      return {
        isDangerous: true,
        severity: pattern.severity,
        diyAllowed: false,
        requiresProfessional: true,
        safetyWarnings: [...pattern.warnings],
        protectiveActions: [...pattern.protectiveActions],
        restrictedActions: [...pattern.restrictedActions],
        dangerCategory: pattern.category,
      };
    }
  }

  // Baseline standard safety precaution
  return {
    isDangerous: false,
    severity: 'low',
    diyAllowed: true,
    requiresProfessional: false,
    safetyWarnings: [
      'Always disconnect the main water/power supply before examining appliances or pipework.',
      'Wear protective eye-wear and gloves when handling cleaning chemicals or sharp plumbing fixtures.',
    ],
    protectiveActions: [
      'Visually inspect the area for leaks or loose connections.',
      'Take photos of the issue in good lighting for the professional technician.',
    ],
    restrictedActions: [
      'Do not force stuck valves or overtighten plastic pipe fittings.',
    ],
  };
}

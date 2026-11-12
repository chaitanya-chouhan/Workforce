import { CostEstimate, RequiredPart, SeverityLevel } from '../types';
import { getRateCardForSkill, DEFAULT_RATE_CARDS, normalizeSkillKey } from './costEstimationService';

export interface PricingContext {
  skillId: string;
  skillName?: string;
  locality?: string;
  district?: string;
  severity?: SeverityLevel;
  description?: string;
  possibleCauses?: Array<{ cause: string; reason?: string; partsRequired?: string[] }>;
  recommendedRepair?: string;
  workerRates?: {
    hourlyRate?: number;
    minimumVisitFee?: number;
  };
}

// Verified benchmark market parts catalog for standard household trades (INR)
export const BENCHMARK_PARTS_CATALOG: Record<string, RequiredPart[]> = {
  plumbing: [
    {
      name: 'Ceramic Disc Tap Spindle / Cartridge',
      partSpecification: '1/2-inch brass ceramic quarter-turn spindle',
      estimatedCost: 180,
      priceSource: 'Domestic hardware retail benchmark average',
    },
    {
      name: 'Flexible PVC P-Trap / Waste Pipe',
      partSpecification: '32mm universal expandable PVC drain pipe',
      estimatedCost: 120,
      priceSource: 'Domestic hardware retail benchmark average',
    },
    {
      name: 'Brass Angle Cock Valve',
      partSpecification: 'Chrome-plated forged brass quarter-turn valve',
      estimatedCost: 260,
      priceSource: 'Domestic hardware retail benchmark average',
    },
    {
      name: 'Full-Bore Brass Ball Valve',
      partSpecification: '1-inch heavy duty shut-off ball valve',
      estimatedCost: 350,
      priceSource: 'Domestic hardware retail benchmark average',
    },
    {
      name: 'Braided Stainless Steel Connection Hose',
      partSpecification: '450mm EPDM core SS304 braided connector',
      estimatedCost: 160,
      priceSource: 'Domestic hardware retail benchmark average',
    },
    {
      name: 'Plumbing Washer and O-Ring Seal Kit',
      partSpecification: 'Assorted nitrile rubber gaskets & washers',
      estimatedCost: 60,
      priceSource: 'Standard trade hardware consumable',
    },
  ],
  electrical: [
    {
      name: 'Single-Pole MCB Circuit Breaker',
      partSpecification: '16A / 25A Type-C 10kA breaker',
      estimatedCost: 220,
      priceSource: 'Standard domestic electrical retail benchmark',
    },
    {
      name: 'Modular Switch & 6/16A Power Socket Combo',
      partSpecification: 'Polycarbonate flame-retardant modular plate & switch',
      estimatedCost: 190,
      priceSource: 'Standard domestic electrical retail benchmark',
    },
    {
      name: 'Ceiling Fan Motor Run Capacitor',
      partSpecification: '2.5 mfd 440V AC metalized polypropylene capacitor',
      estimatedCost: 90,
      priceSource: 'Standard domestic electrical retail benchmark',
    },
    {
      name: 'Modular Rotary Fan Step Regulator',
      partSpecification: '4-step humming-free fan speed controller',
      estimatedCost: 240,
      priceSource: 'Standard domestic electrical retail benchmark',
    },
    {
      name: 'Copper Wire Bundle (1.5 / 2.5 sq mm)',
      partSpecification: 'FR PVC insulated single-core copper wire (5m repair cut)',
      estimatedCost: 180,
      priceSource: 'Standard domestic electrical retail benchmark',
    },
  ],
  carpentry: [
    {
      name: 'Stainless Steel Butt Hinges (Pair)',
      partSpecification: '4-inch heavy bearing SS hinges with wood screws',
      estimatedCost: 220,
      priceSource: 'Standard architectural hardware benchmark',
    },
    {
      name: 'Internal Door Mortise Latch & Lock Cylinder',
      partSpecification: 'Zinc alloy mortise latch with reversible brass bolt',
      estimatedCost: 580,
      priceSource: 'Standard architectural hardware benchmark',
    },
    {
      name: 'Drawer Telescopic Ball-Bearing Slide Channels (Pair)',
      partSpecification: '18-inch cold-rolled steel smooth runner channels',
      estimatedCost: 340,
      priceSource: 'Standard architectural hardware benchmark',
    },
    {
      name: 'Door Hydraulic Surface Closer / Stopper',
      partSpecification: 'Heavy-duty aluminium pneumatic door closer',
      estimatedCost: 450,
      priceSource: 'Standard architectural hardware benchmark',
    },
  ],
  appliance_repair: [
    {
      name: 'Universal Washing Machine Drain Pump',
      partSpecification: '30W 220V synchronous magnetic drain pump motor',
      estimatedCost: 750,
      priceSource: 'Domestic appliance replacement parts benchmark',
    },
    {
      name: 'Dual Solenoid Water Inlet Valve',
      partSpecification: '180-degree electric magnetic water inlet valve',
      estimatedCost: 460,
      priceSource: 'Domestic appliance replacement parts benchmark',
    },
    {
      name: 'Refrigerator PTC Starter Relay & Overload Protector',
      partSpecification: '1-pin 15-ohm PTC relay with thermal OLP switch',
      estimatedCost: 320,
      priceSource: 'Domestic appliance replacement parts benchmark',
    },
    {
      name: 'Microwave High-Voltage Fuse & Diode',
      partSpecification: '5kV 0.8A fast-blow fuse + high-voltage rectifier',
      estimatedCost: 210,
      priceSource: 'Domestic appliance replacement parts benchmark',
    },
  ],
  painting: [
    {
      name: 'Acrylic Wall Putty & Primer Patch Kit',
      partSpecification: '1kg crack-fill polymer putty + water-thinnable primer',
      estimatedCost: 190,
      priceSource: 'Standard surface preparation benchmark',
    },
    {
      name: 'Waterproof Dampproof Sealing Compound',
      partSpecification: 'Elastomeric acrylic seepage inhibitor (1L)',
      estimatedCost: 320,
      priceSource: 'Standard surface preparation benchmark',
    },
  ],
  masonry: [
    {
      name: 'Polymer-Modified Tile Adhesive Mortar',
      partSpecification: 'High-bond grey tile fixing mortar (5kg pack)',
      estimatedCost: 220,
      priceSource: 'Civil & masonry materials benchmark',
    },
    {
      name: 'Epoxy Waterproof Tile Grout',
      partSpecification: 'Stain-resistant antibacterial joint filler (1kg)',
      estimatedCost: 280,
      priceSource: 'Civil & masonry materials benchmark',
    },
  ],
  general_maintenance: [
    {
      name: 'Fasteners, Anchor Plugs & Mounting Kit',
      partSpecification: 'Assorted nylon wall anchors, SS screws, washers',
      estimatedCost: 110,
      priceSource: 'General hardware consumable benchmark',
    },
  ],
};

// Locality intelligence: Tier definitions for cost of living & travel index
const TIER_1_LOCALITIES = [
  'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'gurgaon', 'gurugram',
  'noida', 'hyderabad', 'chennai', 'kolkata', 'pune', 'navi mumbai', 'thane',
];

const TIER_2_LOCALITIES = [
  'bhopal', 'indore', 'jaipur', 'lucknow', 'ahmedabad', 'chandigarh', 'kochi',
  'nagpur', 'patna', 'vadodara', 'surat', 'coimbatore', 'visakhapatnam', 'mysore',
];

export function getLocalityTier(locality?: string, district?: string): 'tier_1' | 'tier_2' | 'tier_3' {
  const target = `${locality || ''} ${district || ''}`.toLowerCase();
  if (TIER_1_LOCALITIES.some(city => target.includes(city))) return 'tier_1';
  if (TIER_2_LOCALITIES.some(city => target.includes(city))) return 'tier_2';
  return 'tier_3';
}

/**
 * Modular Pricing Service
 * Computes realistic, explainable repair estimates by separating:
 * 1. Replacement parts cost (benchmarked against verified component catalogs)
 * 2. Worker visiting & travel charges (calibrated by locality tier & distance)
 * 3. Repair labour charges (calibrated by issue complexity, trade, and severity)
 * 4. Consumables & incidental materials
 */
export class PricingService {
  /**
   * Matches candidate replacement parts from problem text and possible causes.
   */
  public matchRequiredParts(skillKey: string, textToAnalyze: string): RequiredPart[] {
    const catalog = BENCHMARK_PARTS_CATALOG[skillKey] || BENCHMARK_PARTS_CATALOG['general_maintenance'] || [];
    const lower = textToAnalyze.toLowerCase();
    const matched: RequiredPart[] = [];

    for (const item of catalog) {
      const keywords = item.name.toLowerCase().split(/\s+/);
      const mainKeywords = keywords.filter(w => w.length > 3 && !['pair', 'kit', 'dual', 'with', 'standard'].includes(w));
      const hit = mainKeywords.some(kw => lower.includes(kw));

      if (hit) {
        matched.push(item);
      }
    }

    // Limit to top 2 most relevant parts to avoid compounding redundant components
    if (matched.length > 0) {
      return matched.slice(0, 2);
    }

    // Default trade material allowance fallback
    return [
      {
        name: 'Standard Replacement Seal / Fasteners / Hardware',
        partSpecification: 'Direct replacement consumable allowance for specified trade',
        estimatedCost: 120,
        priceSource: 'Configured trade materials allowance (fallback estimate)',
      },
    ];
  }

  /**
   * Assesses complexity level based on problem description and trade.
   */
  public assessComplexity(
    skillKey: string,
    description: string,
    severity: SeverityLevel = 'medium'
  ): { level: 'routine' | 'moderate' | 'complex' | 'specialized'; durationHours: number; multiplier: number } {
    const lower = description.toLowerCase();

    // Check for complex or specialized symptoms
    if (
      lower.includes('concealed') ||
      lower.includes('wiring fault') ||
      lower.includes('short circuit') ||
      lower.includes('motor rewind') ||
      lower.includes('compressor') ||
      lower.includes('seepage') ||
      lower.includes('main line') ||
      severity === 'emergency'
    ) {
      return { level: 'complex', durationHours: 2.5, multiplier: 1.6 };
    }

    if (
      lower.includes('replace') ||
      lower.includes('broken') ||
      lower.includes('socket') ||
      lower.includes('clogged') ||
      lower.includes('drain') ||
      severity === 'high'
    ) {
      return { level: 'moderate', durationHours: 1.2, multiplier: 1.15 };
    }

    // Routine minor maintenance
    return { level: 'routine', durationHours: 0.6, multiplier: 0.85 };
  }

  /**
   * Calculates a realistic, itemized cost estimate.
   */
  public async calculateRealisticEstimate(context: PricingContext): Promise<CostEstimate> {
    const skillKey = normalizeSkillKey(context.skillId || 'general_maintenance');
    const rateCard = await getRateCardForSkill(skillKey, context.locality);
    const tier = getLocalityTier(context.locality, context.district);

    // Locality multipliers
    const tierMultiplier = tier === 'tier_1' ? 1.15 : tier === 'tier_2' ? 1.0 : 0.9;
    const baseLabourFromCard = rateCard?.baseLabourRate || DEFAULT_RATE_CARDS[skillKey]?.baseLabourRate || 300;

    // Worker custom rates (if worker profile configured)
    const workerLabourBase = context.workerRates?.hourlyRate ? Math.max(context.workerRates.hourlyRate, 200) : baseLabourFromCard;

    // Severity and complexity calibration
    const severity = context.severity || 'medium';
    const complexity = this.assessComplexity(skillKey, `${context.description || ''} ${context.recommendedRepair || ''}`, severity);

    let severityMultiplier = 1.0;
    if (severity === 'low') severityMultiplier = 0.9;
    if (severity === 'high') severityMultiplier = 1.25;
    if (severity === 'emergency') severityMultiplier = 1.5;

    // 1. Labour Charge
    const calculatedLabour = Math.round(
      workerLabourBase * complexity.multiplier * severityMultiplier * tierMultiplier / 10
    ) * 10;

    // 2. Travel / Visiting Charge
    const minVisitFee = context.workerRates?.minimumVisitFee || (tier === 'tier_1' ? 150 : tier === 'tier_2' ? 120 : 100);
    const baseTravel = rateCard?.travelRate || (tier === 'tier_1' ? 70 : tier === 'tier_2' ? 50 : 40);
    // Avoid double counting: minimum visit fee covers the callout, travel rate reflects local transit
    const calculatedTravel = Math.max(baseTravel, Math.round(minVisitFee * 0.4 / 10) * 10);

    // 3. Replacement Parts
    const combinedText = `${context.description || ''} ${context.recommendedRepair || ''} ${
      (context.possibleCauses || []).map(c => `${c.cause} ${(c.partsRequired || []).join(' ')}`).join(' ')
    }`;
    const requiredParts = this.matchRequiredParts(skillKey, combinedText);
    const partsCost = requiredParts.reduce((sum, p) => sum + p.estimatedCost, 0);

    // 4. Consumables & Additional Charges
    const additionalCost = Math.round(
      (rateCard?.indicativeMaterialsAllowance || 80) * 0.5 * tierMultiplier / 10
    ) * 10;

    // 5. Total and Bracketing Range
    const indicativeTotal = partsCost + calculatedTravel + calculatedLabour + additionalCost;
    const minChargeFloor = minVisitFee + calculatedTravel;
    const estimatedCostMin = Math.max(minChargeFloor, Math.round((indicativeTotal * 0.85) / 10) * 10);
    const estimatedCostMax = Math.round((indicativeTotal * 1.25) / 10) * 10;

    const factorsAffectingPrice = [
      'Specific replacement part brand, manufacturer grade, or OEM component specifications',
      'Accessibility of concealed plumbing pipes, wall conduits, or hidden structural fittings',
      'Physical condition and any secondary damage discovered when the technician inspects on site',
      'Emergency or off-hours service dispatch requirements if requested',
    ];

    return {
      skillId: skillKey,
      skillName: rateCard?.skillName || DEFAULT_RATE_CARDS[skillKey]?.skillName || 'General Maintenance',
      baseLabourRate: calculatedLabour,
      travelRate: calculatedTravel,
      materialsAllowance: partsCost + additionalCost,
      indicativeTotal,
      estimatedCostMin,
      estimatedCostMax,
      currency: 'INR',
      disclaimer:
        'Approximate estimate based on verified local hardware benchmarks, trade complexity, and travel rates. Final charges may vary after physical on-site inspection.',
      partsCost,
      travelCost: calculatedTravel,
      labourCost: calculatedLabour,
      additionalCost,
      requiredParts,
      complexityLevel: complexity.level,
      expectedDurationHours: complexity.durationHours,
      pricingLocality: context.locality || 'Standard Local Benchmark',
      pricingMethod: `Modular Local Rate Engine (${tier.toUpperCase()})`,
      factorsAffectingPrice,
    };
  }
}

export const pricingService = new PricingService();

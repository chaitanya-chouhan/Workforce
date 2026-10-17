import { RateCard, CostEstimate, SeverityLevel } from '../types';
import { getDb, isFirebaseAdminConfigured } from '../config/firebase';

// In-memory sample rate cards for fallback / unit tests when Firestore has not yet been seeded
export const DEFAULT_RATE_CARDS: Record<string, RateCard> = {
  plumbing: {
    id: 'rate_plumbing_default',
    skillId: 'plumbing',
    skillName: 'Plumbing',
    locality: 'All Localities',
    baseLabourRate: 250,
    minimumCharge: 200,
    travelRate: 50,
    indicativeMaterialsAllowance: 100,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  electrical: {
    id: 'rate_electrical_default',
    skillId: 'electrical',
    skillName: 'Electrical Repair',
    locality: 'All Localities',
    baseLabourRate: 300,
    minimumCharge: 250,
    travelRate: 50,
    indicativeMaterialsAllowance: 150,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  carpentry: {
    id: 'rate_carpentry_default',
    skillId: 'carpentry',
    skillName: 'Carpentry',
    locality: 'All Localities',
    baseLabourRate: 350,
    minimumCharge: 300,
    travelRate: 60,
    indicativeMaterialsAllowance: 200,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  appliance_repair: {
    id: 'rate_appliance_default',
    skillId: 'appliance_repair',
    skillName: 'Appliance Repair',
    locality: 'All Localities',
    baseLabourRate: 400,
    minimumCharge: 300,
    travelRate: 80,
    indicativeMaterialsAllowance: 250,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  painting: {
    id: 'rate_painting_default',
    skillId: 'painting',
    skillName: 'Painting',
    locality: 'All Localities',
    baseLabourRate: 350,
    minimumCharge: 300,
    travelRate: 50,
    indicativeMaterialsAllowance: 300,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  cleaning: {
    id: 'rate_cleaning_default',
    skillId: 'cleaning',
    skillName: 'Deep Cleaning',
    locality: 'All Localities',
    baseLabourRate: 300,
    minimumCharge: 250,
    travelRate: 50,
    indicativeMaterialsAllowance: 100,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  masonry: {
    id: 'rate_masonry_default',
    skillId: 'masonry',
    skillName: 'Masonry & Tiling',
    locality: 'All Localities',
    baseLabourRate: 450,
    minimumCharge: 350,
    travelRate: 70,
    indicativeMaterialsAllowance: 350,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
  general_maintenance: {
    id: 'rate_general_default',
    skillId: 'general_maintenance',
    skillName: 'General Maintenance',
    locality: 'All Localities',
    baseLabourRate: 250,
    minimumCharge: 200,
    travelRate: 50,
    indicativeMaterialsAllowance: 100,
    currency: 'INR',
    active: true,
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Normalizes skill string to match rate card key.
 */
export function normalizeSkillKey(skillName: string): string {
  const lower = skillName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (lower.includes('plumb')) return 'plumbing';
  if (lower.includes('elect')) return 'electrical';
  if (lower.includes('carpent') || lower.includes('wood') || lower.includes('door')) return 'carpentry';
  if (lower.includes('appliance') || lower.includes('fridge') || lower.includes('machine') || lower.includes('ro_')) return 'appliance_repair';
  if (lower.includes('paint')) return 'painting';
  if (lower.includes('clean')) return 'cleaning';
  if (lower.includes('mason') || lower.includes('tile') || lower.includes('brick')) return 'masonry';
  return 'general_maintenance';
}

/**
 * Fetches matching rate card from Firestore, falling back to verified defaults.
 */
export async function getRateCardForSkill(skillName: string, locality?: string): Promise<RateCard | null> {
  const normalizedKey = normalizeSkillKey(skillName);

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getDb();
      // Try exact locality match first
      if (locality) {
        const snap = await db
          .collection('rateCards')
          .where('skillId', '==', normalizedKey)
          .where('locality', '==', locality)
          .where('active', '==', true)
          .limit(1)
          .get();

        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...(doc.data() as Omit<RateCard, 'id'>) };
        }
      }

      // Fall back to general rate card for this skill
      const generalSnap = await db
        .collection('rateCards')
        .where('skillId', '==', normalizedKey)
        .where('active', '==', true)
        .limit(1)
        .get();

      if (!generalSnap.empty) {
        const doc = generalSnap.docs[0];
        return { id: doc.id, ...(doc.data() as Omit<RateCard, 'id'>) };
      }
    } catch (err) {
      console.warn(`[RateCard] Error fetching from Firestore:`, err);
    }
  }

  // Use default in-memory rate card
  return DEFAULT_RATE_CARDS[normalizedKey] || null;
}

/**
 * Calculates deterministic cost estimate based on rate cards and severity.
 */
export function calculateEstimate(
  rateCard: RateCard,
  severity: SeverityLevel = 'medium'
): CostEstimate {
  // Multipliers based on severity / work intensity
  let severityMultiplier = 1.0;
  if (severity === 'low') severityMultiplier = 0.9;
  if (severity === 'high') severityMultiplier = 1.3;
  if (severity === 'emergency') severityMultiplier = 1.6;

  const adjustedLabour = Math.round(rateCard.baseLabourRate * severityMultiplier);
  const travel = rateCard.travelRate;
  const materials = Math.round(rateCard.indicativeMaterialsAllowance * severityMultiplier);

  const indicativeTotal = adjustedLabour + travel + materials;

  // Approximate range: -15% to +25%
  const estimatedCostMin = Math.max(
    rateCard.minimumCharge + travel,
    Math.round(indicativeTotal * 0.85 / 10) * 10
  );
  const estimatedCostMax = Math.round((indicativeTotal * 1.25) / 10) * 10;

  return {
    skillId: rateCard.skillId,
    skillName: rateCard.skillName,
    baseLabourRate: adjustedLabour,
    travelRate: travel,
    materialsAllowance: materials,
    indicativeTotal,
    estimatedCostMin,
    estimatedCostMax,
    currency: 'INR',
    disclaimer:
      'Approximate estimate based on the current sample rate card. Actual charges may change after the worker inspects the problem and confirms labour, travel, and materials.',
  };
}

/**
 * Formats amount in INR with Indian currency symbol.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

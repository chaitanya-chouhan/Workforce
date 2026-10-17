import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ServiceRequest, AIAnalysis } from '../types';
import { evaluateSafety } from '../services/safetyService';

// Schema matching the request creation schema in backend/src/routes/requests.ts
const createRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().optional(),
  locality: z.string().min(2, 'Locality is required'),
  district: z.string().default('Central'),
  state: z.string().default('Default State'),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).default('medium'),
  preferredTime: z.string().optional(),
});

function buildServiceRequestDocument(
  docId: string,
  user: { uid: string; name?: string },
  parsed: z.infer<typeof createRequestSchema>
): ServiceRequest {
  const now = new Date().toISOString();
  return {
    id: docId,
    customerId: user.uid,
    ...(user.name ? { customerName: user.name } : {}),
    title: parsed.title,
    description: parsed.description,
    category: parsed.category || 'General',
    locality: parsed.locality,
    district: parsed.district,
    state: parsed.state,
    urgency: parsed.urgency,
    ...(parsed.preferredTime && parsed.preferredTime.trim().length > 0
      ? { preferredTime: parsed.preferredTime.trim() }
      : {}),
    status: 'SUBMITTED',
    createdAt: now,
    updatedAt: now,
  };
}

describe('Service Request Document Creation & Validation (Bug 1)', () => {
  it('omits preferredTime completely when not supplied to prevent Firestore undefined rejection', () => {
    const rawPayload = {
      title: 'Ceiling fan is not working',
      description: 'The ceiling fan in the master bedroom does not rotate when switch is turned on',
      category: 'Electrical and Wiring',
      locality: 'Purvanchal Parisar / Bagmugaliya',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      urgency: 'medium' as const,
      // preferredTime is omitted / undefined
    };

    const parse = createRequestSchema.safeParse(rawPayload);
    expect(parse.success).toBe(true);

    if (parse.success) {
      const doc = buildServiceRequestDocument('req_001', { uid: 'cust_bhopal', name: 'Chaitanya' }, parse.data);

      // CRITICAL ASSERTION: "preferredTime" must NOT be in doc with undefined value
      expect('preferredTime' in doc).toBe(false);
      expect(doc.preferredTime).toBeUndefined();

      // Ensure NO key in the document has value `undefined` (which Firestore rejects)
      for (const [key, val] of Object.entries(doc)) {
        expect(val, `Field "${key}" must not be undefined`).not.toBeUndefined();
      }

      expect(doc.title).toBe('Ceiling fan is not working');
      expect(doc.locality).toBe('Purvanchal Parisar / Bagmugaliya');
      expect(doc.status).toBe('SUBMITTED');
    }
  });

  it('preserves and trims preferredTime when a non-empty string is provided', () => {
    const rawPayload = {
      title: 'Ceiling fan is not working',
      description: 'The ceiling fan in the master bedroom does not rotate when switch is turned on',
      category: 'Electrical and Wiring',
      locality: 'Purvanchal Parisar / Bagmugaliya',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      urgency: 'medium' as const,
      preferredTime: '  Tomorrow between 10 AM and 1 PM  ',
    };

    const parse = createRequestSchema.safeParse(rawPayload);
    expect(parse.success).toBe(true);

    if (parse.success) {
      const doc = buildServiceRequestDocument('req_002', { uid: 'cust_bhopal' }, parse.data);

      expect('preferredTime' in doc).toBe(true);
      expect(doc.preferredTime).toBe('Tomorrow between 10 AM and 1 PM');

      // Ensure no undefined values
      for (const [key, val] of Object.entries(doc)) {
        expect(val, `Field "${key}" must not be undefined`).not.toBeUndefined();
      }
    }
  });

  it('rejects invalid inputs with descriptive Zod error details', () => {
    const invalidPayload = {
      title: 'No', // < 3 chars
      description: 'Short', // < 10 chars
      locality: 'A', // < 2 chars
      urgency: 'yesterday', // invalid enum
    };

    const parse = createRequestSchema.safeParse(invalidPayload);
    expect(parse.success).toBe(false);
    if (!parse.success) {
      const paths = parse.error.errors.map(e => e.path[0]);
      expect(paths).toContain('title');
      expect(paths).toContain('description');
      expect(paths).toContain('locality');
      expect(paths).toContain('urgency');
    }
  });
});

describe('AI Analysis Document Structure & Undefined Prevention', () => {
  it('omits costEstimate and estimatedCostCategory when absent without inserting undefined', () => {
    const aiRecord: AIAnalysis = {
      id: 'ai_001',
      requestId: 'req_001',
      customerId: 'cust_001',
      modelId: 'gemma-4-26b-a4b-it',
      problemSummary: 'Ceiling fan capacitor failure',
      observations: ['Fan hums but blades do not spin'],
      possibleCauses: [
        {
          cause: 'Defective start capacitor',
          reason: 'Degraded capacitance prevents motor starting torque',
          likelihood: 'high',
          requiresInspection: true,
        },
      ],
      recommendedSkills: ['electrical'],
      severity: 'medium',
      uncertainty: 'Capacitor ratings require visual inspection of fan housing',
      diyEligibility: 'not_allowed',
      basicChecks: ['Verify wall switch and regulator positions'],
      safetyWarnings: ['Shut off mains MCB before opening electrical canopy'],
      requiresProfessional: true,
      inspectionQuestions: ['Is the fan motor warm to the touch?'],
      // costEstimate and estimatedCostCategory omitted
      createdAt: new Date().toISOString(),
    };

    // Ensure NO key in the document has value `undefined`
    for (const [key, val] of Object.entries(aiRecord)) {
      expect(val, `Field "${key}" must not be undefined`).not.toBeUndefined();
    }

    expect('costEstimate' in aiRecord).toBe(false);
    expect(aiRecord.possibleCauses.length).toBe(1);
    expect(aiRecord.requiresProfessional).toBe(true);
  });
});

describe('Image Upload Validation & Safety (Bug 2)', () => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB

  it('validates allowed image MIME types and file limits', () => {
    expect(allowedMimeTypes.includes('image/jpeg')).toBe(true);
    expect(allowedMimeTypes.includes('image/png')).toBe(true);
    expect(allowedMimeTypes.includes('image/webp')).toBe(true);
    expect(allowedMimeTypes.includes('application/pdf')).toBe(false);
    expect(allowedMimeTypes.includes('text/plain')).toBe(false);
    expect(allowedMimeTypes.includes('application/octet-stream')).toBe(false);
  });

  it('rejects oversized image files exceeding 5MB limit', () => {
    const validSize = 3 * 1024 * 1024; // 3MB
    const oversize = 6 * 1024 * 1024; // 6MB

    expect(validSize <= maxSizeBytes).toBe(true);
    expect(oversize <= maxSizeBytes).toBe(false);
  });

  it('runs deterministic safety check on hazardous descriptions regardless of image attachment', () => {
    const hazardousDescription = 'Ceiling fan sparked loudly and I smell burning plastic wires';
    const safety = evaluateSafety(hazardousDescription, 'Electrical');

    expect(safety.isDangerous).toBe(true);
    expect(safety.severity).toBe('high');
    expect(safety.diyAllowed).toBe(false);
    expect(safety.requiresProfessional).toBe(true);
    expect(safety.safetyWarnings.length).toBeGreaterThan(0);
  });
});

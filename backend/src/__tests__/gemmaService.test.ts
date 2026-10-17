import { describe, it, expect } from 'vitest';
import { aiAnalysisOutputSchema, GemmaService } from '../services/gemmaService';

describe('Gemma 4 Service & Schema Validation', () => {
  it('validates a well-formed structured Gemma 4 JSON response', () => {
    const validOutput = {
      problemSummary: 'Water is dripping steadily from the bathroom basin pipe connection',
      observations: ['Puddle of water on bathroom tiles', 'Drips appear when tap is opened'],
      possibleCauses: [
        {
          cause: 'Worn or degraded rubber washer in the P-trap union joint',
          reason: 'Constant water pressure and mineral buildup causes rubber gaskets to harden over time',
          likelihood: 'high',
          requiresInspection: true,
        },
      ],
      recommendedSkills: ['plumbing'],
      severity: 'low',
      uncertainty: 'Cannot confirm if the threaded connector is cracked without disassembling the fitting',
      diyEligibility: 'allowed',
      basicChecks: ['Check if the threaded nut is visibly loose by gently hand-tightening'],
      safetyWarnings: ['Shut off the angle stop valve beneath the sink before touching pipes'],
      requiresProfessional: false,
      inspectionQuestions: ['Has this basin joint been replaced recently?'],
      estimatedCostCategory: 'low',
    };

    const parsed = aiAnalysisOutputSchema.safeParse(validOutput);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid output missing required fields', () => {
    const invalidOutput = {
      problemSummary: 'Too short',
      // missing possibleCauses and recommendedSkills
    };

    const parsed = aiAnalysisOutputSchema.safeParse(invalidOutput);
    expect(parsed.success).toBe(false);
  });

  it('defaults to candidate model gemma-4-26b-a4b-it', () => {
    const service = new GemmaService();
    expect(service.getModelId()).toBe('gemma-4-26b-a4b-it');
  });

  it('reports missing API key honestly without fabricating a fake diagnosis', async () => {
    const service = new GemmaService();
    if (!service.isConfigured()) {
      await expect(
        service.analyzeProblem({
          description: 'My kitchen tap is leaking water',
        })
      ).rejects.toThrow(/GOOGLE_API_KEY.*not configured/);
    }
  });
});

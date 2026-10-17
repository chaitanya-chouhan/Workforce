import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { evaluateSafety, SafetyEvaluation } from './safetyService';

// Zod schema for strict validation of Gemma 4 JSON output
export const aiAnalysisOutputSchema = z.object({
  problemSummary: z.string().min(5),
  observations: z.array(z.string()).default([]),
  possibleCauses: z
    .array(
      z.object({
        cause: z.string(),
        reason: z.string(),
        likelihood: z.enum(['low', 'medium', 'high']),
        requiresInspection: z.boolean().default(true),
      })
    )
    .min(1),
  recommendedSkills: z.array(z.string()).min(1),
  severity: z.enum(['low', 'medium', 'high', 'emergency']),
  uncertainty: z.string(),
  diyEligibility: z.enum(['allowed', 'limited', 'not_allowed']),
  basicChecks: z.array(z.string()).default([]),
  safetyWarnings: z.array(z.string()).default([]),
  requiresProfessional: z.boolean().default(true),
  inspectionQuestions: z.array(z.string()).default([]),
  estimatedCostCategory: z
    .enum(['low', 'medium', 'high', 'requires_inspection'])
    .default('medium'),
});

export type AIAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

export interface ProblemInput {
  description: string;
  category?: string;
  locality?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
}

export class GemmaService {
  private client: GoogleGenAI | null = null;
  private modelId: string;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.modelId = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';

    if (this.apiKey && this.apiKey.trim().length > 0 && this.apiKey !== 'your_google_ai_studio_api_key_here') {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err: any) {
        console.warn(`[GemmaService] Failed to initialize GoogleGenAI: ${err.message}`);
      }
    }
  }

  public getModelId(): string {
    return this.modelId;
  }

  public isConfigured(): boolean {
    return (
      this.client !== null &&
      Boolean(this.apiKey) &&
      this.apiKey !== 'your_google_ai_studio_api_key_here'
    );
  }

  /**
   * Verifies model support or lists available models for the configured API key.
   */
  public async verifyModelSupport(): Promise<{
    available: boolean;
    configuredModel: string;
    message: string;
    availableGemmaModels?: string[];
  }> {
    if (!this.isConfigured() || !this.client) {
      return {
        available: false,
        configuredModel: this.modelId,
        message: 'Google GenAI API key is missing or not configured. Set GOOGLE_API_KEY in backend/.env',
      };
    }

    try {
      // Query models list
      const listRes = await this.client.models.list();
      const modelsList: string[] = [];
      let foundConfigured = false;
      const gemmaModels: string[] = [];

      for await (const m of listRes) {
        const id = m.name?.replace(/^models\//, '') || '';
        modelsList.push(id);
        if (id.toLowerCase().includes('gemma')) {
          gemmaModels.push(id);
        }
        if (id === this.modelId) {
          foundConfigured = true;
        }
      }

      if (foundConfigured) {
        return {
          available: true,
          configuredModel: this.modelId,
          message: `Model ${this.modelId} is supported and active on this API key.`,
          availableGemmaModels: gemmaModels,
        };
      }

      return {
        available: false,
        configuredModel: this.modelId,
        message: `Model ${this.modelId} was not found in the model list for this account. Available Gemma models: [${gemmaModels.join(', ') || 'None found'}]. You can adjust GEMMA_MODEL in backend/.env.`,
        availableGemmaModels: gemmaModels,
      };
    } catch (err: any) {
      return {
        available: false,
        configuredModel: this.modelId,
        message: `Error verifying model access: ${err.message}`,
      };
    }
  }

  /**
   * Analyzes problem description and optional image.
   * Runs deterministic safety checks FIRST. If hazardous, safety restrictions are strictly applied.
   */
  public async analyzeProblem(input: ProblemInput): Promise<AIAnalysisOutput> {
    // 1. Run deterministic safety evaluation
    const safety: SafetyEvaluation = evaluateSafety(input.description, input.category);

    // If API key is not configured, give an honest, un-fabricated explanation
    if (!this.isConfigured() || !this.client) {
      throw new Error(
        'Google GenAI API key (GOOGLE_API_KEY) is not configured in backend/.env. Please configure your API key from Google AI Studio to run real Gemma 4 analysis.'
      );
    }

    const systemPrompt = `You are WorkForce AI, an expert household maintenance and repair diagnostic assistant powered by Gemma.
Analyze the user's reported problem description and any attached image carefully.

CRITICAL INSTRUCTIONS:
1. Explain that your results are preliminary possibilities and observations, NOT guaranteed diagnoses.
2. An on-site inspection by a qualified professional is always required to confirm the cause and cost.
3. Recommend only relevant trades/skills (e.g., "plumbing", "electrical", "carpentry", "appliance_repair", "painting", "masonry", "cleaning", "general_maintenance").
4. If there is any safety hazard (gas, sparks, active electrical faults, structural cracks), flag severity as "high" or "emergency", set requiresProfessional=true, and disallow DIY repair.
5. Return ONLY a single valid JSON object matching the required schema. Do NOT include markdown code blocks (no \`\`\`json), no trailing text.

REQUIRED JSON FORMAT:
{
  "problemSummary": "Concise summary of the reported problem",
  "observations": ["Observed symptom 1", "Observed symptom 2"],
  "possibleCauses": [
    {
      "cause": "Possible cause name",
      "reason": "Detailed explanation of why this cause fits the observations",
      "likelihood": "low | medium | high",
      "requiresInspection": true
    }
  ],
  "recommendedSkills": ["plumbing"],
  "severity": "low | medium | high | emergency",
  "uncertainty": "What cannot be definitively diagnosed remotely without on-site testing",
  "diyEligibility": "allowed | limited | not_allowed",
  "basicChecks": ["Safe non-invasive visual check"],
  "safetyWarnings": ["Safety guideline or warning"],
  "requiresProfessional": true,
  "inspectionQuestions": ["Key question for the professional to inspect on site"],
  "estimatedCostCategory": "low | medium | high | requires_inspection"
}`;

    const userPrompt = `Problem Description: ${input.description}
Service Category: ${input.category || 'Not specified'}
Locality: ${input.locality || 'Not specified'}`;

    const contents: any[] = [
      { text: `${systemPrompt}\n\n${userPrompt}` },
    ];

    // Attach image if provided
    if (input.imageBuffer && input.imageMimeType) {
      contents.push({
        inlineData: {
          mimeType: input.imageMimeType,
          data: input.imageBuffer.toString('base64'),
        },
      });
    }

    let responseText = '';
    try {
      const response = await this.client.models.generateContent({
        model: this.modelId,
        contents,
        config: {
          temperature: 0.2, // Low temperature for consistent structured reasoning
        },
      });

      responseText = response.text || '';
    } catch (err: any) {
      console.error(`[GemmaService] API call failed on model ${this.modelId}:`, err);
      throw new Error(`Gemma 4 API error (${this.modelId}): ${err.message}`);
    }

    if (!responseText.trim()) {
      throw new Error('Gemma 4 returned an empty response.');
    }

    // Clean markdown code fence if model wrapped output in ```json ... ```
    const cleanJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[GemmaService] Failed to parse model output as JSON. Raw output:', responseText);
      throw new Error('Gemma 4 returned malformed JSON output that could not be parsed.');
    }

    // Validate with Zod
    const validation = aiAnalysisOutputSchema.safeParse(parsed);
    if (!validation.success) {
      console.error('[GemmaService] Schema validation errors:', validation.error.format());
      throw new Error(`Gemma 4 output did not meet the required schema: ${validation.error.message}`);
    }

    const result = validation.data;

    // Apply deterministic safety overrides (Backend safety gate)
    if (safety.isDangerous) {
      result.severity = safety.severity;
      result.diyEligibility = 'not_allowed';
      result.requiresProfessional = true;
      // Merge deterministic safety warnings at the front
      result.safetyWarnings = Array.from(
        new Set([...safety.safetyWarnings, ...safety.protectiveActions, ...result.safetyWarnings])
      );
      // Remove any dangerous checks
      result.basicChecks = safety.protectiveActions;
    }

    return result;
  }
}

export const gemmaService = new GemmaService();

import { z } from 'zod';

const recordSchema = z.record(z.any());

const riskFactorSchema = z.object({
  id: z.string().min(1, 'Identificador do fator de risco obrigatorio'),
  description: z.string().min(1, 'Descricao do fator de risco obrigatoria'),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});

const recommendationSchema = z.object({
  id: z.string().min(1, 'Identificador da recomendacao obrigatorio'),
  description: z.string().min(1, 'Descricao da recomendacao obrigatoria'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const startAnamnesisSchema = z.object({
  consultationId: z.string().uuid('Consulta invalida'),
  patientId: z.string().uuid('Paciente invalido'),
  professionalId: z.string().uuid('Profissional invalido'),
  totalSteps: z.number().int().positive().max(50).optional(),
  initialStep: z.number().int().positive().optional(),
  formData: recordSchema.optional(),
});

export type StartAnamnesisSchema = z.infer<typeof startAnamnesisSchema>;

export const saveAnamnesisStepSchema = z.object({
  key: z.string().min(1, 'Chave do step obrigatoria'),
  payload: recordSchema,
  completed: z.boolean().optional(),
  hasErrors: z.boolean().optional(),
  validationScore: z.number().min(0).max(100).optional(),
});

export type SaveAnamnesisStepSchema = z.infer<typeof saveAnamnesisStepSchema>;

export const saveTherapeuticPlanSchema = z.object({
  clinicalReasoning: z.string().optional(),
  summary: z.string().optional(),
  therapeuticPlan: recordSchema.optional(),
  riskFactors: z.array(riskFactorSchema).optional(),
  recommendations: z.array(recommendationSchema).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reviewRequired: z.boolean().optional(),
  generatedAt: z.string().datetime({ message: 'Data de geracao invalida' }),
});

export type SaveTherapeuticPlanSchema = z.infer<typeof saveTherapeuticPlanSchema>;

export const savePlanFeedbackSchema = z.object({
  approvalStatus: z.enum(['approved', 'modified', 'rejected']),
  liked: z.boolean().optional(),
  feedbackComment: z.string().optional(),
});

export type SavePlanFeedbackSchema = z.infer<typeof savePlanFeedbackSchema>;

export const createAttachmentSchema = z.object({
  stepNumber: z.number().int().positive().optional(),
  fileName: z.string().min(1, 'Nome do arquivo obrigatorio'),
  mimeType: z.string().min(1, 'Tipo MIME obrigatorio'),
  size: z.number().int().nonnegative('Tamanho invalido'),
  storagePath: z.string().min(1, 'Caminho do arquivo obrigatorio'),
});

export type CreateAttachmentSchema = z.infer<typeof createAttachmentSchema>;

const toBoolean = z
  .union([z.string(), z.boolean()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = value.trim().toLowerCase();
    if (['true', '1'].includes(normalized)) {
      return true;
    }
    if (['false', '0'].includes(normalized)) {
      return false;
    }
    return undefined;
  })
  .optional();

const toArray = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value) {
      return undefined;
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  })
  .optional();

export const getAnamnesisQuerySchema = z.object({
  includeSteps: toBoolean,
  includeLatestPlan: toBoolean,
  includeAttachments: toBoolean,
});

export type GetAnamnesisQuerySchema = z.infer<typeof getAnamnesisQuerySchema>;

export const listAnamnesesQuerySchema = z.object({
  status: toArray,
  professionalId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ListAnamnesesQuerySchema = z.infer<typeof listAnamnesesQuerySchema>;

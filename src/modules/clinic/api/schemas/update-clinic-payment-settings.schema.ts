import { z } from 'zod';

const splitRuleSchema = z.object({
  recipient: z.enum(['taxes', 'gateway', 'clinic', 'professional', 'platform']),
  percentage: z.number().min(0),
  order: z.number().int().min(0),
});

const antifraudSchema = z
  .object({
    enabled: z.boolean(),
    provider: z.string().optional(),
    thresholdAmount: z.number().nonnegative().optional(),
  })
  .optional();

const inadimplencySchema = z
  .object({
    gracePeriodDays: z.number().int().nonnegative(),
    penaltyPercentage: z.number().min(0).max(100).optional(),
    dailyInterestPercentage: z.number().min(0).max(100).optional(),
    maxRetries: z.number().int().nonnegative().optional(),
    actions: z.array(z.string().min(1)).default([]),
  })
  .optional();

const refundPolicySchema = z.object({
  type: z.enum(['automatic', 'manual', 'partial']),
  processingTimeHours: z.number().int().nonnegative(),
  feePercentage: z.number().min(0).max(100).optional(),
  allowPartialRefund: z.boolean(),
});

const cancellationPolicySchema = z.object({
  type: z.enum(['free', 'percentage', 'no_refund']),
  windowMinutes: z.number().int().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
});

export const updateClinicPaymentSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  paymentSettings: z.object({
    provider: z.enum(['asaas']),
    credentialsId: z.string().min(1),
    sandboxMode: z.boolean(),
    splitRules: z.array(splitRuleSchema),
    roundingStrategy: z.enum(['half_even']),
    antifraud: antifraudSchema,
    inadimplencyRule: inadimplencySchema,
    refundPolicy: refundPolicySchema,
    cancellationPolicies: z.array(cancellationPolicySchema),
    bankAccountId: z.string().optional(),
  }),
});

export type UpdateClinicPaymentSettingsSchema = z.infer<typeof updateClinicPaymentSettingsSchema>;

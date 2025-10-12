import { z } from 'zod';

import { ClinicPaymentSettings } from '../../../domain/clinic/types/clinic.types';

const splitRuleSchema = z.object({
  recipient: z.enum(['taxes', 'gateway', 'clinic', 'professional', 'platform']),
  percentage: z.number(),
  order: z.number().int(),
});

const antifraudSchema = z
  .object({
    enabled: z.boolean().default(false),
    provider: z.string().optional(),
    thresholdAmount: z.number().optional(),
  })
  .default({ enabled: false });

const inadimplencySchema = z
  .object({
    gracePeriodDays: z.number().int().nonnegative().default(0),
    penaltyPercentage: z.number().optional(),
    dailyInterestPercentage: z.number().optional(),
    maxRetries: z.number().int().nonnegative().optional(),
    actions: z.array(z.string()).default([]),
  })
  .default({ gracePeriodDays: 0, actions: [] });

const refundPolicySchema = z
  .object({
    type: z.enum(['automatic', 'manual', 'partial']).default('manual'),
    processingTimeHours: z.number().int().nonnegative().default(0),
    feePercentage: z.number().optional(),
    allowPartialRefund: z.boolean().default(false),
  })
  .default({ type: 'manual', processingTimeHours: 0, allowPartialRefund: false });

const cancellationPolicySchema = z.object({
  type: z.enum(['free', 'percentage', 'no_refund']),
  windowMinutes: z.number().int().nonnegative().optional(),
  percentage: z.number().optional(),
  message: z.string().optional(),
});

const paymentSettingsSchema = z.object({
  provider: z.literal('asaas'),
  credentialsId: z.string().min(1),
  sandboxMode: z.boolean().default(false),
  splitRules: z.array(splitRuleSchema).default([]),
  roundingStrategy: z.literal('half_even').default('half_even'),
  antifraud: antifraudSchema,
  inadimplencyRule: inadimplencySchema,
  refundPolicy: refundPolicySchema,
  cancellationPolicies: z.array(cancellationPolicySchema).default([]),
  bankAccountId: z.string().optional(),
});

export function parseClinicPaymentSettings(payload: unknown): ClinicPaymentSettings {
  const result = paymentSettingsSchema.parse(payload);

  return {
    provider: result.provider,
    credentialsId: result.credentialsId,
    sandboxMode: result.sandboxMode,
    splitRules: result.splitRules.map((rule) => ({
      recipient: rule.recipient,
      percentage: rule.percentage,
      order: rule.order,
    })),
    roundingStrategy: result.roundingStrategy,
    antifraud: {
      enabled: result.antifraud.enabled,
      provider: result.antifraud.provider,
      thresholdAmount: result.antifraud.thresholdAmount,
    },
    inadimplencyRule: {
      gracePeriodDays: result.inadimplencyRule.gracePeriodDays,
      penaltyPercentage: result.inadimplencyRule.penaltyPercentage,
      dailyInterestPercentage: result.inadimplencyRule.dailyInterestPercentage,
      maxRetries: result.inadimplencyRule.maxRetries,
      actions: result.inadimplencyRule.actions,
    },
    refundPolicy: {
      type: result.refundPolicy.type,
      processingTimeHours: result.refundPolicy.processingTimeHours,
      feePercentage: result.refundPolicy.feePercentage,
      allowPartialRefund: result.refundPolicy.allowPartialRefund,
    },
    cancellationPolicies: result.cancellationPolicies.map((policy) => ({
      type: policy.type,
      windowMinutes: policy.windowMinutes,
      percentage: policy.percentage,
      message: policy.message,
    })),
    bankAccountId: result.bankAccountId,
  };
}

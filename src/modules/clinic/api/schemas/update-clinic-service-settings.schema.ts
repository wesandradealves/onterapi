import { z } from 'zod';

const serviceCancellationSchema = z
  .object({
    type: z.enum(['free', 'percentage', 'no_refund']),
    windowMinutes: z.number().int().nonnegative().optional(),
    percentage: z.number().int().min(0).max(100).optional(),
    message: z.string().optional(),
  })
  .optional();

const serviceEligibilitySchema = z
  .object({
    allowNewPatients: z.boolean(),
    allowExistingPatients: z.boolean(),
    minimumAge: z.number().int().nonnegative().optional(),
    maximumAge: z.number().int().nonnegative().optional(),
    allowedTags: z.array(z.string().min(1)).optional(),
  })
  .optional();

const serviceSchema = z.object({
  serviceTypeId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
  currency: z.enum(['BRL', 'USD', 'EUR']),
  isActive: z.boolean(),
  requiresAnamnesis: z.boolean(),
  enableOnlineScheduling: z.boolean(),
  minAdvanceMinutes: z.number().int().nonnegative(),
  maxAdvanceMinutes: z.number().int().positive().optional(),
  cancellationPolicy: serviceCancellationSchema,
  eligibility: serviceEligibilitySchema,
  color: z.string().optional(),
  instructions: z.string().optional(),
  requiredDocuments: z.array(z.string().min(1)).optional(),
});

export const updateClinicServiceSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  serviceSettings: z.object({
    services: z.array(serviceSchema),
  }),
});

export type UpdateClinicServiceSettingsSchema = z.infer<typeof updateClinicServiceSettingsSchema>;

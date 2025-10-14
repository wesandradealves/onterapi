import { z } from 'zod';

const clinicRoleQuotaSchema = z.object({
  role: z.enum(['CLINIC_OWNER', 'MANAGER', 'PROFESSIONAL', 'SECRETARY']),
  limit: z.number().int().positive(),
});

export const updateClinicTeamSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  teamSettings: z.object({
    quotas: z.array(clinicRoleQuotaSchema).min(1),
    allowExternalInvitations: z.boolean(),
    defaultMemberStatus: z
      .enum(['pending_invitation', 'active', 'inactive', 'suspended'])
      .default('pending_invitation'),
    requireFinancialClearance: z.boolean().default(false),
  }),
});

export type UpdateClinicTeamSettingsSchema = z.infer<typeof updateClinicTeamSettingsSchema>;

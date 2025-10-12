import { z } from 'zod';

export const listClinicMembersSchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z
    .preprocess((value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim());
      }
      return undefined;
    }, z.array(z.enum(['pending_invitation', 'active', 'inactive', 'suspended'])).optional())
    .optional(),
  roles: z
    .preprocess((value) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim());
      }
      return undefined;
    }, z.array(z.enum(['CLINIC_OWNER', 'MANAGER', 'PROFESSIONAL', 'SECRETARY'])).optional())
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListClinicMembersSchema = z.infer<typeof listClinicMembersSchema>;

export const manageClinicMemberSchema = z.object({
  tenantId: z.string().uuid(),
  status: z.enum(['pending_invitation', 'active', 'inactive', 'suspended']).optional(),
  role: z.enum(['CLINIC_OWNER', 'MANAGER', 'PROFESSIONAL', 'SECRETARY']).optional(),
  scope: z.array(z.string()).optional(),
});

export type ManageClinicMemberSchema = z.infer<typeof manageClinicMemberSchema>;

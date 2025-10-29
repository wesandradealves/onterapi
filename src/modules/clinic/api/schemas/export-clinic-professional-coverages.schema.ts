import { z } from 'zod';

const uuid = z.string().uuid();
const statusesEnum = z.enum(['scheduled', 'active', 'completed', 'cancelled']);

const toArray = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim());
  }

  return undefined;
};

export const exportClinicProfessionalCoveragesSchema = z.object({
  tenantId: uuid.optional(),
  clinicId: uuid.optional(),
  clinicIds: z.preprocess(toArray, z.array(uuid).max(200).optional()).optional(),
  professionalId: uuid.optional(),
  coverageProfessionalId: uuid.optional(),
  statuses: z
    .preprocess((value) => {
      const entries = toArray(value);
      if (!entries) {
        return undefined;
      }
      return Array.isArray(entries) ? entries.map((entry) => entry.trim()) : undefined;
    }, z.array(statusesEnum).optional())
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  includeCancelled: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value === 'string') {
        return value === 'true';
      }
      return Boolean(value);
    }, z.boolean().optional())
    .optional(),
  page: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().int().positive().optional())
    .optional(),
  limit: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().int().positive().max(200).optional())
    .optional(),
});

export type ExportClinicProfessionalCoveragesSchema = z.infer<
  typeof exportClinicProfessionalCoveragesSchema
>;

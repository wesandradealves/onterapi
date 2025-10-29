import { z } from 'zod';

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime();

export const createClinicProfessionalCoverageSchema = z.object({
  tenantId: uuid.optional(),
  professionalId: uuid,
  coverageProfessionalId: uuid,
  startAt: isoDateTime,
  endAt: isoDateTime,
  reason: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateClinicProfessionalCoverageSchema = z.infer<
  typeof createClinicProfessionalCoverageSchema
>;

const statusesEnum = z.enum(['scheduled', 'active', 'completed', 'cancelled']);

const parseArrayParam = (value: unknown) => {
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim());
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim());
  }
  return undefined;
};

export const listClinicProfessionalCoveragesSchema = z.object({
  tenantId: uuid.optional(),
  professionalId: uuid.optional(),
  coverageProfessionalId: uuid.optional(),
  statuses: z.preprocess(parseArrayParam, z.array(statusesEnum).max(4).optional()).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
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

export type ListClinicProfessionalCoveragesSchema = z.infer<
  typeof listClinicProfessionalCoveragesSchema
>;

export const cancelClinicProfessionalCoverageSchema = z.object({
  tenantId: uuid.optional(),
  cancellationReason: z.string().max(255).optional(),
});

export type CancelClinicProfessionalCoverageSchema = z.infer<
  typeof cancelClinicProfessionalCoverageSchema
>;

import { z } from 'zod';

export const legalTermStatusEnum = z.enum(['published', 'draft', 'retired', 'all']);

export const listLegalTermsSchema = z.object({
  context: z.string().trim().min(1).max(64).optional(),
  tenantId: z.string().uuid().optional(),
  status: legalTermStatusEnum.optional().default('all'),
});
export type ListLegalTermsSchema = z.infer<typeof listLegalTermsSchema>;

export const createLegalTermSchema = z.object({
  context: z.string().trim().min(1).max(64),
  version: z.string().trim().min(1).max(32),
  content: z.string().trim().min(1),
  tenantId: z.string().uuid().optional(),
  publishNow: z.coerce.boolean().optional().default(false),
});
export type CreateLegalTermSchema = z.infer<typeof createLegalTermSchema>;

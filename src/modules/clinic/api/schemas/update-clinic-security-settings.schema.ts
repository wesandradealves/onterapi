import { z } from 'zod';

import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';

const roleSchema = z.nativeEnum(RolesEnum);

const ipListSchema = z
  .array(z.string().trim().min(1))
  .max(64)
  .default([])
  .transform((list) => list.filter((entry) => entry.length > 0));

const complianceStatusSchema = z.enum([
  'valid',
  'pending',
  'expired',
  'missing',
  'submitted',
  'review',
  'unknown',
]);

const complianceDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120).optional(),
  required: z.boolean().optional(),
  status: complianceStatusSchema.optional(),
  expiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateClinicSecuritySettingsSchema = z
  .object({
    tenantId: z.string().uuid(),
    securitySettings: z.object({
      twoFactor: z.object({
        enabled: z.boolean(),
        requiredRoles: z
          .array(roleSchema)
          .default([])
          .transform((roles) => Array.from(new Set(roles))),
        backupCodesEnabled: z.boolean(),
      }),
      passwordPolicy: z.object({
        minLength: z.number().int().min(6).max(128),
        requireUppercase: z.boolean(),
        requireLowercase: z.boolean(),
        requireNumbers: z.boolean(),
        requireSpecialCharacters: z.boolean(),
      }),
      session: z.object({
        idleTimeoutMinutes: z.number().int().min(5).max(1440),
        absoluteTimeoutMinutes: z.number().int().min(30).max(10080),
      }),
      loginAlerts: z.object({
        email: z.boolean(),
        whatsapp: z.boolean(),
      }),
      ipRestrictions: z.object({
        enabled: z.boolean(),
        allowlist: ipListSchema,
        blocklist: ipListSchema,
      }),
      audit: z.object({
        retentionDays: z.number().int().min(30).max(3650),
        exportEnabled: z.boolean(),
      }),
      compliance: z
        .object({
          documents: z
            .array(complianceDocumentSchema)
            .max(200)
            .default([])
            .transform((documents) => documents.filter((doc) => doc.type.trim().length > 0)),
        })
        .optional(),
      metadata: z.record(z.any()).optional(),
    }),
  })
  .superRefine((data, ctx) => {
    const session = data.securitySettings.session;
    if (session.absoluteTimeoutMinutes < session.idleTimeoutMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['securitySettings', 'session', 'absoluteTimeoutMinutes'],
        message: 'absoluteTimeoutMinutes deve ser maior ou igual a idleTimeoutMinutes',
      });
    }

    const documents = data.securitySettings.compliance?.documents;
    if (documents && documents.length > 0) {
      const seen = new Set<string>();
      documents.forEach((document, index) => {
        const key = `${document.type.toLowerCase()}::${document.id ?? ''}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['securitySettings', 'compliance', 'documents', index, 'type'],
            message: 'documento de compliance duplicado',
          });
        } else {
          seen.add(key);
        }
      });
    }
  });

export type UpdateClinicSecuritySettingsSchema = z.infer<typeof updateClinicSecuritySettingsSchema>;

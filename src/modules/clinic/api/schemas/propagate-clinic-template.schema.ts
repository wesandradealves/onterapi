import { z } from 'zod';

export const propagateClinicTemplateSchema = z.object({
  tenantId: z.string().uuid().optional(),
  targetClinicIds: z.array(z.string().uuid()).min(1),
  sections: z
    .array(
      z.enum([
        'general',
        'team',
        'schedule',
        'services',
        'payments',
        'integrations',
        'notifications',
        'security',
        'branding',
      ]),
    )
    .min(1),
  versionNotes: z.string().max(1000).optional(),
});

export type PropagateClinicTemplateSchema = z.infer<typeof propagateClinicTemplateSchema>;

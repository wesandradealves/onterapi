import { z } from 'zod';

const whatsappTemplateSchema = z.object({
  name: z.string().min(1),
  status: z.string().min(1),
  category: z.string().optional(),
  lastUpdatedAt: z.string().datetime().optional(),
});

const whatsappSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['evolution', 'meta']).optional(),
  businessNumber: z.string().min(1).optional(),
  instanceStatus: z.string().optional(),
  qrCodeUrl: z.string().url().optional(),
  templates: z.array(whatsappTemplateSchema).optional(),
  quietHours: z
    .object({
      start: z.string(),
      end: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
  webhookUrl: z.string().url().optional(),
});

const googleCalendarSchema = z.object({
  enabled: z.boolean(),
  syncMode: z.enum(['one_way', 'two_way']),
  conflictPolicy: z.enum(['onterapi_wins', 'google_wins', 'ask_user']),
  requireValidationForExternalEvents: z.boolean(),
  defaultCalendarId: z.string().optional(),
  hidePatientName: z.boolean().optional(),
  prefix: z.string().optional(),
});

const emailTrackingSchema = z
  .object({
    open: z.boolean(),
    click: z.boolean(),
    bounce: z.boolean(),
  })
  .optional();

const emailSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().min(1).optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  tracking: emailTrackingSchema,
  templates: z.array(z.string()).optional(),
});

const webhookSchema = z.object({
  event: z.string().min(1),
  url: z.string().url(),
  active: z.boolean(),
});

export const updateClinicIntegrationSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  integrationSettings: z.object({
    whatsapp: whatsappSchema.optional(),
    googleCalendar: googleCalendarSchema.optional(),
    email: emailSchema.optional(),
    webhooks: z.array(webhookSchema).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateClinicIntegrationSettingsSchema = z.infer<
  typeof updateClinicIntegrationSettingsSchema
>;

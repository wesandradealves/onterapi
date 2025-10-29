import { z } from 'zod';

const quietHoursSchema = z
  .object({
    start: z.string(),
    end: z.string(),
    timezone: z.string().optional(),
  })
  .optional();

const channelSchema = z.object({
  type: z.string().min(1),
  enabled: z.boolean(),
  defaultEnabled: z.boolean(),
  quietHours: quietHoursSchema,
});

const templateVariableSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
});

const templateSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  channel: z.string().min(1),
  version: z.string().min(1),
  active: z.boolean(),
  language: z.string().optional(),
  abGroup: z.string().optional(),
  variables: z.array(templateVariableSchema).default([]),
});

const ruleSchema = z.object({
  event: z.string().min(1),
  channels: z.array(z.string().min(1)).min(1),
  enabled: z.boolean(),
});

export const updateClinicNotificationSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  notificationSettings: z.object({
    channels: z.array(channelSchema),
    templates: z.array(templateSchema),
    rules: z.array(ruleSchema),
    quietHours: quietHoursSchema,
    events: z.array(z.string().min(1)).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UpdateClinicNotificationSettingsSchema = z.infer<
  typeof updateClinicNotificationSettingsSchema
>;

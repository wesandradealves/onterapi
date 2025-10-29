import { z } from 'zod';

const scheduleIntervalSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Intervalo deve estar no formato HH:MM' }),
  end: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Intervalo deve estar no formato HH:MM' }),
});

const scheduleWorkingDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  active: z.boolean(),
  intervals: z.array(scheduleIntervalSchema),
});

const scheduleExceptionPeriodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  appliesTo: z.enum(['clinic', 'professional', 'resource']),
  start: z.string().datetime(),
  end: z.string().datetime(),
  resourceIds: z.array(z.string().min(1)).optional(),
});

const scheduleHolidaySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  date: z.string().datetime(),
  scope: z.enum(['national', 'state', 'city', 'local']),
});

export const updateClinicScheduleSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  scheduleSettings: z.object({
    timezone: z.string().min(1),
    workingDays: z.array(scheduleWorkingDaySchema),
    exceptionPeriods: z.array(scheduleExceptionPeriodSchema).optional(),
    holidays: z.array(scheduleHolidaySchema).optional(),
    autosaveIntervalSeconds: z.number().int().positive(),
    conflictResolution: z.enum(['server_wins', 'client_wins', 'merge', 'ask_user']),
  }),
});

export type UpdateClinicScheduleSettingsSchema = z.infer<typeof updateClinicScheduleSettingsSchema>;

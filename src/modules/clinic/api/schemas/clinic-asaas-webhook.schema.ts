import { z } from 'zod';

export const clinicAsaasWebhookSchema = z
  .object({
    event: z.string().min(1),
    sandbox: z.boolean().optional(),
    payment: z
      .object({
        id: z.string().min(1),
        status: z.string().optional(),
        dueDate: z.string().optional(),
        paymentDate: z.string().optional(),
        customer: z.string().optional(),
        billingType: z.string().optional(),
        value: z.number().optional(),
        netValue: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type ClinicAsaasWebhookSchema = z.infer<typeof clinicAsaasWebhookSchema>;

import { z } from 'zod';

export const listClinicPaymentLedgersSchema = z.object({
  tenantId: z.string().uuid().optional(),
  paymentStatus: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    )
    .optional()
    .transform((statuses) => (statuses && statuses.length > 0 ? statuses : undefined))
    .refine(
      (statuses) =>
        !statuses ||
        statuses.every((status) =>
          ['approved', 'settled', 'refunded', 'chargeback', 'failed'].includes(status),
        ),
      {
        message:
          'paymentStatus deve conter valores válidos (approved, settled, refunded, chargeback, failed)',
      },
    ),
  from: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'from deve ser uma data válida',
    })
    .transform((value) => new Date(value))
    .optional(),
  to: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'to deve ser uma data válida',
    })
    .transform((value) => new Date(value))
    .optional(),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 100),
      {
        message: 'limit deve ser um inteiro positivo até 100',
      },
    )
    .optional(),
  offset: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value === undefined || (Number.isInteger(value) && value >= 0), {
      message: 'offset deve ser um inteiro maior ou igual a zero',
    })
    .optional(),
});

export type ListClinicPaymentLedgersSchema = z.infer<typeof listClinicPaymentLedgersSchema>;

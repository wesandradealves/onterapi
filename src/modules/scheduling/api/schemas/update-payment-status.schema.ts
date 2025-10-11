import { z } from 'zod';

import { paymentStatusEnum } from './create-booking.schema';

export const updatePaymentStatusSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  paymentStatus: paymentStatusEnum,
});

export type UpdatePaymentStatusSchema = z.infer<typeof updatePaymentStatusSchema>;

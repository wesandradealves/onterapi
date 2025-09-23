import { z } from 'zod';

export const updatePatientSchema = z.object({
  fullName: z.string().min(3).optional(),
  shortName: z.string().optional(),
  status: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  zipCode: z.string().length(8).optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  observations: z.string().optional(),
  tags: z.array(z.string()).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  professionalId: z.string().uuid().optional().or(z.null()),
});

export type UpdatePatientSchema = z.infer<typeof updatePatientSchema>;

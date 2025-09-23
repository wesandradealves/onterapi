import { z } from 'zod';

export const createPatientSchema = z.object({
  fullName: z.string().min(3, 'Nome é obrigatório'),
  cpf: z.string().regex(/^[0-9]{11}$/g, 'CPF inválido'),
  birthDate: z.string().datetime().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
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
  professionalId: z.string().uuid().optional(),
  status: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});

export type CreatePatientSchema = z.infer<typeof createPatientSchema>;

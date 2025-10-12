import { z } from 'zod';

const clinicDocumentSchema = z.object({
  type: z.enum(['cnpj', 'cpf', 'mei']),
  value: z.string().min(3),
});

const clinicAddressSchema = z.object({
  zipCode: z.string().min(3),
  street: z.string().min(1),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().optional(),
});

const clinicContactSchema = z.object({
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  socialLinks: z.array(z.string().url()).optional(),
});

export const updateClinicGeneralSettingsSchema = z.object({
  tenantId: z.string().uuid().optional(),
  generalSettings: z.object({
    tradeName: z.string().min(1),
    legalName: z.string().optional(),
    document: clinicDocumentSchema.optional(),
    stateRegistration: z.string().optional(),
    municipalRegistration: z.string().optional(),
    foundationDate: z.string().datetime().optional(),
    address: clinicAddressSchema,
    contact: clinicContactSchema,
    notes: z.string().optional(),
  }),
});

export type UpdateClinicGeneralSettingsSchema = z.infer<typeof updateClinicGeneralSettingsSchema>;

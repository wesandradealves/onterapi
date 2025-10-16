import { z } from 'zod';

export const timestampSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1).describe('N mero da p gina'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Itens por p gina'),
  orderBy: z.string().optional().describe('Campo para ordena  o'),
  order: z.enum(['ASC', 'DESC']).default('DESC').describe('Dire  o da ordena  o'),
});

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    meta: z.object({
      total: z.number().describe('Total de registros'),
      page: z.number().describe('P gina atual'),
      limit: z.number().describe('Itens por p gina'),
      totalPages: z.number().describe('Total de p ginas'),
      hasNext: z.boolean().describe('Tem pr xima p gina'),
      hasPrevious: z.boolean().describe('Tem p gina anterior'),
    }),
  });

export const commonHeadersSchema = z.object({
  'x-tenant-id': z.string().uuid().describe('ID do tenant/cl nica'),
  'x-user-id': z.string().uuid().describe('ID do usuario autenticado'),
  'x-request-id': z.string().uuid().optional().describe('ID  nico da requisi  o'),
  'x-api-key': z.string().optional().describe('Chave de API para integra  es'),
});

export const addressSchema = z.object({
  zipCode: z
    .string()
    .regex(/^\d{8}$/)
    .describe('CEP sem formata  o'),
  street: z.string().min(1).max(255).describe('Logradouro'),
  number: z.string().min(1).max(20).describe('N mero'),
  complement: z.string().max(100).optional().nullable().describe('Complemento'),
  district: z.string().min(1).max(100).describe('Bairro'),
  city: z.string().min(1).max(100).describe('Cidade'),
  state: z.string().length(2).describe('UF'),
  country: z.string().default('Brasil').describe('Pa s'),
  latitude: z.number().min(-90).max(90).optional().describe('Latitude'),
  longitude: z.number().min(-180).max(180).optional().describe('Longitude'),
});

export const contactSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .describe('Telefone/Celular'),
  email: z.string().email().toLowerCase().describe('Email'),
  whatsapp: z
    .string()
    .regex(/^\d{10,11}$/)
    .optional()
    .describe('WhatsApp'),
});

export const errorResponseSchema = z.object({
  statusCode: z.number().describe('C digo HTTP do erro'),
  message: z.string().describe('Mensagem de erro'),
  error: z.string().optional().describe('Tipo do erro'),
  timestamp: z.string().datetime().describe('Momento do erro'),
  path: z.string().describe('Endpoint que gerou o erro'),
  details: z.array(z.string()).optional().describe('Detalhes adicionais'),
});

export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean().default(true),
    message: z.string().optional(),
    data: dataSchema,
  });

export const softDeleteSchema = z.object({
  isActive: z.boolean().default(true).describe('Registro ativo'),
  deletedAt: z.string().datetime().nullable().optional().describe('Data de exclus o'),
  deletedBy: z.string().uuid().nullable().optional().describe('Usuario que excluiu'),
});

export const auditSchema = z.object({
  createdBy: z.string().uuid().describe('Usuario que criou'),
  updatedBy: z.string().uuid().optional().describe('Ultimo usuario que atualizou'),
  createdAt: z.string().datetime().describe('Data de criacao'),
  updatedAt: z.string().datetime().describe('Data da ultima atualizacao'),
  version: z.number().default(1).describe('Versao do registro para controle de concorrencia'),
});

export const searchFiltersSchema = z.object({
  search: z.string().optional().describe('Termo de busca geral'),
  startDate: z.string().datetime().optional().describe('Data inicial'),
  endDate: z.string().datetime().optional().describe('Data final'),
  status: z.string().optional().describe('Status do registro'),
  isActive: z.boolean().optional().describe('Apenas ativos'),
});

export const tenantSchema = z.object({
  tenantId: z.string().uuid().describe('ID do tenant/cl nica'),
  tenantName: z.string().optional().describe('Nome do tenant'),
  tenantDomain: z.string().optional().describe('Dom nio do tenant'),
});

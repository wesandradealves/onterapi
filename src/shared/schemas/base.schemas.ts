import { z } from 'zod';

/**
 * Schema base para entidades com timestamps
 */
export const timestampSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

/**
 * Schema base para paginação de requests
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1).describe('Número da página'),
  limit: z.coerce.number().min(1).max(100).default(20).describe('Itens por página'),
  orderBy: z.string().optional().describe('Campo para ordenação'),
  order: z.enum(['ASC', 'DESC']).default('DESC').describe('Direção da ordenação'),
});

/**
 * Schema base para response paginado
 */
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    meta: z.object({
      total: z.number().describe('Total de registros'),
      page: z.number().describe('Página atual'),
      limit: z.number().describe('Itens por página'),
      totalPages: z.number().describe('Total de páginas'),
      hasNext: z.boolean().describe('Tem próxima página'),
      hasPrevious: z.boolean().describe('Tem página anterior'),
    }),
  });

/**
 * Schema para headers comuns
 */
export const commonHeadersSchema = z.object({
  'x-tenant-id': z.string().uuid().describe('ID do tenant/clínica'),
  'x-user-id': z.string().uuid().describe('ID do usuário autenticado'),
  'x-request-id': z.string().uuid().optional().describe('ID único da requisição'),
  'x-api-key': z.string().optional().describe('Chave de API para integrações'),
});

/**
 * Schema para endereço brasileiro
 */
export const addressSchema = z.object({
  zipCode: z.string().regex(/^\d{8}$/).describe('CEP sem formatação'),
  street: z.string().min(1).max(255).describe('Logradouro'),
  number: z.string().min(1).max(20).describe('Número'),
  complement: z.string().max(100).optional().nullable().describe('Complemento'),
  district: z.string().min(1).max(100).describe('Bairro'),
  city: z.string().min(1).max(100).describe('Cidade'),
  state: z.string().length(2).describe('UF'),
  country: z.string().default('Brasil').describe('País'),
  latitude: z.number().min(-90).max(90).optional().describe('Latitude'),
  longitude: z.number().min(-180).max(180).optional().describe('Longitude'),
});

/**
 * Schema para dados de contato
 */
export const contactSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/).describe('Telefone/Celular'),
  email: z.string().email().toLowerCase().describe('Email'),
  whatsapp: z.string().regex(/^\d{10,11}$/).optional().describe('WhatsApp'),
});

/**
 * Schema para response de erro
 */
export const errorResponseSchema = z.object({
  statusCode: z.number().describe('Código HTTP do erro'),
  message: z.string().describe('Mensagem de erro'),
  error: z.string().optional().describe('Tipo do erro'),
  timestamp: z.string().datetime().describe('Momento do erro'),
  path: z.string().describe('Endpoint que gerou o erro'),
  details: z.array(z.string()).optional().describe('Detalhes adicionais'),
});

/**
 * Schema para response de sucesso
 */
export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean().default(true),
    message: z.string().optional(),
    data: dataSchema,
  });

/**
 * Schema para soft delete
 */
export const softDeleteSchema = z.object({
  isActive: z.boolean().default(true).describe('Registro ativo'),
  deletedAt: z.string().datetime().nullable().optional().describe('Data de exclusão'),
  deletedBy: z.string().uuid().nullable().optional().describe('Usuário que excluiu'),
});

/**
 * Schema para auditoria
 */
export const auditSchema = z.object({
  createdBy: z.string().uuid().describe('Usuário que criou'),
  updatedBy: z.string().uuid().optional().describe('Último usuário que atualizou'),
  createdAt: z.string().datetime().describe('Data de criação'),
  updatedAt: z.string().datetime().describe('Data da última atualização'),
  version: z.number().default(1).describe('Versão do registro para controle de concorrência'),
});

/**
 * Schema para filtros de busca
 */
export const searchFiltersSchema = z.object({
  search: z.string().optional().describe('Termo de busca geral'),
  startDate: z.string().datetime().optional().describe('Data inicial'),
  endDate: z.string().datetime().optional().describe('Data final'),
  status: z.string().optional().describe('Status do registro'),
  isActive: z.boolean().optional().describe('Apenas ativos'),
});

/**
 * Schema para multi-tenant
 */
export const tenantSchema = z.object({
  tenantId: z.string().uuid().describe('ID do tenant/clínica'),
  tenantName: z.string().optional().describe('Nome do tenant'),
  tenantDomain: z.string().optional().describe('Domínio do tenant'),
});
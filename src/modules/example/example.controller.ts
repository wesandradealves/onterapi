import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodInputValidation } from '@shared/decorators/zod.decorator';
import { ZodResponse } from '@shared/decorators/zod-response.decorator';

// Exemplo de schema com validação
const createExampleSchema = z.object({
  name: z.string().min(3).max(100).describe('Nome do exemplo'),
  description: z.string().optional().describe('Descrição opcional'),
  age: z.number().min(0).max(150).describe('Idade'),
  email: z.string().email().describe('Email válido'),
});

const exampleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  age: z.number(),
  email: z.string(),
  createdAt: z.string().datetime(),
});

type CreateExampleInput = z.infer<typeof createExampleSchema>;
type ExampleResponse = z.infer<typeof exampleResponseSchema>;

@ApiTags('Examples')
@Controller('examples')
export class ExampleController {
  @Post()
  @ApiOperation({ 
    summary: 'Criar exemplo',
    description: 'Endpoint de exemplo para demonstrar validação com Zod' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 100 },
        description: { type: 'string', nullable: true },
        age: { type: 'number', minimum: 0, maximum: 150 },
        email: { type: 'string', format: 'email' },
      },
      required: ['name', 'age', 'email'],
    },
  })
  @ZodResponse({ schema: exampleResponseSchema })
  async create(
    @ZodInputValidation({ body: createExampleSchema })
    @Body() data: CreateExampleInput,
  ): Promise<ExampleResponse> {
    // Simulação de criação
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...data,
      description: data.description || null,
      createdAt: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar exemplo por ID' })
  @ZodResponse({ schema: exampleResponseSchema })
  async findById(
    @ZodInputValidation({ 
      params: z.object({ 
        id: z.string().uuid('ID deve ser um UUID válido') 
      })
    })
    @Param('id') id: string,
  ): Promise<ExampleResponse> {
    // Simulação de busca
    return {
      id,
      name: 'Exemplo',
      description: 'Descrição do exemplo',
      age: 30,
      email: 'exemplo@onterapi.com.br',
      createdAt: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar exemplos' })
  @ZodResponse({ 
    schema: exampleResponseSchema,
    isArray: true,
  })
  async list(): Promise<ExampleResponse[]> {
    return [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Exemplo 1',
        description: 'Primeiro exemplo',
        age: 25,
        email: 'exemplo1@onterapi.com.br',
        createdAt: new Date().toISOString(),
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Exemplo 2',
        description: null,
        age: 35,
        email: 'exemplo2@onterapi.com.br',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
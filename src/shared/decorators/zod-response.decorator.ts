import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ZodType as ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const ZodResponse = (options: {
  schema: ZodSchema;
  status?: HttpStatus;
  description?: string;
  isArray?: boolean;
}) => {
  const {
    schema,
    status = HttpStatus.OK,
    description = 'Successful response',
    isArray = false,
  } = options;

  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });

  const responseSchema = isArray
    ? {
        type: 'array',
        items: jsonSchema,
      }
    : jsonSchema;

  return applyDecorators(
    ApiResponse({
      status,
      description,
      content: {
        'application/json': {
          schema: responseSchema as never,
        },
      },
    }),
  );
};

export const ZodResponses = (
  responses: Array<{
    schema: ZodSchema;
    status: HttpStatus;
    description: string;
    isArray?: boolean;
  }>,
) => {
  const decorators = responses.map((response) =>
    ZodResponse({
      schema: response.schema,
      status: response.status,
      description: response.description,
      isArray: response.isArray,
    }),
  );

  return applyDecorators(...decorators);
};

export const ZodPaginatedResponse = (options: { schema: ZodSchema; description?: string }) => {
  const { schema, description = 'Paginated response' } = options;

  const paginatedSchema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: zodToJsonSchema(schema, {
          target: 'openApi3',
          $refStrategy: 'none',
        }),
      },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          page: { type: 'number' },
          limit: { type: 'number' },
          totalPages: { type: 'number' },
          hasNext: { type: 'boolean' },
          hasPrevious: { type: 'boolean' },
        },
      },
    },
  };

  return applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description,
      content: {
        'application/json': {
          schema: paginatedSchema as never,
        },
      },
    }),
  );
};

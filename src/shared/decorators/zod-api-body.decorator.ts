import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ZodType as ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const ZodApiBody = (options: {
  schema: ZodSchema;
  description?: string;
  required?: boolean;
  contentType?: string;
}) => {
  const {
    schema,
    description = 'Request payload',
    required = true,
    contentType = 'application/json',
  } = options;

  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  });

  const decorators = [
    ApiBody({
      description,
      required,
      schema: jsonSchema as SchemaObject,
    }),
  ];

  if (contentType && contentType !== 'application/json') {
    decorators.unshift(ApiConsumes(contentType));
  }

  return applyDecorators(...decorators);
};

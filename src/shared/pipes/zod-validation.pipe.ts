import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Pipe para validação usando Zod schemas
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const field = err.path.join('.');
          return `${field}: ${err.message}`;
        });
        
        // Log para debug
        console.error('Zod Validation Errors:', errorMessages);
        console.error('Input value:', value);
        
        throw new BadRequestException(errorMessages);
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
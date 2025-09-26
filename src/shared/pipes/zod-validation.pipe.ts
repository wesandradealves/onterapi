import { ArgumentMetadata, BadRequestException, Logger, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const shouldValidate = ['body', 'query', 'param'].includes(metadata.type as string);

    if (!shouldValidate) {
      return value;
    }

    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const field = err.path.join('.');
          return `${field}: ${err.message}`;
        });

        this.logger.error(`Zod validation errors: ${errorMessages.join(' | ')}`);

        throw new BadRequestException(errorMessages);
      }
      throw new BadRequestException('Validation failed');
    }
  }
}

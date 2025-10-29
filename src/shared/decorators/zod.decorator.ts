import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ZodType as ZodSchema } from 'zod';

interface Schemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

enum ErrorPrefix {
  body = 'Erro ao validar o corpo da requisi  o',
  query = 'Erro ao validar os par metros de query',
  params = 'Erro ao validar os par metros de rota',
  headers = 'Erro ao validar os headers',
}

export const ZodInputValidation = (schemas: Schemas) => {
  return createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const logger = new Logger('ZodValidation');

    const validationTargets: (keyof Schemas)[] = ['body', 'query', 'params', 'headers'];

    for (const target of validationTargets) {
      if (schemas[target] && request[target]) {
        const payload = request[target];
        const validation = schemas[target]!.safeParse(payload);

        if (!validation.success) {
          const errorMessage = validation.error.issues
            .map((error) => {
              const path = error.path.join('.');
              return `${path ? path + ': ' : ''}${error.message}`;
            })
            .join('; ');

          logger.error(`${ErrorPrefix[target]} - ${errorMessage}`, {
            target,
            errors: validation.error.issues,
            payload,
          });

          throw new BadRequestException({
            message: ErrorPrefix[target],
            errors: validation.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            })),
          });
        }

        request[target] = validation.data;
      }
    }

    return request;
  })();
};

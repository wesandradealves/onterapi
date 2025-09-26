import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type HttpExceptionObject = {
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
};

function toStringMessage(message: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return typeof message === 'string' && message.trim() ? message : fallback;
}

@Catch()
export default class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as HttpExceptionObject;
        message = toStringMessage(body.message, exception.message);
        error = typeof body.error === 'string' && body.error.trim() ? body.error : exception.name;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    this.logger.error(
      `HTTP ${status} Error: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    });
  }
}

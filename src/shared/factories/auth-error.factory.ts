import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AUTH_MESSAGES } from '../constants/auth.constants';

export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  TOKEN_NOT_PROVIDED = 'TOKEN_NOT_PROVIDED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ID_NOT_FOUND = 'USER_ID_NOT_FOUND',
  USER_NOT_AUTHENTICATED = 'USER_NOT_AUTHENTICATED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_2FA_CODE = 'INVALID_2FA_CODE',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  EMAIL_SEND_ERROR = 'EMAIL_SEND_ERROR',
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  METHOD_NOT_IMPLEMENTED = 'METHOD_NOT_IMPLEMENTED',
}

interface AuthErrorContext {
  userId?: string;
  email?: string;
  tenantId?: string;
  attemptCount?: number;
  [key: string]: any;
}

export class AuthErrorFactory {
  private static readonly logger = new Logger('AuthErrorFactory');

  static create(
    type: AuthErrorType,
    context?: AuthErrorContext,
    originalError?: Error,
  ): HttpException {
    this.logError(type, context, originalError);

    switch (type) {
      case AuthErrorType.INVALID_CREDENTIALS:
        return new UnauthorizedException(AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS);

      case AuthErrorType.INVALID_TOKEN:
      case AuthErrorType.EXPIRED_TOKEN:
        return new UnauthorizedException(AUTH_MESSAGES.ERRORS.INVALID_TOKEN);

      case AuthErrorType.TOKEN_NOT_PROVIDED:
        return new UnauthorizedException('Token não fornecido');

      case AuthErrorType.USER_NOT_FOUND:
        return new NotFoundException(AUTH_MESSAGES.ERRORS.USER_NOT_FOUND);

      case AuthErrorType.USER_ID_NOT_FOUND:
        return new BadRequestException(AUTH_MESSAGES.ERRORS.USER_ID_NOT_FOUND);

      case AuthErrorType.USER_NOT_AUTHENTICATED:
        return new UnauthorizedException('Usuário não autenticado');

      case AuthErrorType.EMAIL_NOT_VERIFIED:
        return new ForbiddenException(AUTH_MESSAGES.ERRORS.EMAIL_NOT_VERIFIED);

      case AuthErrorType.ACCOUNT_DISABLED:
        return new ForbiddenException(AUTH_MESSAGES.ERRORS.ACCOUNT_DISABLED);

      case AuthErrorType.ACCOUNT_LOCKED:
        return new ForbiddenException(AUTH_MESSAGES.ERRORS.ACCOUNT_LOCKED);

      case AuthErrorType.INSUFFICIENT_PERMISSION:
      case AuthErrorType.INSUFFICIENT_PERMISSIONS:
        return new ForbiddenException('Permissão insuficiente para esta operação');

      case AuthErrorType.ACCESS_DENIED:
        return new ForbiddenException(context?.reason || 'Acesso negado');

      case AuthErrorType.TENANT_ACCESS_DENIED:
        return new ForbiddenException('Acesso negado a este tenant');

      case AuthErrorType.SESSION_EXPIRED:
        return new UnauthorizedException(AUTH_MESSAGES.ERRORS.SESSION_EXPIRED);

      case AuthErrorType.INVALID_2FA_CODE:
        return new BadRequestException(AUTH_MESSAGES.ERRORS.INVALID_CODE);

      case AuthErrorType.TWO_FACTOR_REQUIRED:
        return new BadRequestException('Autenticação de dois fatores requerida');

      case AuthErrorType.TOO_MANY_ATTEMPTS:
        return new BadRequestException(AUTH_MESSAGES.ERRORS.TOO_MANY_ATTEMPTS);

      case AuthErrorType.EMAIL_ALREADY_EXISTS:
        return new ConflictException('Email já cadastrado no sistema');

      case AuthErrorType.WEAK_PASSWORD:
        return new BadRequestException('Senha não atende aos requisitos mínimos de segurança');

      case AuthErrorType.EMAIL_SEND_ERROR:
        return new BadRequestException(AUTH_MESSAGES.ERRORS.EMAIL_SEND_ERROR);

      case AuthErrorType.INVALID_RESET_TOKEN:
        return new BadRequestException('Token de reset inválido ou expirado');

      case AuthErrorType.METHOD_NOT_IMPLEMENTED:
        return new BadRequestException(AUTH_MESSAGES.ERRORS.METHOD_NOT_IMPLEMENTED);

      default:
        return new BadRequestException('Erro na autenticação');
    }
  }

  private static logError(
    type: AuthErrorType,
    context?: AuthErrorContext,
    originalError?: Error,
  ): void {
    const logMessage = `Auth error: ${type}`;
    const logContext = {
      type,
      ...context,
      timestamp: new Date().toISOString(),
    };

    if (originalError) {
      this.logger.error(logMessage, originalError.stack, logContext);
    } else {
      this.logger.warn(logMessage, logContext);
    }
  }

  static createResult<T = any>(type: AuthErrorType, context?: AuthErrorContext): { error: Error } {
    return { error: this.create(type, context) };
  }

  static userNotFound(): NotFoundException {
    return this.create(AuthErrorType.USER_NOT_FOUND) as NotFoundException;
  }

  static invalidToken(): UnauthorizedException {
    return this.create(AuthErrorType.INVALID_TOKEN) as UnauthorizedException;
  }

  static badRequest(message?: string): BadRequestException {
    return new BadRequestException(message || 'Requisição inválida');
  }

  static internalServerError(message?: string): HttpException {
    return new HttpException(message || 'Erro interno do servidor', 500);
  }
}

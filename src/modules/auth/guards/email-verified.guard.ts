import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipEmailVerification = this.reflector.get<boolean>(
      'skipEmailVerification',
      context.getHandler()
    );

    if (skipEmailVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND);
    }

    if (!user.emailVerified) {
      throw AuthErrorFactory.create(
        AuthErrorType.EMAIL_NOT_VERIFIED,
        { userId: user.id, email: user.email }
      );
    }

    return true;
  }
}
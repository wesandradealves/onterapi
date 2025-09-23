import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { BaseGuard } from '../../../shared/guards/base.guard';

@Injectable()
export class EmailVerifiedGuard extends BaseGuard {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipEmailVerification = this.reflector.get<boolean>(
      'skipEmailVerification',
      context.getHandler(),
    );

    if (skipEmailVerification) {
      return true;
    }

    const user = this.getUser(context);

    if (!user.emailVerified) {
      throw AuthErrorFactory.create(AuthErrorType.EMAIL_NOT_VERIFIED, {
        userId: user.id,
        email: user.email,
      });
    }

    return true;
  }
}

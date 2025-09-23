import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { BaseGuard } from '../../../shared/guards/base.guard';

@Injectable()
export class ActiveAccountGuard extends BaseGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = this.getUser(context);

    if (!user.isActive || user.bannedUntil) {
      const isLocked = user.bannedUntil && new Date(user.bannedUntil) > new Date();

      throw AuthErrorFactory.create(
        isLocked ? AuthErrorType.ACCOUNT_LOCKED : AuthErrorType.ACCOUNT_DISABLED,
        {
          userId: user.id,
          email: user.email,
          bannedUntil: user.bannedUntil,
        },
      );
    }

    return true;
  }
}

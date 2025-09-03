import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class ActiveAccountGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND);
    }

    if (!user.isActive || user.bannedUntil) {
      const isLocked = user.bannedUntil && new Date(user.bannedUntil) > new Date();
      
      throw AuthErrorFactory.create(
        isLocked ? AuthErrorType.ACCOUNT_LOCKED : AuthErrorType.ACCOUNT_DISABLED,
        { 
          userId: user.id, 
          email: user.email,
          bannedUntil: user.bannedUntil 
        }
      );
    }

    return true;
  }
}
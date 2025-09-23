import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthErrorFactory, AuthErrorType } from '../factories/auth-error.factory';
import { ICurrentUser } from '../../modules/auth/decorators/current-user.decorator';

@Injectable()
export abstract class BaseGuard implements CanActivate {
  protected getUser(context: ExecutionContext): ICurrentUser {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_AUTHENTICATED);
    }

    return user;
  }

  abstract canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

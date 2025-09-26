import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ICurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string | null;
  sessionId: string;
  isActive?: boolean;
  bannedUntil?: Date | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  metadata?: Record<string, unknown>;
}

type RequestWithUser = {
  user?: ICurrentUser;
};

export const CurrentUser = createParamDecorator(
  (
    data: keyof ICurrentUser | undefined,
    ctx: ExecutionContext,
  ): ICurrentUser | ICurrentUser[keyof ICurrentUser] | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!data) {
      return user;
    }

    return user ? user[data] : undefined;
  },
);

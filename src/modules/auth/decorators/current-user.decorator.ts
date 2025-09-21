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
  metadata?: Record<string, any>;
}

export const CurrentUser = createParamDecorator(
  (data: keyof ICurrentUser | undefined, ctx: ExecutionContext): ICurrentUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
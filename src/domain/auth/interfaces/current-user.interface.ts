import { RolesEnum } from '../enums/roles.enum';

export interface ICurrentUser {
  id: string;
  email: string;
  role: RolesEnum;
  tenantId?: string;
  name?: string;
  sessionId?: string;
  isActive?: boolean;
  bannedUntil?: Date | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  metadata?: Record<string, unknown>;
}

import { RolesEnum } from '../../domain/auth/enums/roles.enum';

export interface ICurrentUser {
  id: string;
  email: string;
  name?: string;
  role: RolesEnum;
  tenantId?: string;
  sessionId?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  isActive?: boolean;
}

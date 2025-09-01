import { RolesEnum } from '../enums/roles.enum';

export interface ICurrentUser {
  id: string;
  email: string;
  role: RolesEnum;
  tenantId?: string;
}
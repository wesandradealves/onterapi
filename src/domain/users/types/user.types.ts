import { RolesEnum } from '../../auth/enums/roles.enum';

export interface ICreateUser {
  supabaseId: string;
  email: string;
  name: string;
  cpf: string;
  phone?: string;
  role: RolesEnum;
  tenantId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  metadata?: Record<string, any>;
}

export interface IUpdateUser {
  name?: string;
  phone?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
  lastLoginAt?: Date;
  emailVerified?: boolean;
}

export interface IUserFilters {
  page?: number;
  limit?: number;
  role?: RolesEnum;
  tenantId?: string;
  isActive?: boolean;
}

export interface IUserResponse {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone?: string;
  role: RolesEnum;
  tenantId?: string;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
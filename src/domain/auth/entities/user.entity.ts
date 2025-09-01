import { RolesEnum } from '../enums/roles.enum';

/**
 * Entidade de domínio User
 * Representa um usuário do sistema
 */
export class User {
  id!: string;
  supabaseId!: string;
  email!: string;
  name!: string;
  cpf!: string;
  phone?: string;
  role!: RolesEnum;
  tenantId?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
    this.twoFactorEnabled = partial.twoFactorEnabled ?? false;
    this.isActive = partial.isActive ?? true;
    this.emailVerified = partial.emailVerified ?? false;
    this.failedLoginAttempts = partial.failedLoginAttempts ?? 0;
    this.createdAt = partial.createdAt ?? new Date();
    this.updatedAt = partial.updatedAt ?? new Date();
  }

  isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return this.lockedUntil > new Date();
  }

  canPerformAction(requiredRole: RolesEnum): boolean {
    const roleHierarchy: Record<RolesEnum, number> = {
      [RolesEnum.SUPER_ADMIN]: 100,
      [RolesEnum.ADMIN_FINANCEIRO]: 90,
      [RolesEnum.ADMIN_SUPORTE]: 85,
      [RolesEnum.ADMIN_EDITOR]: 80,
      [RolesEnum.MARKETPLACE_MANAGER]: 75,
      [RolesEnum.CLINIC_OWNER]: 60,
      [RolesEnum.MANAGER]: 50,
      [RolesEnum.PROFESSIONAL]: 40,
      [RolesEnum.SECRETARY]: 30,
      [RolesEnum.PATIENT]: 10,
      [RolesEnum.VISITOR]: 0,
    };

    const userLevel = roleHierarchy[this.role] ?? 0;
    const requiredLevel = roleHierarchy[requiredRole] ?? 0;
    
    return userLevel >= requiredLevel;
  }

  isInternal(): boolean {
    const internalRoles = [
      RolesEnum.SUPER_ADMIN,
      RolesEnum.ADMIN_FINANCEIRO,
      RolesEnum.ADMIN_SUPORTE,
      RolesEnum.ADMIN_EDITOR,
      RolesEnum.MARKETPLACE_MANAGER,
    ];
    return internalRoles.includes(this.role);
  }

  isClinicStaff(): boolean {
    const clinicRoles = [
      RolesEnum.CLINIC_OWNER,
      RolesEnum.PROFESSIONAL,
      RolesEnum.SECRETARY,
      RolesEnum.MANAGER,
    ];
    return clinicRoles.includes(this.role);
  }

  needsTenant(): boolean {
    return this.isClinicStaff();
  }
}
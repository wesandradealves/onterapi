import {
  CLINIC_ROLES,
  INTERNAL_ROLES,
  ROLE_HIERARCHY,
  RolesEnum,
} from '../../domain/auth/enums/roles.enum';

export class RolesUtil {
  static canPerformAction(userRole: RolesEnum, requiredRole: RolesEnum): boolean {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 100;
    return userLevel >= requiredLevel;
  }

  static isInternalRole(role: RolesEnum): boolean {
    return INTERNAL_ROLES.includes(role);
  }

  static isClinicStaffRole(role: RolesEnum): boolean {
    return CLINIC_ROLES.includes(role);
  }

  static isAdminRole(role: RolesEnum): boolean {
    return [RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN_SUPORTE, RolesEnum.ADMIN_FINANCEIRO].includes(
      role,
    );
  }

  static getRoleLevel(role: RolesEnum): number {
    return ROLE_HIERARCHY[role] ?? 0;
  }

  static compareRoles(role1: RolesEnum, role2: RolesEnum): number {
    const level1 = RolesUtil.getRoleLevel(role1);
    const level2 = RolesUtil.getRoleLevel(role2);
    return level1 - level2;
  }
}

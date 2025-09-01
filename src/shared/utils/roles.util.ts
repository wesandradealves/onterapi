import { RolesEnum, ROLE_HIERARCHY, INTERNAL_ROLES, CLINIC_ROLES } from '../../domain/auth/enums/roles.enum';

/**
 * Utilitários centralizados para trabalhar com roles
 */

export class RolesUtil {
  /**
   * Verifica se usuário pode performar ação baseado em hierarquia
   */
  static canPerformAction(userRole: RolesEnum, requiredRole: RolesEnum): boolean {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 100;
    return userLevel >= requiredLevel;
  }

  /**
   * Verifica se role é interna (plataforma)
   */
  static isInternalRole(role: RolesEnum): boolean {
    return INTERNAL_ROLES.includes(role);
  }

  /**
   * Verifica se role é de clínica
   */
  static isClinicStaffRole(role: RolesEnum): boolean {
    return CLINIC_ROLES.includes(role);
  }

  /**
   * Verifica se role é administrativa
   */
  static isAdminRole(role: RolesEnum): boolean {
    return [
      RolesEnum.SUPER_ADMIN,
      RolesEnum.ADMIN_SUPORTE,
      RolesEnum.ADMIN_FINANCEIRO,
    ].includes(role);
  }

  /**
   * Obtém nível hierárquico da role
   */
  static getRoleLevel(role: RolesEnum): number {
    return ROLE_HIERARCHY[role] ?? 0;
  }

  /**
   * Compara duas roles
   */
  static compareRoles(role1: RolesEnum, role2: RolesEnum): number {
    const level1 = RolesUtil.getRoleLevel(role1);
    const level2 = RolesUtil.getRoleLevel(role2);
    return level1 - level2;
  }
}
import { RolesEnum } from '../../domain/auth/enums/roles.enum';

const ROLE_DATABASE_MAP: Record<RolesEnum, string> = {
  [RolesEnum.SUPER_ADMIN]: 'super_admin',
  [RolesEnum.ADMIN_FINANCEIRO]: 'admin_financeiro',
  [RolesEnum.ADMIN_SUPORTE]: 'admin_suporte',
  [RolesEnum.ADMIN_EDITOR]: 'admin_editor',
  [RolesEnum.MARKETPLACE_MANAGER]: 'marketplace_manager',
  [RolesEnum.CLINIC_OWNER]: 'clinic_owner',
  [RolesEnum.PROFESSIONAL]: 'professional',
  [RolesEnum.SECRETARY]: 'secretary',
  [RolesEnum.MANAGER]: 'manager',
  [RolesEnum.PATIENT]: 'patient',
  [RolesEnum.VISITOR]: 'visitor',
};

const ROLE_DOMAIN_MAP: Record<string, RolesEnum> = Object.entries(ROLE_DATABASE_MAP).reduce(
  (acc, [domainValue, databaseValue]) => {
    acc[databaseValue] = domainValue as RolesEnum;
    acc[domainValue] = domainValue as RolesEnum;
    acc[domainValue.toLowerCase()] = domainValue as RolesEnum;
    return acc;
  },
  {} as Record<string, RolesEnum>,
);

const ROLE_SYNONYMS: Record<string, RolesEnum> = {
  SECRETARIA: RolesEnum.SECRETARY,
  secretaria: RolesEnum.SECRETARY,
  PROFISSIONAL: RolesEnum.PROFESSIONAL,
  profissional: RolesEnum.PROFESSIONAL,
  GESTOR: RolesEnum.MANAGER,
  gestor: RolesEnum.MANAGER,
};

Object.entries(ROLE_SYNONYMS).forEach(([key, value]) => {
  ROLE_DOMAIN_MAP[key] = value;
});

export function mapRoleToDatabase(role?: RolesEnum | string | null): string | undefined {
  if (!role) {
    return undefined;
  }

  const normalized = String(role).trim();

  if (ROLE_DATABASE_MAP[normalized as RolesEnum]) {
    return ROLE_DATABASE_MAP[normalized as RolesEnum];
  }

  if (ROLE_DOMAIN_MAP[normalized]) {
    return ROLE_DATABASE_MAP[ROLE_DOMAIN_MAP[normalized]];
  }

  const upper = normalized.toUpperCase();
  if (ROLE_DATABASE_MAP[upper as RolesEnum]) {
    return ROLE_DATABASE_MAP[upper as RolesEnum];
  }

  return normalized.toLowerCase();
}

export function mapRoleToDomain(role?: string | null): RolesEnum | undefined {
  if (!role) {
    return undefined;
  }

  const normalized = String(role).trim();
  const fromMap = ROLE_DOMAIN_MAP[normalized];

  if (fromMap) {
    return fromMap;
  }

  const upper = normalized.toUpperCase();
  if (ROLE_DOMAIN_MAP[upper]) {
    return ROLE_DOMAIN_MAP[upper];
  }

  return undefined;
}

export const ROLE_DATABASE_VALUES = Object.values(ROLE_DATABASE_MAP);

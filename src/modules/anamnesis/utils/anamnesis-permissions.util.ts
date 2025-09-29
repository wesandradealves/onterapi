import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';

export interface AnamnesisPermissionContext {
  requesterId: string;
  requesterRole: string;
  professionalId?: string;
  patientId?: string;
}

const ELEVATED_ROLES: RolesEnum[] = [
  RolesEnum.SUPER_ADMIN,
  RolesEnum.CLINIC_OWNER,
  RolesEnum.MANAGER,
];

export const ensureCanModifyAnamnesis = (context: AnamnesisPermissionContext): void => {
  const role = mapRoleToDomain(context.requesterRole);

  if (!role) {
    throw AnamnesisErrorFactory.unauthorized();
  }

  if (ELEVATED_ROLES.includes(role)) {
    return;
  }

  if (role === RolesEnum.PROFESSIONAL && context.professionalId === context.requesterId) {
    return;
  }

  if (role === RolesEnum.PATIENT && context.patientId === context.requesterId) {
    return;
  }

  throw AnamnesisErrorFactory.unauthorized();
};

export const ensureCanViewAnamnesis = (context: AnamnesisPermissionContext): void => {
  const role = mapRoleToDomain(context.requesterRole);

  if (!role) {
    throw AnamnesisErrorFactory.unauthorized();
  }

  if (ELEVATED_ROLES.includes(role)) {
    return;
  }

  if (role === RolesEnum.PROFESSIONAL && context.professionalId === context.requesterId) {
    return;
  }

  if (role === RolesEnum.PATIENT && context.patientId === context.requesterId) {
    return;
  }

  throw AnamnesisErrorFactory.unauthorized();
};

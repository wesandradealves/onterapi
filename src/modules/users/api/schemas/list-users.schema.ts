import { z } from 'zod';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { mapRoleToDomain } from '../../../../shared/utils/role.utils';

const unwrapSingleValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : undefined;
  }
  return value;
};

const optionalInt = (min: number, max?: number) =>
  z
    .preprocess((value) => {
      const raw = unwrapSingleValue(value);
      if (raw === undefined || raw === null || raw === '') {
        return undefined;
      }

      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        return raw;
      }

      return parsed;
    }, max ? z.number().int().min(min).max(max) : z.number().int().min(min))
    .optional();

const optionalBoolean = z
  .preprocess((value) => {
    const raw = unwrapSingleValue(value);
    if (raw === undefined || raw === null || raw === '') {
      return undefined;
    }

    if (typeof raw === 'boolean') {
      return raw;
    }

    const normalized = String(raw).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }

    return raw;
  }, z.boolean())
  .optional();

const optionalRole = z
  .preprocess((value) => {
    const raw = unwrapSingleValue(value);
    if (raw === undefined || raw === null || raw === '') {
      return undefined;
    }

    const normalized = mapRoleToDomain(String(raw));
    if (normalized) {
      return normalized;
    }

    return String(raw).trim().toUpperCase();
  }, z.nativeEnum(RolesEnum))
  .optional();

const optionalUuid = z.preprocess((value) => {
  const raw = unwrapSingleValue(value);
  if (raw === undefined || raw === null) {
    return undefined;
  }

  const trimmed = String(raw).trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().uuid().optional());

export const listUsersSchema = z.object({
  page: optionalInt(1),
  limit: optionalInt(1, 100),
  role: optionalRole,
  tenantId: optionalUuid,
  isActive: optionalBoolean,
});

export type ListUsersSchema = z.infer<typeof listUsersSchema>;

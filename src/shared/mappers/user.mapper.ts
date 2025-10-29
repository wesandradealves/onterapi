import { UserEntity } from '../../infrastructure/auth/entities/user.entity';

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const readBoolean = (record: Record<string, unknown>, key: string): boolean | undefined => {
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
};

const readDate = (record: Record<string, unknown>, key: string): Date | undefined => {
  const value = record[key];
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
};

export class UserMapper {
  static fromSupabaseToEntity(supabaseUserRaw: unknown): UserEntity {
    const payload = toRecord(supabaseUserRaw);
    const metadata = toRecord(payload.user_metadata ?? payload.metadata);

    const id = readString(payload, 'id') ?? '';
    const email = readString(payload, 'email') ?? '';
    const name = readString(metadata, 'name') ?? '';
    const cpf = readString(metadata, 'cpf') ?? '';
    const phone = readString(metadata, 'phone') ?? '';
    const role = readString(metadata, 'role') ?? 'PATIENT';
    const tenantId = readString(metadata, 'tenantId') ?? null;
    const slug = readString(metadata, 'slug') ?? id;

    const bannedUntil = readDate(payload, 'banned_until');
    const isActive = readBoolean(metadata, 'isActive');
    const emailConfirmedAt = readDate(payload, 'email_confirmed_at');
    const emailVerifiedMeta = readBoolean(metadata, 'emailVerified');
    const twoFactorEnabled =
      readBoolean(metadata, 'twoFactorEnabled') ??
      readBoolean(metadata, 'two_factor_enabled') ??
      false;
    const lastLoginAt =
      readDate(payload, 'last_sign_in_at') ?? readDate(metadata, 'lastLoginAt') ?? null;
    const createdAt =
      readDate(payload, 'created_at') ?? readDate(payload, 'createdAt') ?? new Date();
    const updatedAt =
      readDate(payload, 'updated_at') ??
      readDate(payload, 'updatedAt') ??
      readDate(payload, 'created_at') ??
      readDate(payload, 'createdAt') ??
      createdAt;

    return {
      id,
      supabaseId: id,
      slug,
      email,
      name,
      cpf,
      phone,
      role,
      tenantId,
      isActive: isActive !== undefined ? isActive : !bannedUntil,
      emailVerified: emailVerifiedMeta ?? Boolean(emailConfirmedAt),
      twoFactorEnabled,
      lastLoginAt,
      createdAt,
      updatedAt,
      metadata,
    } as UserEntity;
  }

  static fromSupabaseList(users: unknown[]): UserEntity[] {
    return users.map((user) => this.fromSupabaseToEntity(user));
  }

  static extractMetadata(supabaseUserRaw: unknown): Record<string, unknown> {
    const payload = toRecord(supabaseUserRaw);
    return toRecord(payload.user_metadata ?? payload.metadata);
  }
}

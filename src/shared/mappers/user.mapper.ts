import { UserEntity } from '../../infrastructure/auth/entities/user.entity';

export class UserMapper {
  static fromSupabaseToEntity(supabaseUser: any): UserEntity {
    const metadata = supabaseUser.user_metadata || supabaseUser.metadata || {};
    const rawSlug = metadata.slug;
    const slug = typeof rawSlug === 'string' && rawSlug.trim().length ? rawSlug.trim() : supabaseUser.id;

    return {
      id: supabaseUser.id,
      supabaseId: supabaseUser.id,
      slug,
      email: supabaseUser.email || '',
      name: metadata.name || '',
      cpf: metadata.cpf || '',
      phone: metadata.phone || '',
      role: metadata.role || 'PATIENT',
      tenantId: metadata.tenantId || null,
      isActive: !supabaseUser.banned_until && metadata.isActive !== false,
      emailVerified: !!supabaseUser.email_confirmed_at || !!supabaseUser.emailVerified,
      twoFactorEnabled: metadata.twoFactorEnabled || false,
      lastLoginAt: supabaseUser.last_sign_in_at ? new Date(supabaseUser.last_sign_in_at) : null,
      createdAt: new Date(supabaseUser.created_at || supabaseUser.createdAt),
      updatedAt: new Date(
        supabaseUser.updated_at ||
          supabaseUser.updatedAt ||
          supabaseUser.created_at ||
          supabaseUser.createdAt,
      ),
      metadata,
    } as UserEntity;
  }

  static fromSupabaseList(users: any[]): UserEntity[] {
    return users.map((user) => this.fromSupabaseToEntity(user));
  }

  static extractMetadata(supabaseUser: any): any {
    return supabaseUser.user_metadata || supabaseUser.metadata || {};
  }
}

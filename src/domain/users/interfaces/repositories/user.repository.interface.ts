import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';

export interface IUserRepository {
  create(data: Partial<UserEntity>): Promise<UserEntity>;
  findAll(filters: {
    page?: number;
    limit?: number;
    role?: string;
    tenantId?: string;
    isActive?: boolean;
  }): Promise<{ data: UserEntity[]; total: number }>;
  findById(id: string): Promise<UserEntity | null>;
  findBySlug(slug: string): Promise<UserEntity | null>;
  findBySupabaseId(supabaseId: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByCpf(cpf: string): Promise<UserEntity | null>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
  checkUniqueness(field: 'email' | 'cpf', value: string, excludeId?: string): Promise<boolean>;
}

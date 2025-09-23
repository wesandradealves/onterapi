import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return await this.repository.save(user);
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    role?: string;
    tenantId?: string;
    isActive?: boolean;
  }): Promise<{ data: UserEntity[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('user');

    queryBuilder.where('user.deletedAt IS NULL');

    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.tenantId) {
      queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findBySlug(slug: string): Promise<UserEntity | null> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.slug = :slug', { slug })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findBySupabaseId(supabaseId: string): Promise<UserEntity | null> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.supabaseId = :supabaseId', { supabaseId })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findByCpf(cpf: string): Promise<UserEntity | null> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.cpf = :cpf', { cpf })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const payload = { ...data };
    if ('slug' in payload) {
      delete (payload as Partial<UserEntity>).slug;
    }

    await this.repository.update(id, payload);
    const updated = await this.findById(id);
    if (!updated) {
      throw AuthErrorFactory.userNotFound();
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { deletedAt: new Date() });
  }

  async checkUniqueness(
    field: 'email' | 'cpf',
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('user');

    queryBuilder.where(`user.${field} = :value`, { value }).andWhere('user.deletedAt IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count === 0;
  }
}

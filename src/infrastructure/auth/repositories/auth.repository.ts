import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, EntityManager } from 'typeorm';
import { IAuthRepository } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { User } from '../../../domain/auth/entities/user.entity';
import { UserEntity } from '../entities/user.entity';
import { UserSessionEntity } from '../entities/user-session.entity';
import { TwoFactorCodeEntity } from '../entities/two-factor-code.entity';
import { LoginAttemptEntity } from '../entities/login-attempt.entity';

@Injectable()
export class AuthRepository implements IAuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepository: Repository<UserSessionEntity>,
    @InjectRepository(TwoFactorCodeEntity)
    private readonly twoFactorCodeRepository: Repository<TwoFactorCodeEntity>,
    @InjectRepository(LoginAttemptEntity)
    private readonly loginAttemptRepository: Repository<LoginAttemptEntity>,
  ) {}

  async findByEmail(email: string, runner?: QueryRunner): Promise<User | null> {
    const manager = runner?.manager || this.userRepository.manager;
    
    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.email = :email', { email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity ? this.toDomainEntity(entity) : null;
  }

  async findByCpf(cpf: string, runner?: QueryRunner): Promise<User | null> {
    const manager = runner?.manager || this.userRepository.manager;
    
    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.cpf = :cpf', { cpf })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity ? this.toDomainEntity(entity) : null;
  }

  async findById(id: string, runner?: QueryRunner): Promise<User | null> {
    const manager = runner?.manager || this.userRepository.manager;
    
    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity ? this.toDomainEntity(entity) : null;
  }

  async findBySupabaseId(supabaseId: string, runner?: QueryRunner): Promise<User | null> {
    const manager = runner?.manager || this.userRepository.manager;
    
    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.supabaseId = :supabaseId', { supabaseId })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity ? this.toDomainEntity(entity) : null;
  }

  async create(data: Partial<User>, runner?: QueryRunner): Promise<User> {
    const manager = runner?.manager || this.userRepository.manager;
    
    const entity = manager.create(UserEntity, {
      supabaseId: data.supabaseId,
      email: data.email,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      role: data.role,
      tenantId: data.tenantId,
      twoFactorEnabled: data.twoFactorEnabled || false,
      twoFactorSecret: data.twoFactorSecret,
      isActive: data.isActive ?? true,
      emailVerified: data.emailVerified || false,
      metadata: data.metadata,
    });

    const saved = await manager.save(entity);
    return this.toDomainEntity(saved);
  }

  async update(id: string, data: Partial<User>, runner?: QueryRunner): Promise<User> {
    const manager = runner?.manager || this.userRepository.manager;
    
    await manager
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
        ...(data.twoFactorEnabled !== undefined && { twoFactorEnabled: data.twoFactorEnabled }),
        ...(data.twoFactorSecret !== undefined && { twoFactorSecret: data.twoFactorSecret }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
        ...(data.lastLoginAt && { lastLoginAt: data.lastLoginAt }),
        ...(data.failedLoginAttempts !== undefined && { failedLoginAttempts: data.failedLoginAttempts }),
        ...(data.lockedUntil !== undefined && { lockedUntil: data.lockedUntil }),
        ...(data.metadata && { metadata: data.metadata }),
        updatedAt: new Date(),
      })
      .where('id = :id', { id })
      .execute();

    const updated = await this.findById(id, runner);
    if (!updated) {
      throw new Error(`User with id ${id} not found after update`);
    }

    return updated;
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    deviceInfo?: any,
    runner?: QueryRunner,
  ): Promise<void> {
    const manager = runner?.manager || this.sessionRepository.manager;
    
    const session = manager.create(UserSessionEntity, {
      userId,
      refreshToken: token,
      expiresAt,
      deviceInfo,
      ipAddress: deviceInfo?.ip,
    });

    await manager.save(session);
  }

  async validateRefreshToken(token: string): Promise<User | null> {
    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.refreshToken = :token', { token })
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .andWhere('session.revokedAt IS NULL')
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    if (!session || !session.user) {
      return null;
    }

    await this.sessionRepository
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ lastActivityAt: new Date() })
      .where('id = :id', { id: session.id })
      .execute();

    return this.toDomainEntity(session.user);
  }

  async removeRefreshToken(token: string, runner?: QueryRunner): Promise<void> {
    const manager = runner?.manager || this.sessionRepository.manager;
    
    await manager
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ 
        revokedAt: new Date(),
        revokedReason: 'User signed out',
      })
      .where('refreshToken = :token', { token })
      .execute();
  }

  async saveTwoFactorCode(
    userId: string,
    code: string,
    expiresAt: Date,
    runner?: QueryRunner,
  ): Promise<void> {
    const manager = runner?.manager || this.twoFactorCodeRepository.manager;
    
    await manager
      .createQueryBuilder()
      .update(TwoFactorCodeEntity)
      .set({ isUsed: true })
      .where('userId = :userId', { userId })
      .andWhere('isUsed = false')
      .execute();

    const twoFactorCode = manager.create(TwoFactorCodeEntity, {
      userId,
      code,
      method: 'email',
      expiresAt,
    });

    await manager.save(twoFactorCode);
  }

  async validateTwoFactorCode(userId: string, code: string): Promise<boolean> {
    const twoFactorCode = await this.twoFactorCodeRepository
      .createQueryBuilder('code')
      .where('code.userId = :userId', { userId })
      .andWhere('code.code = :code', { code })
      .andWhere('code.expiresAt > :now', { now: new Date() })
      .andWhere('code.isUsed = false')
      .andWhere('code.attempts < code.maxAttempts')
      .getOne();

    if (!twoFactorCode) {
      await this.twoFactorCodeRepository
        .createQueryBuilder()
        .update(TwoFactorCodeEntity)
        .set({ attempts: () => 'attempts + 1' })
        .where('userId = :userId', { userId })
        .andWhere('code = :code', { code })
        .execute();
      
      return false;
    }

    await this.twoFactorCodeRepository
      .createQueryBuilder()
      .update(TwoFactorCodeEntity)
      .set({ 
        isUsed: true,
        usedAt: new Date(),
      })
      .where('id = :id', { id: twoFactorCode.id })
      .execute();

    return true;
  }

  async incrementFailedAttempts(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;

    const attempts = user.failedLoginAttempts + 1;
    const maxAttempts = 5;
    
    const updateData: Partial<User> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= maxAttempts) {
      const lockDuration = 30 * 60 * 1000; // 30 minutes
      updateData.lockedUntil = new Date(Date.now() + lockDuration);
    }

    await this.update(user.id, updateData);

    await this.loginAttemptRepository.save({
      email,
      ipAddress: '0.0.0.0',
      success: false,
      reason: 'Invalid credentials',
    });
  }

  async resetFailedAttempts(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;

    await this.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });

    await this.loginAttemptRepository.save({
      email,
      ipAddress: '0.0.0.0',
      success: true,
    });
  }

  async isUserLocked(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;

    return user.isLocked();
  }

  private toDomainEntity(entity: UserEntity): User {
    return new User({
      id: entity.id,
      supabaseId: entity.supabaseId,
      email: entity.email,
      name: entity.name,
      cpf: entity.cpf,
      phone: entity.phone,
      role: entity.role,
      tenantId: entity.tenantId,
      twoFactorEnabled: entity.twoFactorEnabled,
      twoFactorSecret: entity.twoFactorSecret,
      isActive: entity.isActive,
      emailVerified: entity.emailVerified,
      lastLoginAt: entity.lastLoginAt,
      failedLoginAttempts: entity.failedLoginAttempts,
      lockedUntil: entity.lockedUntil,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }
}
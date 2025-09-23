import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryRunner, Repository } from 'typeorm';
import { IAuthRepository } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { UserEntity } from '../entities/user.entity';
import { UserSessionEntity } from '../entities/user-session.entity';
import { TwoFactorCodeEntity } from '../entities/two-factor-code.entity';
import { LoginAttemptEntity } from '../entities/login-attempt.entity';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';

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

  async findByEmail(email: string, runner?: QueryRunner): Promise<UserEntity | null> {
    const manager = runner?.manager || this.userRepository.manager;

    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.email = :email', { email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity;
  }

  async findByCpf(cpf: string, runner?: QueryRunner): Promise<UserEntity | null> {
    const manager = runner?.manager || this.userRepository.manager;

    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.cpf = :cpf', { cpf })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity;
  }

  async findById(id: string, runner?: QueryRunner): Promise<UserEntity | null> {
    const manager = runner?.manager || this.userRepository.manager;

    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity;
  }

  async findBySupabaseId(supabaseId: string, runner?: QueryRunner): Promise<UserEntity | null> {
    const manager = runner?.manager || this.userRepository.manager;

    const entity = await manager
      .createQueryBuilder(UserEntity, 'user')
      .where('user.supabaseId = :supabaseId', { supabaseId })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return entity;
  }

  async create(data: Partial<UserEntity>, runner?: QueryRunner): Promise<UserEntity> {
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
    return saved;
  }

  async update(id: string, data: Partial<UserEntity>, runner?: QueryRunner): Promise<UserEntity> {
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
        ...(data.failedLoginAttempts !== undefined && {
          failedLoginAttempts: data.failedLoginAttempts,
        }),
        ...(data.lockedUntil !== undefined && { lockedUntil: data.lockedUntil }),
        ...(data.metadata && { metadata: data.metadata }),
        updatedAt: new Date(),
      })
      .where('id = :id', { id })
      .execute();

    const updated = await this.findById(id, runner);
    if (!updated) {
      throw AuthErrorFactory.userNotFound();
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

  async validateRefreshToken(token: string): Promise<UserEntity | null> {
    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.refreshToken = :token', { token })
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .andWhere('session.revokedAt IS NULL')
      .getOne();

    if (!session) {
      return null;
    }

    await this.sessionRepository
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ lastActivityAt: new Date() })
      .where('id = :id', { id: session.id })
      .execute();

    const user = new UserEntity();
    user.id = session.userId;
    user.supabaseId = session.userId;
    user.isActive = true;

    return user;
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

  async findValidTwoFactorCode(userId: string): Promise<any> {
    const twoFactorCode = await this.twoFactorCodeRepository
      .createQueryBuilder('code')
      .where('code.userId = :userId', { userId })
      .andWhere('code.expiresAt > :now', { now: new Date() })
      .andWhere('code.isUsed = false')
      .andWhere('code.attempts < code.maxAttempts')
      .orderBy('code.createdAt', 'DESC')
      .getOne();

    return twoFactorCode;
  }

  async validateTwoFactorCode(userId: string, code: string): Promise<boolean> {
    const anyCode = await this.twoFactorCodeRepository
      .createQueryBuilder('code')
      .where('code.userId = :userId', { userId })
      .andWhere('code.expiresAt > :now', { now: new Date() })
      .andWhere('code.isUsed = false')
      .orderBy('code.createdAt', 'DESC')
      .getOne();

    if (!anyCode) {
      return false;
    }

    if (anyCode.attempts >= anyCode.maxAttempts) {
      throw new UnauthorizedException(
        'Conta bloqueada temporariamente. Muitas tentativas erradas.',
      );
    }

    if (anyCode.code !== code) {
      await this.twoFactorCodeRepository
        .createQueryBuilder()
        .update(TwoFactorCodeEntity)
        .set({ attempts: () => 'attempts + 1' })
        .where('id = :id', { id: anyCode.id })
        .execute();

      const updatedCode = await this.twoFactorCodeRepository.findOne({ where: { id: anyCode.id } });
      if (updatedCode && updatedCode.attempts >= updatedCode.maxAttempts) {
        throw new UnauthorizedException(
          'Conta bloqueada temporariamente. Muitas tentativas erradas.',
        );
      }

      return false;
    }

    const twoFactorCode = anyCode;

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

    const updateData: Partial<UserEntity> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= maxAttempts) {
      const lockDuration = 30 * 60 * 1000;
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

    return user.lockedUntil ? user.lockedUntil > new Date() : false;
  }
}

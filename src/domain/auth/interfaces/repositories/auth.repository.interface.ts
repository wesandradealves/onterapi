import { QueryRunner } from 'typeorm';
import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '@shared/types/result.type';

export interface IAuthRepository {
  findByEmail(email: string, runner?: QueryRunner): Promise<UserEntity | null>;
  findByCpf(cpf: string, runner?: QueryRunner): Promise<UserEntity | null>;
  findById(id: string, runner?: QueryRunner): Promise<UserEntity | null>;
  findBySupabaseId(supabaseId: string, runner?: QueryRunner): Promise<UserEntity | null>;
  create(data: Partial<UserEntity>, runner?: QueryRunner): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>, runner?: QueryRunner): Promise<UserEntity>;
  saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    deviceInfo?: any,
    runner?: QueryRunner,
  ): Promise<void>;
  validateRefreshToken(token: string): Promise<UserEntity | null>;
  removeRefreshToken(token: string, runner?: QueryRunner): Promise<void>;
  saveTwoFactorCode(
    userId: string,
    code: string,
    expiresAt: Date,
    runner?: QueryRunner,
  ): Promise<void>;
  validateTwoFactorCode(userId: string, code: string): Promise<boolean>;
  findValidTwoFactorCode(userId: string): Promise<any>;
  incrementFailedAttempts(email: string): Promise<void>;
  resetFailedAttempts(email: string): Promise<void>;
  isUserLocked(email: string): Promise<boolean>;
}

export const IAuthRepositoryToken = Symbol('IAuthRepository');
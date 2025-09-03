import { QueryRunner } from 'typeorm';
import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { Result } from '@shared/types/result.type';

/**
 * Interface do repositório de autenticação
 * Define contratos para acesso a dados
 */
export interface IAuthRepository {
  /**
   * Busca usuário por email
   */
  findByEmail(email: string, runner?: QueryRunner): Promise<UserEntity | null>;

  /**
   * Busca usuário por CPF
   */
  findByCpf(cpf: string, runner?: QueryRunner): Promise<UserEntity | null>;

  /**
   * Busca usuário por ID
   */
  findById(id: string, runner?: QueryRunner): Promise<UserEntity | null>;

  /**
   * Busca usuário por Supabase ID
   */
  findBySupabaseId(supabaseId: string, runner?: QueryRunner): Promise<UserEntity | null>;

  /**
   * Cria novo usuário
   */
  create(data: Partial<UserEntity>, runner?: QueryRunner): Promise<UserEntity>;

  /**
   * Atualiza usuário
   */
  update(id: string, data: Partial<UserEntity>, runner?: QueryRunner): Promise<UserEntity>;

  /**
   * Salva refresh token
   */
  saveRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    deviceInfo?: any,
    runner?: QueryRunner,
  ): Promise<void>;

  /**
   * Valida refresh token
   */
  validateRefreshToken(token: string): Promise<UserEntity | null>;

  /**
   * Remove refresh token
   */
  removeRefreshToken(token: string, runner?: QueryRunner): Promise<void>;

  /**
   * Salva código 2FA
   */
  saveTwoFactorCode(
    userId: string,
    code: string,
    expiresAt: Date,
    runner?: QueryRunner,
  ): Promise<void>;

  /**
   * Valida código 2FA
   */
  validateTwoFactorCode(userId: string, code: string): Promise<boolean>;

  /**
   * Busca código 2FA válido do usuário
   */
  findValidTwoFactorCode(userId: string): Promise<any>;

  /**
   * Incrementa tentativas de login falhas
   */
  incrementFailedAttempts(email: string): Promise<void>;

  /**
   * Reseta tentativas de login
   */
  resetFailedAttempts(email: string): Promise<void>;

  /**
   * Verifica se usuário está bloqueado
   */
  isUserLocked(email: string): Promise<boolean>;
}

export const IAuthRepositoryToken = Symbol('IAuthRepository');
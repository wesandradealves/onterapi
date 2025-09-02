import { Result } from '@shared/types/result.type';

/**
 * Interface para o serviço de autenticação Supabase
 */
export interface ISupabaseAuthService {
  /**
   * Criar novo usuário no Supabase Auth
   */
  signUp(data: SignUpData): Promise<Result<SupabaseUser>>;

  /**
   * Autenticar usuário
   */
  signIn(email: string, password: string): Promise<Result<SupabaseSession>>;

  /**
   * Fazer logout
   */
  signOut(accessToken: string): Promise<Result<void>>;

  /**
   * Verificar email
   */
  verifyEmail(token: string): Promise<Result<void>>;

  /**
   * Resetar senha
   */
  resetPassword(email: string): Promise<Result<void>>;

  /**
   * Atualizar senha
   */
  updatePassword(accessToken: string, newPassword: string): Promise<Result<void>>;

  /**
   * Obter usuário por token
   */
  getUser(accessToken: string): Promise<Result<SupabaseUser>>;

  /**
   * Obter usuário por ID
   */
  getUserById(userId: string): Promise<Result<any>>;

  /**
   * Atualizar metadados do usuário
   */
  updateUserMetadata(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<Result<SupabaseUser>>;

  /**
   * Refresh token
   */
  refreshToken(refreshToken: string): Promise<Result<SupabaseSession>>;
}

export interface SignUpData {
  email: string;
  password: string;
  metadata?: {
    name?: string;
    cpf?: string;
    role?: string;
    tenantId?: string;
    [key: string]: any;
  };
}

export interface SupabaseUser {
  id: string;
  email: string;
  emailVerified: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SupabaseUser;
}

export const ISupabaseAuthService = Symbol('ISupabaseAuthService');
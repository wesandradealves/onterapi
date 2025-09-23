import { Result } from '@shared/types/result.type';

export interface ISupabaseAuthService {
  signUp(data: SignUpData): Promise<Result<SupabaseUser>>;

  signIn(email: string, password: string): Promise<Result<SupabaseSession>>;

  signOut(accessToken: string, userId?: string): Promise<Result<void>>;

  verifyEmail(token: string, email?: string): Promise<Result<void>>;

  resetPassword(email: string): Promise<Result<void>>;

  updatePassword(accessToken: string, newPassword: string): Promise<Result<void>>;

  getUser(accessToken: string): Promise<Result<SupabaseUser>>;

  getUserById(userId: string): Promise<Result<any>>;

  updateUserMetadata(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<Result<SupabaseUser>>;

  refreshToken(refreshToken: string): Promise<Result<SupabaseSession>>;

  listUsers(params: { page?: number; perPage?: number }): Promise<Result<{ users: any[] }>>;

  deleteUser(userId: string): Promise<Result<void>>;

  confirmEmailByEmail(email: string): Promise<Result<void>>;
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

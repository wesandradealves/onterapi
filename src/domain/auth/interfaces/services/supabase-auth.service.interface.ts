import { Result } from '../../../../shared/types/result.type';

export interface SupabaseMetadata {
  name?: string;
  cpf?: string;
  role?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export interface SupabaseUser {
  id: string;
  email: string;
  emailVerified: boolean;
  metadata: SupabaseMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SupabaseUser;
}

export interface SignUpData {
  email: string;
  password: string;
  metadata?: SupabaseMetadata;
}

export interface SupabaseGeneratedLink {
  actionLink: string;
  emailOtp?: string;
  hashedToken?: string;
  redirectTo?: string;
  verificationType?: string;
}

export interface SupabaseGenerateLinkOptions {
  redirectTo?: string;
}

export interface ListUsersResult {
  users: SupabaseUser[];
}

export interface UpdateUserMetadataPayload {
  [key: string]: unknown;
}

export interface ISupabaseAuthService {
  signUp(data: SignUpData): Promise<Result<SupabaseUser>>;

  signIn(email: string, password: string): Promise<Result<SupabaseSession>>;

  signOut(accessToken: string, userId?: string): Promise<Result<void>>;

  verifyEmail(token: string, email?: string): Promise<Result<void>>;

  resetPassword(email: string): Promise<Result<void>>;

  updatePassword(
    accessToken: string,
    newPassword: string,
    refreshToken?: string,
  ): Promise<Result<void>>;

  getUser(accessToken: string): Promise<Result<SupabaseUser>>;

  getUserById(userId: string): Promise<Result<SupabaseUser>>;

  updateUserMetadata(
    userId: string,
    metadata: UpdateUserMetadataPayload,
  ): Promise<Result<SupabaseUser>>;

  refreshToken(refreshToken: string): Promise<Result<SupabaseSession>>;

  listUsers(params: { page?: number; perPage?: number }): Promise<Result<ListUsersResult>>;

  deleteUser(userId: string): Promise<Result<void>>;

  confirmEmailByEmail(email: string): Promise<Result<void>>;

  generateVerificationLink(
    email: string,
    options?: SupabaseGenerateLinkOptions,
  ): Promise<Result<SupabaseGeneratedLink>>;

  generatePasswordResetLink(
    email: string,
    options?: SupabaseGenerateLinkOptions,
  ): Promise<Result<SupabaseGeneratedLink>>;
}

export const ISupabaseAuthService = Symbol('ISupabaseAuthService');

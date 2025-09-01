import { Result } from '@shared/types/result.type';

/**
 * Interface do caso de uso de logout
 */
export interface ISignOutUseCase {
  execute(input: SignOutInput): Promise<Result<SignOutOutput>>;
}

export interface SignOutInput {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  allDevices?: boolean;
}

export interface SignOutOutput {
  message: string;
  revokedSessions: number;
}

export const ISignOutUseCase = Symbol('ISignOutUseCase');
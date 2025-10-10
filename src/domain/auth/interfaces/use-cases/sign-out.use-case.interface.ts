import { Result } from '../../../../shared/types/result.type';

export interface ISignOutUseCase {
  execute(input: SignOutInput): Promise<Result<SignOutOutput>>;
  executeOrThrow(input: SignOutInput): Promise<SignOutOutput>;
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

import { Result } from '@shared/types/result.type';

export interface IValidateTwoFAUseCase {
  execute(input: ValidateTwoFAInput): Promise<Result<ValidateTwoFAOutput>>;
}

export interface ValidateTwoFAInput {
  userId: string;
  tempToken: string;
  code: string;
  trustDevice?: boolean;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
  };
}

export interface ValidateTwoFAOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
  };
}

export const IValidateTwoFAUseCase = Symbol('IValidateTwoFAUseCase');

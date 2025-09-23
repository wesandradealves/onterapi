import { Result } from '@shared/types/result.type';

export interface ISendTwoFAUseCase {
  execute(input: SendTwoFAInput): Promise<Result<SendTwoFAOutput>>;
}

export interface SendTwoFAInput {
  userId: string;
  tempToken: string;
  method?: 'sms' | 'email' | 'authenticator';
}

export interface SendTwoFAOutput {
  sentTo: string;
  method: 'sms' | 'email' | 'authenticator';
  expiresIn: number;
  attemptsRemaining: number;
}

export const ISendTwoFAUseCase = Symbol('ISendTwoFAUseCase');

import { QueryRunner } from 'typeorm';
import { Result } from '@shared/types/result.type';
import { RolesEnum } from '../../enums/roles.enum';

/**
 * Interface do caso de uso de cadastro
 */
export interface ISignUpUseCase {
  execute(
    input: SignUpInput,
    externalRunner?: QueryRunner,
  ): Promise<Result<SignUpOutput>>;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  cpf: string;
  phone?: string;
  role: RolesEnum;
  tenantId?: string;
  acceptTerms: boolean;
}

export interface SignUpOutput {
  userId: string;
  email: string;
  requiresEmailVerification: boolean;
}

export const ISignUpUseCase = Symbol('ISignUpUseCase');
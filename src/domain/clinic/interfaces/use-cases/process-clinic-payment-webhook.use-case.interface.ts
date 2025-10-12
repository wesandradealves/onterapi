import { Result } from '../../../../shared/types/result.type';
import { ProcessClinicPaymentWebhookInput } from '../../types/clinic.types';

export interface IProcessClinicPaymentWebhookUseCase {
  execute(input: ProcessClinicPaymentWebhookInput): Promise<Result<void>>;
  executeOrThrow(input: ProcessClinicPaymentWebhookInput): Promise<void>;
}

export const IProcessClinicPaymentWebhookUseCase = Symbol('IProcessClinicPaymentWebhookUseCase');

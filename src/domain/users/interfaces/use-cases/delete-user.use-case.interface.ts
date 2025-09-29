import { Result } from '../../../../shared/types/result.type';

export interface IDeleteUserUseCase {
  execute(slug: string, currentUserId: string): Promise<Result<void>>;
  executeOrThrow(slug: string, currentUserId: string): Promise<void>;
}

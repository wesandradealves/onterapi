import { Result } from '../../../../shared/types/result.type';

export interface IDeleteUserUseCase {
  execute(id: string, currentUserId: string): Promise<Result<void>>;
}

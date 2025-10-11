import { Result } from '../types/result.type';

export interface ExecutableUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput>>;
  executeOrThrow(input: TInput): Promise<TOutput>;
}

import { Logger } from '@nestjs/common';
import { failure, Result } from '../types/result.type';
import { ExecutableUseCase } from './executable.interface';

export abstract class BaseUseCase<TInput, TOutput> implements ExecutableUseCase<TInput, TOutput> {
  protected abstract logger: Logger;

  async execute(input: TInput): Promise<Result<TOutput>> {
    try {
      const result = await this.handle(input);
      return { data: result };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

      this.logger.error(`Error in ${this.constructor.name}`, normalizedError);
      return failure(normalizedError);
    }
  }

  async executeOrThrow(input: TInput): Promise<TOutput> {
    const result = await this.execute(input);

    if ('error' in result && result.error) {
      throw result.error;
    }

    return result.data as TOutput;
  }

  protected abstract handle(input: TInput): Promise<TOutput>;
}

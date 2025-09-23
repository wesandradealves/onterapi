import { Logger } from '@nestjs/common';
import { Result } from '../types/result.type';

export abstract class BaseUseCase<TInput, TOutput> {
  protected abstract logger: Logger;

  async execute(input: TInput): Promise<Result<TOutput>> {
    try {
      const result = await this.handle(input);
      return { data: result };
    } catch (error) {
      this.logger.error(`Error in ${this.constructor.name}`, error);
      return { error: error as Error };
    }
  }

  protected abstract handle(input: TInput): Promise<TOutput>;
}

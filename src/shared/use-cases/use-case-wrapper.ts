import { Logger } from '@nestjs/common';
import { BaseUseCase } from './base.use-case';
import { Result } from '../types/result.type';

export class UseCaseWrapper<TInput, TOutput> {
  private readonly internalUseCase: InternalUseCase<TInput, TOutput>;

  constructor(
    private readonly logger: Logger,
    private readonly handler: (input: TInput) => Promise<TOutput>,
  ) {
    this.internalUseCase = new InternalUseCase<TInput, TOutput>(logger, handler);
  }

  async execute(input: TInput): Promise<Result<TOutput>> {
    return this.internalUseCase.execute(input);
  }
}

class InternalUseCase<TInput, TOutput> extends BaseUseCase<TInput, TOutput> {
  protected readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly handlerFn: (input: TInput) => Promise<TOutput>,
  ) {
    super();
    this.logger = logger;
  }

  protected async handle(input: TInput): Promise<TOutput> {
    return this.handlerFn(input);
  }
}

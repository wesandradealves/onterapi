import { BaseUseCase } from '@shared/use-cases/base.use-case';

class ExampleUseCase extends BaseUseCase<number, number> {
  public readonly errors: Error[] = [];
  protected logger = {
    error: (message: string, error: Error) => {
      this.errors.push(new Error(message + ':' + error.message));
    },
  } as any;

  constructor(private readonly canFail = false) {
    super();
  }

  protected async handle(input: number): Promise<number> {
    if (this.canFail) {
      throw new Error('failure');
    }
    return input + 1;
  }
}

describe('BaseUseCase', () => {
  it('resolve com dados quando handle executa com sucesso', async () => {
    const useCase = new ExampleUseCase();

    const result = await useCase.execute(1);

    expect(result.data).toBe(2);
    expect(result.error).toBeUndefined();
    expect(useCase.errors).toHaveLength(0);
  });

  it('retorna erro e registra log quando handle falha', async () => {
    const useCase = new ExampleUseCase(true);

    const result = await useCase.execute(1);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(useCase.errors).toHaveLength(1);
    expect(useCase.errors[0].message).toContain('failure');
  });
});

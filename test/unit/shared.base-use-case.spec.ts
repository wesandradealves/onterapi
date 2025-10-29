import { BaseUseCase } from '@shared/use-cases/base.use-case';

class ExampleUseCase extends BaseUseCase<number, number> {
  public readonly errors: Error[] = [];
  protected logger = {
    error: (message: string, error: Error) => {
      this.errors.push(new Error(`${message}:${error.message}`));
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

class NonErrorExampleUseCase extends BaseUseCase<number, number> {
  public readonly errors: Error[] = [];
  protected logger = {
    error: (message: string, error: Error) => {
      this.errors.push(new Error(`${message}:${error.message}`));
    },
  } as any;

  protected async handle(input: number): Promise<number> {
    if (input < 0) {
      throw 'boom';
    }
    if (input === 0) {
      throw undefined;
    }
    return input * 2;
  }
}

describe('BaseUseCase', () => {
  it('resolve com dados quando handle executa com sucesso', async () => {
    const useCase = new ExampleUseCase();

    const result = await useCase.execute(1);

    expect(result.data).toBe(2);
    expect(useCase.errors).toHaveLength(0);
  });

  it('lanca erro e registra log quando handle falha', async () => {
    const useCase = new ExampleUseCase(true);

    await expect(useCase.execute(1)).rejects.toThrow('failure');
    expect(useCase.errors).toHaveLength(1);
    expect(useCase.errors[0].message).toContain('failure');
  });

  it('retorna o dado bruto via executeOrThrow', async () => {
    const useCase = new ExampleUseCase();

    await expect(useCase.executeOrThrow(2)).resolves.toBe(3);
  });

  it('normaliza erros que nao extendem Error antes de relancar', async () => {
    const useCase = new NonErrorExampleUseCase();

    await expect(useCase.execute(-1)).rejects.toThrow('boom');
    await expect(useCase.executeOrThrow(-2)).rejects.toThrow('boom');
    expect(useCase.errors).toHaveLength(2);
    expect(useCase.errors[0].message).toContain('boom');
  });

  it('aplica mensagem padrao quando erro indefinido e lan ado', async () => {
    const useCase = new NonErrorExampleUseCase();

    await expect(useCase.execute(0)).rejects.toThrow('Unknown error');
    expect(useCase.errors).toHaveLength(1);
    expect(useCase.errors[0].message).toContain('Unknown error');
  });
});

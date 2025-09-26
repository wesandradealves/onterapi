import { FindUserBySlugUseCase } from '@modules/users/use-cases/find-user-by-slug.use-case';
import { IUserRepository } from '@domain/users/interfaces/repositories/user.repository.interface';
import { unwrapResult } from '@shared/types/result.type';

describe('FindUserBySlugUseCase', () => {
  const user = { id: 'user-id', slug: 'john-doe' } as any;
  let repository: jest.Mocked<IUserRepository>;
  let useCase: FindUserBySlugUseCase;

  beforeEach(() => {
    repository = {
      findBySlug: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new FindUserBySlugUseCase(repository);
  });

  it('normaliza slug e retorna usuario', async () => {
    repository.findBySlug.mockResolvedValue(user);

    const result = await useCase.execute('  John-Doe  ');

    expect(repository.findBySlug).toHaveBeenCalledWith('john-doe');
    expect(unwrapResult(result)).toBe(user);
  });

  it('lança erro quando slug vazio', async () => {
    const result = await useCase.execute('   ');

    expect(result.error).toBeInstanceOf(Error);
    expect(repository.findBySlug).not.toHaveBeenCalled();
  });

  it('lança erro quando usuario não encontrado', async () => {
    repository.findBySlug.mockResolvedValue(null);

    const result = await useCase.execute('john-doe');

    expect(result.error).toBeInstanceOf(Error);
  });
});

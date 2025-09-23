import { Inject, Injectable, Logger } from '@nestjs/common';
import { IFindUserBySlugUseCase } from '../../../domain/users/interfaces/use-cases/find-user-by-slug.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class FindUserBySlugUseCase
  extends BaseUseCase<string, UserEntity | null>
  implements IFindUserBySlugUseCase
{
  protected readonly logger = new Logger(FindUserBySlugUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  async execute(slug: string): Promise<Result<UserEntity | null>> {
    return super.execute(slug);
  }

  protected async handle(slug: string): Promise<UserEntity | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      throw AuthErrorFactory.userNotFound();
    }

    const user = await this.userRepository.findBySlug(normalizedSlug);

    if (!user) {
      throw AuthErrorFactory.userNotFound();
    }

    return user;
  }
}

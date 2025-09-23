import { Inject, Injectable, Logger } from '@nestjs/common';
import { IFindUserByIdUseCase } from '../../../domain/users/interfaces/use-cases/find-user-by-id.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { UserMapper } from '../../../shared/mappers/user.mapper';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class FindUserByIdUseCase
  extends BaseUseCase<string, UserEntity | null>
  implements IFindUserByIdUseCase
{
  protected readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {
    super();
  }

  async execute(id: string): Promise<Result<UserEntity | null>> {
    return super.execute(id);
  }

  protected async handle(id: string): Promise<UserEntity | null> {
    const userResult = await this.supabaseAuthService.getUserById(id);

    if (userResult.error || !userResult.data) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: id });
    }

    const user = UserMapper.fromSupabaseToEntity(userResult.data);

    this.logger.log(`${MESSAGES.LOGS.USER_FOUND}: ${user.email}`);

    return user;
  }
}

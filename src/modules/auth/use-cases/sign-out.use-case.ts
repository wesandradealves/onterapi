import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ISignOutUseCase, SignOutInput, SignOutOutput } from '../../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MESSAGES } from '../../../shared/constants/messages.constants';

@Injectable()
export class SignOutUseCase extends BaseUseCase<SignOutInput, SignOutOutput> implements ISignOutUseCase {
  protected readonly logger = new Logger(SignOutUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: SignOutInput): Promise<SignOutOutput> {
      let revokedCount = 0;

      if (input.allDevices) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const result = await queryRunner.manager
            .createQueryBuilder()
            .update('user_sessions')
            .set({
              revokedAt: new Date(),
              revokedReason: 'User signed out from all devices',
            })
            .where('userId = :userId', { userId: input.userId })
            .andWhere('revokedAt IS NULL')
            .execute();

          revokedCount = result.affected || 0;
          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      } else if (input.refreshToken) {
        await this.authRepository.removeRefreshToken(input.refreshToken);
        revokedCount = 1;
      }

      const supabaseResult = await this.supabaseAuthService.signOut(input.accessToken);
      if (supabaseResult.error) {
        this.logger.warn(MESSAGES.LOGS.SUPABASE_LOGOUT_ERROR, supabaseResult.error);
      }

      const output: SignOutOutput = {
        message: input.allDevices 
          ? 'Logout realizado em todos os dispositivos' 
          : 'Logout realizado com sucesso',
        revokedSessions: revokedCount,
      };

      const event = DomainEvents.userLoggedOut(input.userId, {
        allDevices: input.allDevices,
        revokedCount,
      });
      await this.messageBus.publish(event);

      this.logger.log(`Logout realizado para usuário ${input.userId}`);
      return output;
  }
}
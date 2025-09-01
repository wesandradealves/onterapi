import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ISignOutUseCase, SignOutInput, SignOutOutput } from '@domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '@shared/types/result.type';

@Injectable()
export class SignOutUseCase implements ISignOutUseCase {
  private readonly logger = new Logger(SignOutUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(input: SignOutInput): Promise<Result<SignOutOutput>> {
    try {
      let revokedCount = 0;

      if (input.allDevices) {
        // Revogar todas as sessões do usuário
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
        // Revogar apenas a sessão específica
        await this.authRepository.removeRefreshToken(input.refreshToken);
        revokedCount = 1;
      }

      // Fazer logout no Supabase
      const supabaseResult = await this.supabaseAuthService.signOut(input.accessToken);
      if (supabaseResult.error) {
        this.logger.warn('Erro ao fazer logout no Supabase', supabaseResult.error);
      }

      const output: SignOutOutput = {
        message: input.allDevices 
          ? 'Logout realizado em todos os dispositivos' 
          : 'Logout realizado com sucesso',
        revokedSessions: revokedCount,
      };

      this.logger.log(`Logout realizado para usuário ${input.userId}`);
      return { data: output };
    } catch (error) {
      this.logger.error('Erro ao fazer logout', error);
      return { error: error as Error };
    }
  }
}
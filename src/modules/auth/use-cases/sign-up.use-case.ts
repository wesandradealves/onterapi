import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ISignUpUseCase, SignUpInput, SignUpOutput } from '../../../domain/auth/interfaces/use-cases/sign-up.use-case.interface';
import { IAuthRepository } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';
import { createSavepoint, rollbackToSavepoint, generateSavepointId } from '../../../shared/utils/db-connection.util';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

@Injectable()
export class SignUpUseCase implements ISignUpUseCase {
  private readonly logger = new Logger(SignUpUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(
    input: SignUpInput,
    externalRunner?: QueryRunner,
  ): Promise<Result<SignUpOutput>> {
    const runner = externalRunner ?? this.dataSource.createQueryRunner();
    const isExternalRunner = !!externalRunner;

    if (!isExternalRunner) {
      await runner.connect();
      await runner.startTransaction();
    }

    try {
      // Validar unicidade do email
      const emailSavepoint = generateSavepointId();
      await createSavepoint(runner.manager, emailSavepoint);

      const existingUserByEmail = await this.authRepository.findByEmail(input.email, runner);
      if (existingUserByEmail) {
        await rollbackToSavepoint(runner.manager, emailSavepoint);
        return { error: new Error('Email já cadastrado') };
      }

      // Validar unicidade do CPF
      const cpfSavepoint = generateSavepointId();
      await createSavepoint(runner.manager, cpfSavepoint);

      const existingUserByCpf = await this.authRepository.findByCpf(input.cpf, runner);
      if (existingUserByCpf) {
        await rollbackToSavepoint(runner.manager, cpfSavepoint);
        return { error: new Error('CPF já cadastrado') };
      }

      // Validar se role de clínica precisa de tenant
      if (this.isClinicRole(input.role) && !input.tenantId) {
        return { error: new Error('Usuários de clínica precisam de um tenant') };
      }

      // Criar usuário no Supabase
      const supabaseSavepoint = generateSavepointId();
      await createSavepoint(runner.manager, supabaseSavepoint);

      const supabaseResult = await this.supabaseAuthService.signUp({
        email: input.email,
        password: input.password,
        metadata: {
          name: input.name,
          cpf: input.cpf,
          role: input.role,
          tenantId: input.tenantId,
        },
      });

      if (supabaseResult.error) {
        await rollbackToSavepoint(runner.manager, supabaseSavepoint);
        this.logger.error('Erro ao criar usuário no Supabase', supabaseResult.error);
        return { error: new Error('Erro ao criar usuário') };
      }

      // Criar usuário no banco local
      const dbSavepoint = generateSavepointId();
      await createSavepoint(runner.manager, dbSavepoint);

      try {
        const user = await this.authRepository.create(
          {
            supabaseId: supabaseResult.data.id,
            email: input.email,
            name: input.name,
            cpf: input.cpf,
            phone: input.phone,
            role: input.role,
            tenantId: input.tenantId,
            emailVerified: false,
            isActive: true,
          },
          runner,
        );

        if (!isExternalRunner) {
          await runner.commitTransaction();
        }

        const output: SignUpOutput = {
          userId: user.id,
          email: user.email,
          requiresEmailVerification: true,
        };

        this.logger.log(`Usuário criado com sucesso: ${user.email}`);
        return { data: output };
      } catch (dbError) {
        await rollbackToSavepoint(runner.manager, dbSavepoint);
        this.logger.error('Erro ao salvar usuário no banco local', dbError);
        
        // Tentar deletar usuário do Supabase em caso de erro
        // Note: Isso pode falhar se o Supabase não suportar, mas tentamos
        // await this.supabaseAuthService.deleteUser(supabaseResult.data.id);
        
        throw dbError;
      }
    } catch (error) {
      if (!isExternalRunner) {
        await runner.rollbackTransaction();
      }
      this.logger.error('Erro no cadastro de usuário', error);
      return { error: error as Error };
    } finally {
      if (!isExternalRunner) {
        await runner.release();
      }
    }
  }

  private isClinicRole(role: RolesEnum): boolean {
    const clinicRoles = [
      RolesEnum.CLINIC_OWNER,
      RolesEnum.PROFESSIONAL,
      RolesEnum.SECRETARY,
      RolesEnum.MANAGER,
    ];
    return clinicRoles.includes(role);
  }
}
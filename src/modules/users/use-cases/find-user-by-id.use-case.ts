import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { IFindUserByIdUseCase } from '../../../domain/users/interfaces/use-cases/find-user-by-id.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';

@Injectable()
export class FindUserByIdUseCase implements IFindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(id: string): Promise<UserEntity | null> {
    try {
      const userResult = await this.supabaseAuthService.getUserById(id);

      if (userResult.error || !userResult.data) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const supabaseUser = userResult.data;
      const metadata = (supabaseUser as any).user_metadata || {};

      const user: UserEntity = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: metadata.name || '',
        cpf: metadata.cpf || '',
        phone: metadata.phone || '',
        role: metadata.role || 'PATIENT',
        tenantId: metadata.tenantId || null,
        isActive: !(supabaseUser as any).banned_until,
        emailVerified: !!(supabaseUser as any).email_confirmed_at,
        twoFactorEnabled: metadata.twoFactorEnabled || false,
        lastLoginAt: (supabaseUser as any).last_sign_in_at ? new Date((supabaseUser as any).last_sign_in_at) : null,
        createdAt: new Date(supabaseUser.created_at),
        updatedAt: new Date((supabaseUser as any).updated_at || supabaseUser.created_at),
      } as UserEntity;

      this.logger.log(`Usuário encontrado: ${user.email}`);

      return user;
    } catch (error) {
      this.logger.error('Erro ao buscar usuário', error);
      throw error;
    }
  }
}
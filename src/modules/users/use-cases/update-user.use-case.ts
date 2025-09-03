import { Injectable, Logger, Inject } from '@nestjs/common';
import { IUpdateUserUseCase } from '../../../domain/users/interfaces/use-cases/update-user.use-case.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { UpdateUserDto } from '../api/dtos/update-user.dto';
import { updateUserSchema } from '../api/schemas/update-user.schema';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class UpdateUserUseCase implements IUpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(id: string, dto: UpdateUserDto, currentUserId: string): Promise<UserEntity> {
    try {
      const validatedData = updateUserSchema.parse(dto);

      const userResult = await this.supabaseAuthService.getUserById(id);
      if (userResult.error || !userResult.data) {
        throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND, { userId: id });
      }

      const currentMetadata = (userResult.data as any).user_metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        ...validatedData,
        updatedBy: currentUserId,
        updatedAt: new Date().toISOString(),
      };

      const updateResult = await this.supabaseAuthService.updateUserMetadata(id, updatedMetadata);
      if (updateResult.error) {
        throw updateResult.error;
      }

      const updatedUser = updateResult.data;
      const metadata = (updatedUser as any).metadata || {};

      const user = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: metadata.name || '',
        cpf: metadata.cpf || '',
        phone: metadata.phone || '',
        role: metadata.role || 'PATIENT',
        tenantId: metadata.tenantId || null,
        isActive: metadata.isActive !== false,
        emailVerified: updatedUser.emailVerified,
        twoFactorEnabled: metadata.twoFactorEnabled || false,
        lastLoginAt: null,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      } as unknown as UserEntity;

      this.logger.log(`Usuário atualizado: ${user.email} por ${currentUserId}`);

      return user;
    } catch (error) {
      this.logger.error('Erro ao atualizar usuário', error);
      throw error;
    }
  }
}
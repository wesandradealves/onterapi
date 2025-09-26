import { UserEntity } from '../../../../infrastructure/auth/entities/user.entity';
import { CreateUserResponseDto } from '../dtos/create-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { CPFUtils } from '../../../../shared/utils/cpf.utils';

export const UserPresenter = {
  toResponse(user: UserEntity, maskCpf: boolean = true): UserResponseDto {
    return {
      id: user.id,
      slug: user.slug,
      email: user.email,
      name: user.name,
      cpf: maskCpf ? CPFUtils.mask(user.cpf) : user.cpf,
      phone: user.phone ?? undefined,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  toCreateResponse(user: UserEntity): CreateUserResponseDto {
    const response = this.toResponse(user);
    return {
      id: response.id,
      slug: response.slug,
      email: response.email,
      name: response.name,
      cpf: response.cpf,
      phone: response.phone,
      role: response.role,
      tenantId: response.tenantId,
      isActive: response.isActive,
      emailVerified: response.emailVerified,
      twoFactorEnabled: response.twoFactorEnabled,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  },
};

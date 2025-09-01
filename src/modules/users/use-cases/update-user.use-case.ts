import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { IUpdateUserUseCase } from '../../../domain/users/interfaces/use-cases/update-user.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { UpdateUserDto } from '../api/dtos/update-user.dto';
import { updateUserSchema } from '../api/schemas/update-user.schema';

@Injectable()
export class UpdateUserUseCase implements IUpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, dto: UpdateUserDto, currentUserId: string): Promise<UserEntity> {
    try {
      const validatedData = updateUserSchema.parse(dto);

      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const updatedUser = await this.userRepository.update(id, validatedData);

      this.logger.log(`Usuário atualizado: ${updatedUser.email} por ${currentUserId}`);

      return updatedUser;
    } catch (error) {
      this.logger.error('Erro ao atualizar usuário', error);
      throw error;
    }
  }
}
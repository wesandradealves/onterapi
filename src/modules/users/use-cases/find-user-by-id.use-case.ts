import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { IFindUserByIdUseCase } from '../../../domain/users/interfaces/use-cases/find-user-by-id.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';

@Injectable()
export class FindUserByIdUseCase implements IFindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<UserEntity | null> {
    try {
      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      this.logger.log(`Usuário encontrado: ${user.email}`);

      return user;
    } catch (error) {
      this.logger.error('Erro ao buscar usuário', error);
      throw error;
    }
  }
}
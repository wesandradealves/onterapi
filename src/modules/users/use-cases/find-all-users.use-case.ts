import { Injectable, Logger, Inject } from '@nestjs/common';
import { IFindAllUsersUseCase } from '../../../domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { ListUsersDto } from '../api/dtos/list-users.dto';

@Injectable()
export class FindAllUsersUseCase implements IFindAllUsersUseCase {
  private readonly logger = new Logger(FindAllUsersUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(filters: ListUsersDto): Promise<{
    data: UserEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;

      const { data, total } = await this.userRepository.findAll({
        page,
        limit,
        role: filters.role,
        tenantId: filters.tenantId,
        isActive: filters.isActive,
      });

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Listando ${data.length} usuários de ${total} total`);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao listar usuários', error);
      throw error;
    }
  }
}
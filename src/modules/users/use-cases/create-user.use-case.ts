import { Injectable, ConflictException, Logger, Inject } from '@nestjs/common';
import { ICreateUserUseCase } from '../../../domain/users/interfaces/use-cases/create-user.use-case.interface';
import { IUserRepository } from '../../../domain/users/interfaces/repositories/user.repository.interface';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { CreateUserInputDTO } from '../api/dtos/create-user.dto';
import { createUserSchema } from '../api/schemas/create-user.schema';
import { hashPassword } from '../../../shared/utils/crypto.util';
import { SupabaseService } from '../../../infrastructure/auth/services/supabase.service';

@Injectable()
export class CreateUserUseCase implements ICreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly supabaseService: SupabaseService,
  ) {}

  async execute(dto: CreateUserInputDTO): Promise<UserEntity> {
    try {
      const validatedData = createUserSchema.parse(dto);

      const emailExists = !(await this.userRepository.checkUniqueness('email', validatedData.email));
      if (emailExists) {
        throw new ConflictException('Email já cadastrado');
      }

      const cpfExists = !(await this.userRepository.checkUniqueness('cpf', validatedData.cpf));
      if (cpfExists) {
        throw new ConflictException('CPF já cadastrado');
      }

      const { user: supabaseUser, error } = await this.supabaseService.createUser(
        validatedData.email,
        validatedData.password,
      );

      if (error || !supabaseUser) {
        this.logger.error('Erro ao criar usuário no Supabase', error);
        throw new Error('Erro ao criar usuário');
      }

      const hashedPassword = await hashPassword(validatedData.password);

      const user = await this.userRepository.create({
        ...validatedData,
        supabaseId: supabaseUser.id,
        isActive: true,
        emailVerified: false,
      });

      this.logger.log(`Usuário criado com sucesso: ${user.email}`);

      return user;
    } catch (error) {
      this.logger.error('Erro ao criar usuário', error);
      throw error;
    }
  }
}
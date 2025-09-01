import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../infrastructure/auth/entities/user.entity';
import { UsersController } from './api/controllers/users.controller';
import { UserRepository } from '../../infrastructure/users/repositories/user.repository';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { FindUserByIdUseCase } from './use-cases/find-user-by-id.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeleteUserUseCase } from './use-cases/delete-user.use-case';
import { UserOwnerGuard } from './guards/user-owner.guard';
import { SupabaseService } from '../../infrastructure/auth/services/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [
    // Repository
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    // Use Cases
    {
      provide: 'ICreateUserUseCase',
      useClass: CreateUserUseCase,
    },
    {
      provide: 'IFindAllUsersUseCase',
      useClass: FindAllUsersUseCase,
    },
    {
      provide: 'IFindUserByIdUseCase',
      useClass: FindUserByIdUseCase,
    },
    {
      provide: 'IUpdateUserUseCase',
      useClass: UpdateUserUseCase,
    },
    {
      provide: 'IDeleteUserUseCase',
      useClass: DeleteUserUseCase,
    },
    // Guards
    UserOwnerGuard,
    // Services
    SupabaseService,
  ],
  exports: ['IUserRepository'],
})
export class UsersModule {}
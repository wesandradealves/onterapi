import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './api/controllers/users.controller';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { FindUserBySlugUseCase } from './use-cases/find-user-by-slug.use-case';
import { UpdateUserUseCase } from './use-cases/update-user.use-case';
import { DeleteUserUseCase } from './use-cases/delete-user.use-case';
import { UserOwnerGuard } from './guards/user-owner.guard';
import { SupabaseService } from '../../infrastructure/auth/services/supabase.service';
import { AuthModule } from '../auth/auth.module';
import { UserRepository } from '../../infrastructure/users/repositories/user.repository';
import { UserEntity } from '../../infrastructure/auth/entities/user.entity';
import { MessageBus } from '../../shared/messaging/message-bus';
import { FindUserBySlugUseCaseToken } from '../../domain/users/interfaces/use-cases/find-user-by-slug.use-case.interface';

@Module({
  imports: [ConfigModule, forwardRef(() => AuthModule), TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'ICreateUserUseCase',
      useClass: CreateUserUseCase,
    },
    {
      provide: 'IFindAllUsersUseCase',
      useClass: FindAllUsersUseCase,
    },
    {
      provide: FindUserBySlugUseCaseToken,
      useClass: FindUserBySlugUseCase,
    },
    {
      provide: 'IUpdateUserUseCase',
      useClass: UpdateUserUseCase,
    },
    {
      provide: 'IDeleteUserUseCase',
      useClass: DeleteUserUseCase,
    },
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserBySlugUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    UserOwnerGuard,
    SupabaseService,
    MessageBus,
  ],
  exports: [],
})
export class UsersModule {}

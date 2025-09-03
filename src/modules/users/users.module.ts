import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './api/controllers/users.controller';
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
    ConfigModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: 'IUserRepository',
      useValue: {},
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
    CreateUserUseCase,
    FindAllUsersUseCase,
    FindUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    UserOwnerGuard,
    SupabaseService,
  ],
  exports: [],
})
export class UsersModule {}
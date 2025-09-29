import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { UserOwnerGuard } from '../../guards/user-owner.guard';
import { Public } from '../../../auth/decorators/public.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { ICreateUserUseCase } from '../../../../domain/users/interfaces/use-cases/create-user.use-case.interface';
import { IFindAllUsersUseCase } from '../../../../domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import {
  FindUserBySlugUseCaseToken,
  IFindUserBySlugUseCase,
} from '../../../../domain/users/interfaces/use-cases/find-user-by-slug.use-case.interface';
import { IUpdateUserUseCase } from '../../../../domain/users/interfaces/use-cases/update-user.use-case.interface';
import { IDeleteUserUseCase } from '../../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { CreateUserInputDTO, CreateUserResponseDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { ListUsersResponseDto } from '../dtos/list-users.dto';
import { UserPresenter } from '../presenters/user.presenter';
import { createUserSchema, CreateUserSchemaType } from '../schemas/create-user.schema';
import { updateUserSchema, UpdateUserSchemaType } from '../schemas/update-user.schema';
import { listUsersSchema, ListUsersSchema } from '../schemas/list-users.schema';
import {
  toCreateUserCommand,
  toUpdateUserInput,
  toUserFilters,
} from '../mappers/user-request.mapper';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject('ICreateUserUseCase')
    private readonly createUserUseCase: ICreateUserUseCase,
    @Inject('IFindAllUsersUseCase')
    private readonly findAllUsersUseCase: IFindAllUsersUseCase,
    @Inject(FindUserBySlugUseCaseToken)
    private readonly findUserBySlugUseCase: IFindUserBySlugUseCase,
    @Inject('IUpdateUserUseCase')
    private readonly updateUserUseCase: IUpdateUserUseCase,
    @Inject('IDeleteUserUseCase')
    private readonly deleteUserUseCase: IDeleteUserUseCase,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar novo usuário',
    description: `Cadastro de novo usuário no sistema.

**Funcionalidades:**
- Cria usuário no Supabase Auth
- Valida CPF brasileiro
- Valida unicidade de email
- Define role e permissões
- Auto-confirma email para desenvolvimento

**Emails enviados:**
- Email de verificação com link para confirmar conta
- Email de boas-vindas com informações da plataforma

**Roles disponíveis:**
- PATIENT: Paciente
- PROFESSIONAL: Profissional de saúde
- SECRETARY: Secretária
- CLINIC_OWNER: Proprietário de clínica
- SUPER_ADMIN: Administrador do sistema

**Roles:** Público`,
  })
  @ApiBody({
    type: CreateUserInputDTO,
    description: 'Dados do novo usuário',
    examples: {
      patient: {
        summary: 'Paciente',
        value: {
          email: 'joao.silva@email.com',
          password: 'SenhaForte123!',
          name: 'João Silva',
          cpf: '12345678901',
          phone: '11999999999',
          role: 'PATIENT',
        },
      },
      professional: {
        summary: 'Profissional',
        value: {
          email: 'dra.maria@clinica.com',
          password: 'SenhaSegura456@',
          name: 'Dra. Maria Santos',
          cpf: '98765432109',
          phone: '11888888888',
          role: 'PROFESSIONAL',
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou CPF já cadastrado',
  })
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserSchemaType,
  ): Promise<CreateUserResponseDto> {
    const command = toCreateUserCommand(dto);
    const user = await this.createUserUseCase.executeOrThrow(command);
    return UserPresenter.toCreateResponse(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN_SUPORTE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos usuários',
    description: `Apenas administradores podem listar todos os usuários.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE`,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página da listagem',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limite de resultados por página',
    example: 20,
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: RolesEnum,
    description: 'Filtrar por role/perfil',
    example: RolesEnum.PATIENT,
  })
  @ApiQuery({
    name: 'tenantId',
    required: false,
    type: String,
    description: 'Filtrar por tenant (clínica)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por status ativo/inativo',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    type: ListUsersResponseDto,
  })
  async findAll(
    @Query(new ZodValidationPipe(listUsersSchema)) filters: ListUsersSchema,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ListUsersResponseDto> {
    const normalizedFilters = toUserFilters(filters, { currentUser });
    const payload = await this.findAllUsersUseCase.executeOrThrow(normalizedFilters);
    return {
      data: payload.data.map((user) => UserPresenter.toResponse(user)),
      pagination: payload.pagination,
    };
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar usuário por slug',
    description: `Administrador (SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO) ou o próprio usuário podem visualizar.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO ou o próprio usuário autenticado`,
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug do usuário',
    example: 'joao-silva',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario nao encontrado',
  })
  async findOne(@Param('slug') slug: string): Promise<UserResponseDto> {
    const user = await this.findUserBySlugUseCase.executeOrThrow(slug);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return UserPresenter.toResponse(user);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar usuário',
    description: `Administrador (SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO) ou o próprio usuário podem atualizar.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO ou o próprio usuário autenticado`,
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug do usuário',
    example: 'joao-silva',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Dados para atualizacao',
    examples: {
      updateName: {
        summary: 'Atualizar nome',
        value: {
          name: 'João Silva Santos',
        },
      },
      updatePhone: {
        summary: 'Atualizar telefone',
        value: {
          phone: '11777777777',
        },
      },
      deactivate: {
        summary: 'Desativar usuário',
        value: {
          isActive: false,
        },
      },
      updateMetadata: {
        summary: 'Atualizar metadados',
        value: {
          metadata: {
            preferredLanguage: 'en-US',
            theme: 'light',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso',
    type: UserResponseDto,
  })
  async update(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserSchemaType,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<UserResponseDto> {
    const updateInput = toUpdateUserInput(dto);
    const updated = await this.updateUserUseCase.executeOrThrow(slug, updateInput, currentUser.id);
    return UserPresenter.toResponse(updated);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deletar usuário',
    description: `Soft delete realizado por administradores (SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO) ou pelo próprio usuário.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO ou o próprio usuário autenticado`,
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug do usuário',
    example: 'joao-silva',
  })
  @ApiResponse({
    status: 204,
    description: 'Usuario deletado com sucesso',
  })
  async remove(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    await this.deleteUserUseCase.executeOrThrow(slug, currentUser.id);
  }
}

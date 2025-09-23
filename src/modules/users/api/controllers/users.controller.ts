import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
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
import { IFindUserByIdUseCase } from '../../../../domain/users/interfaces/use-cases/find-user-by-id.use-case.interface';
import { IUpdateUserUseCase } from '../../../../domain/users/interfaces/use-cases/update-user.use-case.interface';
import { IDeleteUserUseCase } from '../../../../domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { CreateUserInputDTO, CreateUserResponseDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { ListUsersDto, ListUsersResponseDto } from '../dtos/list-users.dto';
import { createUserSchema } from '../schemas/create-user.schema';
import { updateUserSchema } from '../schemas/update-user.schema';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { CPFUtils } from '../../../../shared/utils/cpf.utils';
import { UserMapper } from '../../../../shared/mappers/user.mapper';
import { AuthErrorFactory } from '../../../../shared/factories/auth-error.factory';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject('ICreateUserUseCase')
    private readonly createUserUseCase: ICreateUserUseCase,
    @Inject('IFindAllUsersUseCase')
    private readonly findAllUsersUseCase: IFindAllUsersUseCase,
    @Inject('IFindUserByIdUseCase')
    private readonly findUserByIdUseCase: IFindUserByIdUseCase,
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
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async create(@Body() dto: CreateUserInputDTO): Promise<CreateUserResponseDto> {
    const result = await this.createUserUseCase.execute(dto);
    if (result.error) {
      throw result.error;
    }
    const maskedUser = { ...result.data, cpf: CPFUtils.mask(result.data.cpf) };
    return maskedUser as UserResponseDto;
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
    example: 'PATIENT',
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
  async findAll(@Query() filters: ListUsersDto): Promise<ListUsersResponseDto> {
    const result = await this.findAllUsersUseCase.execute(filters);
    if (result.error) {
      throw result.error;
    }
    return {
      data: result.data.data.map((user) => ({ ...user, cpf: CPFUtils.mask(user.cpf) })),
      pagination: result.data.pagination,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: `Administrador (SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO) ou o próprio usuário podem visualizar.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO ou o próprio usuário autenticado`,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const result = await this.findUserByIdUseCase.execute(id);
    if (result.error) {
      throw result.error;
    }
    if (!result.data) {
      throw AuthErrorFactory.userNotFound();
    }
    const maskedUser = { ...result.data, cpf: CPFUtils.mask(result.data.cpf) };
    return maskedUser as UserResponseDto;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar usuário',
    description: `Administrador (SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO) ou o próprio usuário podem atualizar.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO ou o próprio usuário autenticado`,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Dados para atualização',
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
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<UserResponseDto> {
    const result = await this.updateUserUseCase.execute(id, dto, currentUser.id);
    if (result.error) {
      throw result.error;
    }
    const user = result.data;
    const maskedUser = { ...user, cpf: CPFUtils.mask(user.cpf) };
    return maskedUser as UserResponseDto;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deletar usuário',
    description: `Soft delete realizado por administradores (SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO) ou pelo próprio usuário.

**Roles:** SUPER_ADMIN, ADMIN_SUPORTE, ADMIN_FINANCEIRO ou o próprio usuário autenticado`,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do usuário',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 204,
    description: 'Usuário deletado com sucesso',
  })
  async remove(@Param('id') id: string, @CurrentUser() currentUser: ICurrentUser): Promise<void> {
    const result = await this.deleteUserUseCase.execute(id, currentUser.id);
    if (result.error) {
      throw result.error;
    }
  }
}

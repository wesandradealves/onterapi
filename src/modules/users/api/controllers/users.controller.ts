import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
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
    description: 'Cadastro público (auto-cadastro) ou via administrador',
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
  async create(@Body() dto: CreateUserInputDTO): Promise<CreateUserResponseDto> {
    const user = await this.createUserUseCase.execute(dto);
    return this.mapToResponse(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN_SUPORTE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos usuários',
    description: 'Apenas administradores podem listar todos os usuários',
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
    return {
      data: result.data.map(user => this.mapToResponse(user)),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: 'Administrador ou o próprio usuário podem visualizar',
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
    const user = await this.findUserByIdUseCase.execute(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    return this.mapToResponse(user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar usuário',
    description: 'Administrador ou o próprio usuário podem atualizar',
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
    const user = await this.updateUserUseCase.execute(id, dto, currentUser.id);
    return this.mapToResponse(user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deletar usuário',
    description: 'Soft delete - Administrador ou o próprio usuário podem deletar',
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
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    await this.deleteUserUseCase.execute(id, currentUser.id);
  }

  private mapToResponse(user: any): UserResponseDto {
    const cpfMasked = user.cpf
      ? `${user.cpf.slice(0, 3)}.***.***.${user.cpf.slice(-2)}`
      : '';

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      cpf: cpfMasked,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
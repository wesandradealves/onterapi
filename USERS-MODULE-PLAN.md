# 📋 Plano de Desenvolvimento - Módulo Users CRUD

## 🎯 Objetivo
Criar um módulo completo de gestão de usuários com CRUD, seguindo DDD/Clean Architecture e regras de permissão específicas.

## 📌 Regras de Negócio

### Permissões por Endpoint

| Endpoint | Método | Descrição | Permissão |
|----------|--------|-----------|-----------|
| `/users` | POST | Criar usuário | Público (auto-cadastro) OU Admin |
| `/users` | GET | Listar todos usuários | APENAS Admin (SUPER_ADMIN, ADMIN_SUPORTE) |
| `/users/:id` | GET | Buscar usuário por ID | Admin OU próprio usuário |
| `/users/:id` | PATCH | Atualizar usuário | Admin OU próprio usuário |
| `/users/:id` | DELETE | Deletar usuário | Admin OU próprio usuário |

### Validações Obrigatórias
- ✅ **CPF**: Único e válido (11 dígitos)
- ✅ **Email**: Único e formato válido
- ✅ **Senha**: Forte (mínimo 8 caracteres, maiúscula, minúscula, número, especial)
- ✅ **Telefone**: Formato brasileiro (opcional)
- ✅ **Role**: Válida do enum RolesEnum

### Roles Admin (com permissão total)
```typescript
const ADMIN_ROLES = [
  RolesEnum.SUPER_ADMIN,
  RolesEnum.ADMIN_SUPORTE,
  RolesEnum.ADMIN_FINANCEIRO
];
```

## 🏗️ Estrutura de Arquivos

### 1. Domain Layer
```
src/domain/users/
├── entities/
│   └── (reutilizar user.entity.ts do auth)
├── interfaces/
│   ├── repositories/
│   │   └── user.repository.interface.ts
│   └── use-cases/
│       ├── create-user.use-case.interface.ts
│       ├── find-all-users.use-case.interface.ts
│       ├── find-user-by-id.use-case.interface.ts
│       ├── update-user.use-case.interface.ts
│       └── delete-user.use-case.interface.ts
└── types/
    └── user.types.ts
```

### 2. Infrastructure Layer
```
src/infrastructure/users/
└── repositories/
    └── user.repository.ts
```

### 3. Application Layer
```
src/modules/users/
├── users.module.ts
├── api/
│   ├── controllers/
│   │   └── users.controller.ts
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   ├── user-response.dto.ts
│   │   └── list-users.dto.ts
│   └── schemas/
│       ├── create-user.schema.ts
│       └── update-user.schema.ts
├── use-cases/
│   ├── create-user.use-case.ts
│   ├── find-all-users.use-case.ts
│   ├── find-user-by-id.use-case.ts
│   ├── update-user.use-case.ts
│   └── delete-user.use-case.ts
└── guards/
    └── user-owner.guard.ts
```

## 📝 Implementação Detalhada

### 1. DTOs com Swagger Completo

#### create-user.dto.ts
```typescript
export class CreateUserDto {
  @ApiProperty({ 
    description: 'Email do usuário',
    example: 'usuario@email.com' 
  })
  email!: string;
  
  @ApiProperty({ 
    description: 'Senha forte',
    example: 'SenhaForte123!' 
  })
  password!: string;
  
  @ApiProperty({ 
    description: 'Nome completo',
    example: 'João Silva' 
  })
  name!: string;
  
  @ApiProperty({ 
    description: 'CPF sem formatação',
    example: '12345678901' 
  })
  cpf!: string;
  
  @ApiProperty({ 
    description: 'Telefone com DDD',
    example: '11999999999',
    required: false 
  })
  phone?: string;
  
  @ApiProperty({ 
    description: 'Role do usuário',
    enum: RolesEnum,
    example: 'PATIENT' 
  })
  role!: RolesEnum;
  
  @ApiProperty({ 
    description: 'ID do tenant (clínica)',
    example: 'clinic-123',
    required: false 
  })
  tenantId?: string;
}
```

#### update-user.dto.ts
```typescript
export class UpdateUserDto {
  @ApiProperty({ 
    description: 'Nome completo',
    required: false 
  })
  name?: string;
  
  @ApiProperty({ 
    description: 'Telefone com DDD',
    required: false 
  })
  phone?: string;
  
  @ApiProperty({ 
    description: 'Status ativo/inativo',
    required: false 
  })
  isActive?: boolean;
  
  @ApiProperty({ 
    description: 'Metadados adicionais',
    required: false 
  })
  metadata?: Record<string, any>;
  
  // Não permitir alterar: email, cpf, password, role (via este endpoint)
}
```

### 2. Controller com Guards e Swagger

```typescript
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  
  @Post()
  @Public() // Permitir auto-cadastro
  @ApiOperation({ 
    summary: 'Criar novo usuário',
    description: 'Cadastro público ou via admin' 
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201,
    description: 'Usuário criado com sucesso',
    type: UserResponseDto 
  })
  async create(@Body() dto: CreateUserDto) { }
  
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN_SUPORTE)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Listar todos usuários',
    description: 'Apenas administradores podem listar todos' 
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  async findAll(@Query() filters: ListUsersDto) { }
  
  @Get(':id')
  @UseGuards(UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Buscar usuário por ID',
    description: 'Admin ou próprio usuário' 
  })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  async findOne(@Param('id') id: string) { }
  
  @Patch(':id')
  @UseGuards(UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Atualizar usuário',
    description: 'Admin ou próprio usuário podem atualizar' 
  })
  @ApiBody({ type: UpdateUserDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: ICurrentUser
  ) { }
  
  @Delete(':id')
  @UseGuards(UserOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Deletar usuário',
    description: 'Soft delete - Admin ou próprio usuário' 
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser
  ) { }
}
```

### 3. UserOwnerGuard

```typescript
@Injectable()
export class UserOwnerGuard implements CanActivate {
  private readonly logger = new Logger(UserOwnerGuard.name);
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetUserId = request.params.id;
    
    // Admin tem acesso total
    const adminRoles = [
      RolesEnum.SUPER_ADMIN,
      RolesEnum.ADMIN_SUPORTE,
      RolesEnum.ADMIN_FINANCEIRO
    ];
    
    if (adminRoles.includes(user.role)) {
      this.logger.log(`Admin ${user.email} acessando usuário ${targetUserId}`);
      return true;
    }
    
    // Usuário só pode acessar próprios dados
    if (user.id === targetUserId) {
      return true;
    }
    
    this.logger.warn(`Acesso negado: ${user.email} tentou acessar ${targetUserId}`);
    throw new ForbiddenException('Você só pode acessar seus próprios dados');
  }
}
```

### 4. Use Cases

#### CreateUserUseCase
- Validar dados com Zod
- Verificar CPF e email únicos
- Criar usuário no Supabase Auth
- Salvar no banco local
- Enviar email de boas-vindas

#### FindAllUsersUseCase
- Paginação (default: page=1, limit=20)
- Filtros: role, tenantId, isActive
- Ordenação: createdAt DESC
- Não retornar dados sensíveis (senha, 2FA secret)

#### UpdateUserUseCase
- Validar permissões
- Atualizar apenas campos permitidos
- Criar log de auditoria
- Atualizar Supabase se necessário

#### DeleteUserUseCase
- Soft delete (deletedAt)
- Manter histórico
- Desativar no Supabase
- Cancelar sessões ativas

### 5. Schemas Zod

```typescript
// create-user.schema.ts
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordValidator,
  name: z.string().min(3).max(255),
  cpf: cpfValidator,
  phone: phoneValidator.optional(),
  role: z.nativeEnum(RolesEnum),
  tenantId: z.string().uuid().optional(),
});

// update-user.schema.ts
export const updateUserSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  phone: phoneValidator.optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});
```

## 🔐 Segurança

### Implementações Obrigatórias
- ✅ Senhas hasheadas com bcryptjs (salt rounds: 10)
- ✅ Validação de CPF único no banco
- ✅ Rate limiting: máximo 5 cadastros por IP/hora
- ✅ Auditoria: logs de todas alterações
- ✅ Soft delete para manter histórico
- ✅ Sanitização de inputs contra XSS
- ✅ Validação de UUID nos parâmetros

### Headers de Segurança
```typescript
@UseInterceptors(ClassSerializerInterceptor) // Remove campos sensíveis
@UseGuards(ThrottlerGuard) // Rate limiting
```

## 📊 Respostas da API

### UserResponseDto
```typescript
{
  id: string;
  email: string;
  name: string;
  cpf: string; // Mascarado: 123.***.***-01
  phone?: string;
  role: RolesEnum;
  tenantId?: string;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Nunca retornar: password, twoFactorSecret, backupCodes
}
```

### ListUsersResponseDto
```typescript
{
  data: UserResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

## 🧪 Testes Necessários

### Unitários
- [ ] Validações de DTOs
- [ ] Guards (UserOwnerGuard)
- [ ] Use Cases isolados
- [ ] Schemas Zod

### Integração
- [ ] Controller completo
- [ ] Repository com banco
- [ ] Integração Supabase

### E2E
- [ ] Fluxo completo de CRUD
- [ ] Validação de permissões
- [ ] Rate limiting

## 📈 Métricas de Sucesso
- Cobertura de testes > 80%
- Tempo de resposta < 200ms
- Zero vulnerabilidades de segurança
- 100% de aderência ao Swagger

## 🚀 Checklist de Implementação

### Fase 1 - Estrutura Base
- [ ] Criar estrutura de pastas
- [ ] Criar interfaces no domain
- [ ] Criar types e enums

### Fase 2 - Infrastructure
- [ ] Implementar UserRepository
- [ ] Configurar integração Supabase

### Fase 3 - Application
- [ ] Criar DTOs com Swagger
- [ ] Implementar schemas Zod
- [ ] Criar todos use cases
- [ ] Implementar UserOwnerGuard

### Fase 4 - Controller
- [ ] Implementar UsersController
- [ ] Adicionar documentação Swagger completa
- [ ] Configurar guards e decorators

### Fase 5 - Module
- [ ] Criar UsersModule
- [ ] Registrar providers
- [ ] Integrar com AppModule

### Fase 6 - Testes
- [ ] Escrever testes unitários
- [ ] Implementar testes de integração
- [ ] Criar testes E2E

### Fase 7 - Documentação
- [ ] Atualizar README
- [ ] Documentar no Swagger
- [ ] Criar exemplos de uso

---

**IMPORTANTE**: Seguir este plano rigorosamente para garantir consistência e qualidade!
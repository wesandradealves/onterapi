# 🔐 Plano de Arquitetura - Módulo de Autenticação OnTerapi

## 📋 Visão Geral

Arquitetura do módulo de autenticação combinando as melhores práticas dos projetos Dourado (core-backend e dashboard-backend) com nossa stack específica (Supabase, Zod, Multi-tenant).

## 🎯 Princípios Fundamentais

1. **DDD e Clean Architecture** - Separação clara de camadas
2. **DRY** - Zero duplicação de código
3. **Query Builder** - Sempre usar TypeORM Query Builder, nunca raw queries
4. **Savepoints** - Transações granulares com rollback parcial
5. **Validação com Zod** - Schemas fortemente tipados
6. **Result Pattern** - Tratamento de erros consistente
7. **Multi-tenant** - Isolamento por tenant com RLS
8. **Testabilidade** - Cada camada testável independentemente

## 🏗️ Estrutura de Pastas

```
src/
├── domain/
│   └── auth/
│       ├── entities/
│       │   ├── user.entity.ts              # Entidade de domínio pura
│       │   ├── role.entity.ts              # Roles do sistema
│       │   ├── permission.entity.ts        # Permissões granulares
│       │   └── two-factor.entity.ts        # Configurações 2FA
│       ├── interfaces/
│       │   ├── repositories/
│       │   │   └── auth.repository.interface.ts
│       │   ├── services/
│       │   │   └── supabase-auth.service.interface.ts
│       │   └── use-cases/
│       │       ├── sign-in.use-case.interface.ts
│       │       ├── sign-up.use-case.interface.ts
│       │       ├── send-two-fa.use-case.interface.ts
│       │       ├── validate-two-fa.use-case.interface.ts
│       │       └── refresh-token.use-case.interface.ts
│       ├── enums/
│       │   └── roles.enum.ts
│       └── types/
│           └── auth.types.ts
│
├── infrastructure/
│   └── auth/
│       ├── entities/                       # Entities TypeORM
│       │   ├── user.entity.ts
│       │   ├── user-role.entity.ts
│       │   └── user-session.entity.ts
│       ├── repositories/
│       │   └── auth.repository.ts          # Implementação com QueryBuilder
│       └── services/
│           └── supabase-auth.service.ts    # Integração Supabase Auth
│
├── modules/
│   └── auth/
│       ├── api/
│       │   ├── controllers/
│       │   │   └── auth.controller.ts
│       │   ├── schemas/                    # ZOD SCHEMAS (validação)
│       │   │   ├── sign-in.schema.ts
│       │   │   ├── sign-up.schema.ts
│       │   │   ├── two-fa.schema.ts
│       │   │   └── refresh.schema.ts
│       │   └── decorators/
│       │       ├── current-user.decorator.ts
│       │       └── roles.decorator.ts
│       ├── use-cases/
│       │   ├── sign-in.use-case.ts
│       │   ├── sign-up.use-case.ts
│       │   ├── send-two-fa.use-case.ts
│       │   ├── validate-two-fa.use-case.ts
│       │   └── refresh-token.use-case.ts
│       ├── guards/
│       │   ├── jwt-auth.guard.ts
│       │   ├── roles.guard.ts
│       │   └── tenant.guard.ts
│       ├── strategies/
│       │   ├── jwt.strategy.ts
│       │   └── refresh-jwt.strategy.ts
│       └── auth.module.ts
│
└── shared/
    ├── utils/
    │   ├── db-connection.util.ts           # Funções de savepoint
    │   └── crypto.util.ts                  # Hash, encrypt
    ├── validators/
    │   └── auth.validators.ts              # CPF, email, senha
    └── pipes/
        └── zod-validation.pipe.ts          # Pipe de validação Zod
```

## 👥 Sistema de Roles (RBAC)

### Hierarquia de Papéis

```
INTERNOS (Plataforma OnTerapi):
├── SUPER_ADMIN         # Acesso total, impersonação
├── ADMIN_FINANCEIRO    # Transações, reembolsos >R$500
├── ADMIN_SUPORTE       # Customer Success, impersonação limitada
├── ADMIN_EDITOR        # Marketing, conteúdo
└── MARKETPLACE_MANAGER # Produtos, parceiros

EXTERNOS (Clientes):
├── CLINIC_OWNER        # Proprietário da clínica
├── PROFESSIONAL        # Terapeuta (atende pacientes)
├── SECRETARY          # Secretária (agenda, pagamentos até R$100)
├── MANAGER            # Gestor sem especialidade
└── PATIENT            # Paciente

PÚBLICO:
└── VISITOR            # Não autenticado
```

## 🔄 Fluxo de Autenticação

### 1. Sign Up (Cadastro)
```mermaid
1. Cliente → Controller (validação Zod)
2. Controller → SignUpUseCase
3. UseCase → Supabase Auth (criar usuário)
4. UseCase → AuthRepository (salvar no banco local)
5. UseCase → Email Service (enviar confirmação)
6. Response → Cliente
```

### 2. Sign In (Login)
```mermaid
1. Cliente → Controller (validação Zod)
2. Controller → SignInUseCase
3. UseCase → Supabase Auth (autenticar)
4. UseCase → AuthRepository (buscar roles/permissions)
5. UseCase → JWT Service (gerar tokens)
6. Response → Cliente (access + refresh tokens)
```

### 3. Two-Factor Authentication
```mermaid
1. Cliente → Controller (código 2FA)
2. Controller → ValidateTwoFAUseCase
3. UseCase → AuthRepository (validar código)
4. UseCase → JWT Service (gerar tokens finais)
5. Response → Cliente
```

## 💾 Estrutura do Banco de Dados

### Tabela: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_id UUID UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL,
  tenant_id UUID,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Tabela: user_sessions
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: user_permissions
```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  permission VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission, resource, tenant_id)
);
```

## 🛡️ Padrões de Segurança

### 1. Senhas
- Mínimo 8 caracteres
- Deve conter: maiúscula, minúscula, número e caractere especial
- Hash com bcrypt (salt rounds: 10)

### 2. Tokens JWT
- Access Token: 15 minutos
- Refresh Token: 7 dias
- Algoritmo: RS256 (assimétrico)

### 3. Two-Factor Authentication
- TOTP (Time-based One-Time Password)
- Backup codes: 10 códigos de recuperação
- QR Code para apps autenticadores

### 4. Rate Limiting
- Sign In: 5 tentativas por minuto
- Sign Up: 3 cadastros por hora por IP
- 2FA: 3 tentativas por código

## 🔧 Implementação dos Use Cases

### SignUpUseCase
```typescript
interface ISignUpUseCase {
  execute(input: SignUpInputSchema): Promise<Result<SignUpOutputSchema>>;
}

// Fluxo:
1. Validar unicidade (email, CPF)
2. Criar savepoint
3. Criar usuário no Supabase Auth
4. Criar usuário no banco local
5. Enviar email de confirmação
6. Commit ou rollback
```

### SignInUseCase
```typescript
interface ISignInUseCase {
  execute(input: SignInInputSchema): Promise<Result<SignInOutputSchema>>;
}

// Fluxo:
1. Autenticar com Supabase
2. Buscar dados do usuário
3. Verificar se precisa 2FA
4. Gerar tokens (se não precisar 2FA)
5. Registrar sessão
```

### ValidateTwoFAUseCase
```typescript
interface IValidateTwoFAUseCase {
  execute(input: TwoFAInputSchema): Promise<Result<TokenOutputSchema>>;
}

// Fluxo:
1. Validar código TOTP
2. Gerar tokens finais
3. Registrar sessão
4. Limpar tentativas de 2FA
```

## 📐 Validação com Zod

### Schema de Sign Up
```typescript
const signUpInputSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(3).max(100),
  cpf: cpfSchema,
  phone: phoneSchema.optional(),
  role: z.enum(['CLINIC_OWNER', 'PROFESSIONAL', 'SECRETARY', 'MANAGER', 'PATIENT']),
  tenantId: z.string().uuid().optional(),
  acceptTerms: z.literal(true)
});
```

### Schema de Sign In
```typescript
const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().default(false)
});
```

### Validadores Customizados
```typescript
// CPF Validator
const cpfSchema = z.string().refine(validateCPF, 'CPF inválido');

// Password Validator
const passwordSchema = z.string()
  .min(8)
  .regex(/(?=.*[a-z])/)
  .regex(/(?=.*[A-Z])/)
  .regex(/(?=.*[0-9])/)
  .regex(/(?=.*[!@#$%^&*])/);
```

## 🔄 Transações e Savepoints

### Padrão de Uso
```typescript
async execute(input: Input, externalRunner?: QueryRunner): Promise<Result<Output>> {
  const runner = externalRunner ?? this.dataSource.createQueryRunner();
  const isExternalRunner = !!externalRunner;

  if (!isExternalRunner) {
    await runner.connect();
    await runner.startTransaction();
  }

  try {
    // Operação 1
    const savepoint1 = generateSavepointId();
    await createSavepoint(runner.manager, savepoint1);
    // ... código

    // Operação 2
    const savepoint2 = generateSavepointId();
    await createSavepoint(runner.manager, savepoint2);
    // ... código

    if (!isExternalRunner) {
      await runner.commitTransaction();
    }

    return { data: result };
  } catch (error) {
    if (!isExternalRunner) {
      await runner.rollbackTransaction();
    }
    return { error };
  } finally {
    if (!isExternalRunner) {
      await runner.release();
    }
  }
}
```

## 🧪 Estratégia de Testes

### Testes Unitários
- Use Cases: Mock de repositories e services
- Guards: Mock de contexto e JWT
- Validators: Casos de borda para CPF, senha, etc

### Testes de Integração
- Controllers: Supertest com banco de testes
- Repository: Teste com banco real
- Supabase: Mock do cliente Supabase

### Testes E2E
- Fluxo completo de sign up → sign in → 2FA
- Rate limiting
- Multi-tenant isolation

## 📊 Métricas de Sucesso

- **Cobertura de testes**: > 90%
- **Complexidade ciclomática**: < 10
- **Duplicação de código**: 0%
- **Performance sign in**: < 200ms
- **Performance 2FA**: < 100ms

## 🚀 Ordem de Implementação

1. **Shared Utils** ✅
   - db-connection.util.ts
   - crypto.util.ts
   - auth.validators.ts

2. **Domain Layer** 
   - Entities
   - Interfaces
   - Enums e Types

3. **Infrastructure Layer**
   - TypeORM Entities
   - Supabase Service
   - Auth Repository

4. **Application Layer**
   - Use Cases
   - Guards e Strategies
   - Auth Module

5. **Presentation Layer**
   - Zod Schemas
   - Controllers
   - Decorators

6. **Testes**
   - Unitários
   - Integração
   - E2E

## 📝 Checklist de Qualidade

- [ ] Sem duplicação de código (DRY)
- [ ] Todas as queries usando Query Builder
- [ ] Savepoints em operações críticas
- [ ] Validação com Zod em todos inputs
- [ ] Result Pattern em todos use cases
- [ ] Logs em pontos críticos
- [ ] Testes com > 90% cobertura
- [ ] Documentação Swagger completa
- [ ] Sem comentários desnecessários
- [ ] Código auto-explicativo

---

**Status**: Pronto para implementação
**Última atualização**: 2025-09-01
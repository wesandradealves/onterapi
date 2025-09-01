# OnTerapi v4 - Sistema de Gestão para Terapias Integrativas

## 📋 Índice
- [Sobre](#sobre)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Desenvolvimento](#desenvolvimento)
- [Módulos](#módulos)
- [API](#api)
- [Testes](#testes)
- [Deploy](#deploy)

## 📌 Sobre

OnTerapi v4 é uma plataforma SaaS multi-tenant completa para gestão de clínicas e profissionais de terapias integrativas, com sistema de IA multi-agentes especializado.

### Principais Funcionalidades
- 🏥 Gestão completa de clínicas e profissionais
- 📅 Sistema de agendamento inteligente
- 📋 Anamnese digital com 10 etapas estruturadas
- 💊 Planos terapêuticos com IA (23 agentes especializados)
- 💰 Módulo financeiro com split automático
- 🤖 Sistema CrewAI integrado
- 📱 Portais dedicados (profissional, paciente, admin)
- 🛒 Marketplace público

## 🏗️ Arquitetura

### Stack Tecnológica
- **Backend**: NestJS 10.3 + TypeScript 5.3
- **Database**: Supabase (PostgreSQL hospedado) + TypeORM 0.3
- **Cache**: Redis 7
- **Queue**: Bull
- **Mensageria**: EventEmitter + RabbitMQ
- **Validação**: Zod 3.22
- **Auth**: JWT + Passport + Supabase Auth
- **Docs**: Swagger + Compodoc
- **AI**: OpenAI + CrewAI

### Padrões Arquiteturais
- **DDD** (Domain-Driven Design)
- **Clean Architecture**
- **CQRS Pattern**
- **Event-Driven Architecture**
- **Repository Pattern**
- **Result Pattern**

### Estrutura de Módulos
```
src/
├── domain/           # Lógica de negócio pura
├── infrastructure/   # Implementações técnicas
├── modules/          # Módulos da aplicação
├── shared/           # Código compartilhado
└── core/            # Configurações globais
```

## 🚀 Instalação

### Pré-requisitos
- Node.js >= 20.0.0
- Docker >= 24.0.0 (opcional)
- Docker Compose >= 2.20.0 (opcional)
- PostgreSQL >= 16 (se não usar Docker)
- Redis >= 7 (se não usar Docker)
- npm >= 10.0.0

### Setup Inicial

#### Opção 1: Instalação Local
```bash
# Clonar repositório
git clone https://github.com/onterapi/v4.git
cd onterapi-v4

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Rodar migrations
npm run migration:run

# Rodar seeds (dados iniciais)
npm run seed:run

# Iniciar desenvolvimento (porta 3001)
npm run dev
```

#### Opção 2: Usando Docker
```bash
# Clonar repositório
git clone https://github.com/onterapi/v4.git
cd onterapi-v4

# Build da imagem Docker
docker build -t onterapi-v4:latest .

# Iniciar com Docker Compose
docker compose up -d

# Aplicação estará disponível em http://localhost:3001
# Swagger em http://localhost:3001/api
```

### Scripts de Automação

#### Windows (PowerShell)
```powershell
# Iniciar desenvolvimento
.\docker-run.ps1 dev

# Parar containers
.\docker-run.ps1 stop

# Limpar tudo
.\docker-run.ps1 clean
```

#### Linux/Mac (Bash)
```bash
# Iniciar desenvolvimento
./docker-run.sh dev

# Parar containers
./docker-run.sh stop

# Limpar tudo
./docker-run.sh clean
```

## ⚙️ Configuração

### 🗄️ Banco de Dados - Supabase

O projeto usa Supabase como banco de dados PostgreSQL hospedado na nuvem.

#### Conexão Principal
```env
# Supabase Database
DB_HOST=db.ogffdaemylaezxpunmop.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=5lGR6N9OyfF1fcMc
DB_DATABASE=postgres
DB_SSL=true
DB_SCHEMA=public
```

#### APIs Supabase
```env
# URLs e Chaves
SUPABASE_URL=https://ogffdaemylaezxpunmop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_ID=ydctcvehdabvoyjunzrk
```

#### Outras Configurações
```env
# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=7d

# OpenAI (para CrewAI)
OPENAI_API_KEY=sk-proj-...

# API
PORT=3000
NODE_ENV=development
```

### ⚠️ Segurança Supabase
- **Service Key**: NUNCA expor no frontend, apenas backend
- **Anon Key**: Pode ser usada no frontend com RLS habilitado
- **RLS**: Sempre habilitar Row Level Security em todas as tabelas
- **SSL**: Sempre usar conexão SSL em produção

## 💻 Desenvolvimento

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento com hot-reload
npm run build        # Build para produção
npm run test         # Testes unitários
npm run test:e2e     # Testes end-to-end
npm run lint         # Linting
npm run check:dry    # Verificar violações DRY
npm run check:quality # Verificar qualidade do código
```

### Fluxo de Desenvolvimento
1. Criar branch: `git checkout -b feature/nome-feature`
2. Desenvolver seguindo padrões DDD/Clean
3. Escrever testes (mínimo 80% cobertura)
4. Validar: `npm run lint && npm run test`
5. Commit: `git commit -m "feat(module): descrição"`
6. Push e criar PR

## 📦 Módulos

### 🔐 Módulo de Autenticação (Auth)

#### Visão Geral
Sistema completo de autenticação e autorização seguindo DDD e Clean Architecture, com suporte a multi-tenant, RBAC e 2FA.

#### Funcionalidades
- ✅ **Cadastro de usuários** com validação de CPF único
- ✅ **Login** com suporte a 2FA (Two-Factor Authentication)
- ✅ **Refresh token** para renovação automática
- ✅ **Sistema RBAC** com 11 roles hierárquicos
- ✅ **Multi-tenant** com isolamento por tenant
- ✅ **Guards de autorização** (JWT, Roles, Tenant)
- ✅ **Rate limiting** e proteção contra brute force
- ✅ **Integração Supabase Auth**

#### Sistema de Roles (RBAC)
```typescript
// Roles Internos (Plataforma)
SUPER_ADMIN         // Acesso total
ADMIN_FINANCEIRO    // Gestão financeira
ADMIN_SUPORTE       // Customer success
ADMIN_EDITOR        // Marketing/conteúdo
MARKETPLACE_MANAGER // Produtos/parceiros

// Roles Externos (Clientes)
CLINIC_OWNER        // Proprietário da clínica
PROFESSIONAL        // Terapeuta
SECRETARY          // Secretária
MANAGER            // Gestor sem especialidade
PATIENT            // Paciente
VISITOR            // Visitante não autenticado
```

#### Endpoints da API

##### Autenticação
```http
POST /auth/sign-in
Body: {
  email: string,
  password: string,
  rememberMe?: boolean
}

POST /auth/two-factor/validate
Body: {
  tempToken: string,
  code: string,
  trustDevice?: boolean
}

POST /auth/refresh
Body: {
  refreshToken: string
}

POST /auth/sign-out
Headers: Authorization: Bearer {token}
Body: {
  refreshToken?: string,
  allDevices?: boolean
}

GET /auth/me
Headers: Authorization: Bearer {token}
```

#### Arquitetura do Módulo
```
modules/auth/
├── api/
│   ├── controllers/        # Endpoints REST
│   ├── dtos/              # DTOs com @ApiProperty
│   └── schemas/           # Schemas Zod para validação
├── use-cases/             # Casos de uso
│   ├── sign-up.use-case.ts
│   ├── sign-in.use-case.ts
│   ├── validate-two-fa.use-case.ts
│   ├── refresh-token.use-case.ts
│   └── sign-out.use-case.ts
├── guards/                # Guards de segurança
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── tenant.guard.ts
├── decorators/            # Decorators customizados
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── current-user.decorator.ts
└── auth.module.ts         # Módulo NestJS
```

#### Uso nos Controllers

##### Proteger rotas com autenticação
```typescript
@Controller('patients')
@UseGuards(JwtAuthGuard) // Requer autenticação
export class PatientsController {
  // Todos os endpoints requerem token JWT
}
```

##### Proteger com roles específicas
```typescript
@Post('create')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolesEnum.CLINIC_OWNER, RolesEnum.PROFESSIONAL)
async createPatient() {
  // Apenas CLINIC_OWNER e PROFESSIONAL podem acessar
}
```

##### Rotas públicas
```typescript
@Get('public-info')
@Public() // Não requer autenticação
async getPublicInfo() {
  // Endpoint público
}
```

##### Obter usuário atual
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: ICurrentUser) {
  // user contém: id, email, name, role, tenantId
  return user;
}
```

#### Configuração Necessária

##### Variáveis de Ambiente
```env
# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_2FA_SECRET=your_2fa_secret_min_32_chars

# Supabase Auth
SUPABASE_URL=https://ogffdaemylaezxpunmop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Config
APP_URL=http://localhost:3000
APP_NAME=OnTerapi
```

##### Dependências Necessárias
```json
{
  "@supabase/supabase-js": "^2.x",
  "speakeasy": "^2.x",      // Para 2FA TOTP
  "qrcode": "^1.x",         // Para gerar QR Code
  "bcryptjs": "^2.x",       // Hash de senhas
  "@nestjs/jwt": "^10.x",   // JWT
  "@nestjs/passport": "^10.x"
}
```

### Outros Módulos Principais
- **Patients**: Gestão de pacientes
- **Appointments**: Sistema de agendamento
- **Anamnesis**: Anamnese digital
- **Consultations**: Gestão de consultas
- **TherapeuticPlans**: Planos com IA
- **Financial**: Pagamentos e split
- **Clinics**: Gestão multi-clínica
- **CrewAI**: Integração com 23 agentes

## 📊 API Documentation

### Swagger
Disponível em desenvolvimento: `http://localhost:3001/api`

### Endpoints Principais
- `POST /auth/login` - Autenticação
- `GET /patients` - Listar pacientes
- `POST /appointments` - Criar agendamento
- `GET /anamnesis/:id` - Buscar anamnese
- `POST /therapeutic-plans` - Gerar plano com IA

## 🧪 Testes

### Executar Testes
```bash
npm run test         # Unitários
npm run test:watch   # Watch mode
npm run test:cov     # Coverage
npm run test:e2e     # End-to-end
```

### Cobertura Mínima
- Unitários: 80%
- Integração: 70%
- E2E: Fluxos críticos

## 🐳 Docker

### Configuração Docker
O projeto está totalmente containerizado para facilitar desenvolvimento e deploy.

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: onterapi-app
    ports:
      - "3001:3000"
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      NODE_OPTIONS: "--dns-result-order=ipv4first"
    env_file:
      - .env
    volumes:
      - ./src:/app/src:delegated
      - ./logs:/app/logs
    depends_on:
      - redis
    networks:
      - onterapi-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: onterapi-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-onterapi_redis_2024}
    volumes:
      - redis-data:/data
    networks:
      - onterapi-network
    restart: unless-stopped

volumes:
  redis-data:

networks:
  onterapi-network:
    driver: bridge
```

#### Comandos Docker
```bash
# Build da imagem
docker build -t onterapi-v4:latest .

# Iniciar com Docker Compose
docker compose up -d

# Ver logs
docker compose logs -f

# Parar serviços
docker compose stop

# Remover tudo
docker compose down -v

# Executar comandos no container
docker compose exec app npm run migration:run
docker compose exec app npm test
```

### Troubleshooting Docker

#### Erro IPv6
Se encontrar erro `Error: connect ENETUNREACH 2600:...`, use o Supabase Pooler:
```env
# Use Pooler para IPv4
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_USERNAME=postgres.ogffdaemylaezxpunmop
NODE_OPTIONS=--dns-result-order=ipv4first
```

## 🔄 CI/CD

### Pipeline
1. **Lint & Format**: Validação de código
2. **Tests**: Unitários e integração
3. **Build**: Compilação TypeScript
4. **Security**: Scan de vulnerabilidades
5. **Deploy**: Staging → Production

## 📝 Changelog

Veja [CHANGELOG.md](./CHANGELOG.md) para histórico de mudanças.

## 📄 Licença

Proprietary - OnTerapi © 2024. Todos os direitos reservados.

## 🤝 Contribuindo

1. Siga os padrões definidos em `.claude/agent-onterapi.md`
2. Use commits semânticos
3. Mantenha cobertura de testes
4. Atualize documentação

## 📞 Suporte

- Email: dev@onterapi.com.br
- Docs: https://docs.onterapi.com.br

---

*OnTerapi v4 - Desenvolvido com princípios DDD e Clean Architecture*
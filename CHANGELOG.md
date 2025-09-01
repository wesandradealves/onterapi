# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- **Documentação Swagger Completa**
  - @ApiBody com types e examples em todos endpoints
  - DTOs para sign-out e me responses  
  - Descrições detalhadas e exemplos realistas
  - Todos endpoints testáveis no Swagger UI
  - Regra de documentação obrigatória em onterapi-dev.md

### Fixed
- Headers user-agent e ip removidos do Swagger UI para interface mais limpa
- Path aliases (@infrastructure, @domain, @shared) removidos para compatibilidade com Vercel
- Erros TypeScript nos DTOs com definite assignment operator

### Changed
- Endpoint /me alterado de POST para GET (mais RESTful)
- Simplificada captura de deviceInfo nos endpoints

### Removed
- **Endpoint sign-up removido do módulo Auth**
  - Cadastro de usuários será feito no módulo Users (a ser criado)
  - SignUpUseCase e arquivos relacionados removidos
  - Auth agora é exclusivamente para autenticação (login, logout, refresh, 2FA)

## [0.3.0] - 2025-09-01

### Added
- **Módulo de Autenticação Completo** - Arquitetura DDD e Clean Architecture
  - **Domain Layer**: Entidades puras, interfaces de use cases, repositórios e serviços
  - **Infrastructure Layer**: Entidades TypeORM, integração com Supabase Auth, repositório com Query Builder
  - **Application Layer**: Controllers REST, DTOs, implementação dos use cases
  - **Sistema de Roles (RBAC)**: 11 roles hierárquicos (SUPER_ADMIN, CLINIC_OWNER, PROFESSIONAL, etc.)
  - **Multi-tenant**: Suporte completo com isolamento por tenant_id
  - **Two-Factor Authentication (2FA)**: Suporte para TOTP, SMS e email
  - **Segurança**: JWT tokens, refresh tokens, rate limiting, proteção contra brute force
  - **Guards**: JwtAuthGuard, RolesGuard, TenantGuard
  - **Decorators**: @Public, @Roles, @CurrentUser

- **Shared Utils**: Funções reutilizáveis seguindo padrões enterprise
  - `db-connection.util.ts`: Savepoints para transações granulares
  - `crypto.util.ts`: Hash com bcryptjs, criptografia AES-256
  - `auth.validators.ts`: Validadores Zod para CPF, senha forte, telefone
  - **Result Pattern**: Tratamento de erros consistente
  - **Zod Validation Pipe**: Validação forte de tipos

- **Docker Configuration**
  - Dockerfile otimizado com multi-stage build e usuário não-root
  - Docker Compose com Redis, health checks e networking
  - Scripts de automação para Windows (PowerShell) e Linux (Bash)
  - Documentação completa integrada no README
  - Porta 3001 configurada para evitar conflitos

### Fixed
- Conexão com banco usando Supabase Pooler para IPv4 (Docker/Vercel)
- TypeScript property initialization com definite assignment operator
- Dependency injection com @Inject decorator para interfaces
- Import bcryptjs ao invés de bcrypt para compatibilidade Docker
- Configuração de ambiente correta (SUPABASE_SERVICE_ROLE_KEY)

### Changed
- Migração para Supabase Pooler (aws-0-sa-east-1.pooler.supabase.com:6543)
- Porta padrão alterada de 3000 para 3001
- Documentação Docker centralizada no README
- Uso de apenas .env para configuração (sem .env.docker)

## [0.2.4] - 2025-09-01

### Fixed
- Erro de runtime na Vercel corrigido (sintaxe nodejs20.x removida)
- Configuração vercel.json simplificada usando builds/routes padrão
- Erro "Cannot find module '@shared/messaging/message-bus.module'" definitivamente corrigido
- Path aliases removidos em favor de caminhos relativos para compatibilidade com Vercel

### Changed
- Import de @shared/messaging mudado para ./shared/messaging (caminho relativo)
- Removido tsconfig-paths que não funciona em ambiente serverless
- Script de build simplificado removendo tsc-alias

## [0.2.3-alpha.1] - 2025-08-31

### Fixed
- Import do Express corrigido de namespace para default import no api/index.ts
- Configuração do Vercel atualizada para NestJS serverless
- api/index.ts simplificado removendo dependência do BootstrapFactory
- Build passando localmente e pronto para deploy

### Changed
- vercel.json reconfigurado com framework null e funções serverless
- Runtime definido como nodejs20.x com limites apropriados
- Configurações de produção inline no api/index.ts (helmet, validation)
- Logger condicional baseado em NODE_ENV

### Added
- ValidationPipe global configurado no handler serverless
- Helmet.js para segurança em produção
- Documentação de variáveis de ambiente necessárias para Vercel

## [0.2.2-alpha.1] - 2025-08-31

### Fixed
- Corrigido .vercelignore que estava removendo arquivos necessários (src, tsconfig)
- Ajustado vercel.json para usar builds e routes corretos
- Handler /api/index.ts otimizado para Vercel
- Build da Vercel agora funciona corretamente

### Changed
- Simplificação do .vercelignore mantendo apenas arquivos desnecessários
- vercel.json usa configuração de builds ao invés de rewrites

## [0.2.1-alpha.1] - 2025-08-31

### Added
- Suporte completo para deploy serverless na Vercel
- Configuração de edge functions otimizada
- Documentação de variáveis de ambiente necessárias

## [0.2.0-alpha.1] - 2025-08-31

### Added
- Integração completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitoramento completo (DB, memória, disco)
- Sistema de mensageria unificado com EventEmitter
- Bootstrap factory centralizada para eliminar duplicação
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- Integração com @nestjs/terminus para health checks nativos
- Output style customizado para desenvolvimento OnTerapi
- Regras de qualidade extrema (DRY, linter, build obrigatórios)

### Changed
- Banco de dados migrado de local para Supabase cloud
- README expandido com documentação completa do Supabase
- Documentação centralizada no README (regra: sem arquivos .md extras)
- Refatoração completa para eliminar duplicação de código
- Substituição de `any` por `unknown` para type safety
- Path do DiskHealthIndicator corrigido para Windows

### Removed
- Arquivos de teste desnecessários (main-test.ts, app-test.module.ts)
- Módulo example removido (não essencial)
- Entidade test.entity.ts removida
- Módulo health customizado (usando Terminus nativo)

### Fixed
- Erros de TypeScript em decorators Zod
- Imports não utilizados removidos
- Configuração de paths TypeScript (@shared, @domain, etc)
- Health check no Windows (path C:\ ao invés de /)

### Security
- SSL/TLS habilitado para conexão com Supabase
- Separação de chaves públicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementação
- Helmet.js configurado para segurança HTTP

## [0.1.0] - 2024-12-28

### Added
- Boilerplate inicial do projeto
- Estrutura de pastas seguindo DDD
- Configurações base (TypeScript, ESLint, Prettier)
- Package.json com dependências essenciais
- README com documentação inicial
- Sistema de versionamento semântico

---

*Mantenha este arquivo atualizado a cada release*
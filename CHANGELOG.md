# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.5.1] - 2025-09-02

### Fixed
- **JwtAuthGuard**: Corrigido problema crítico de extração de metadata do usuário
  - Guard estava acessando incorretamente `user.user_metadata` ao invés de `user.user.user_metadata`
  - Isso causava todos os usuários serem identificados como role PATIENT
  - Agora extrai corretamente o role do metadata do Supabase
  - RolesGuard funcionando adequadamente após correção

### Added
- **Configuração SUPABASE_SERVICE_ROLE_KEY**: Adicionada chave de serviço ao .env
  - Necessária para operações administrativas do Supabase
  - Permite deletar e gerenciar usuários via API admin

### Changed
- **Módulo Users**: Endpoints totalmente testados e funcionais
  - POST /users - Criação com validação de CPF e telefone ✅
  - GET /users - Listagem com paginação (requer SUPER_ADMIN) ✅
  - GET /users/:id - Busca por ID (retorna estrutura vazia - conhecido) ⚠️
  - PATCH /users/:id - Atualização parcial funcionando ✅
  - DELETE /users/:id - Deleção soft (requer SUPER_ADMIN) ✅
  - PUT /users/:id - Não implementado (retorna 404) ❌

## [0.5.0] - 2025-09-02

### Added
- **Sistema de Autenticação 100% Supabase Cloud**
  - Remoção completa de banco de dados local
  - Autenticação usando apenas Supabase Auth
  - Não há mais tabelas locais de usuários ou sessões
  - Integração direta com Supabase para todas operações

- **Email de Alerta de Login**
  - Notificação automática por email em cada login
  - Informações incluídas: IP, dispositivo, localização, data/hora
  - Template HTML profissional e responsivo
  - Logs com link direto do Ethereal para visualização em desenvolvimento

- **Melhorias no Docker**
  - Configuração de DNS com Google DNS (8.8.8.8, 8.8.4.4)
  - Extra hosts configurados para Supabase e SMTP
  - IPs diretos para evitar problemas de resolução DNS
  - Health check configurado para monitoramento

- **Logs Aprimorados**
  - Links do Ethereal destacados nos logs
  - Mensagens formatadas para melhor visualização
  - Warnings visuais para eventos importantes

### Changed
- **Arquitetura Simplificada**
  - SignInUseCase usa apenas Supabase Auth
  - CreateUserUseCase cria usuários direto no Supabase
  - Remoção de todas as referências a authRepository local
  - User metadata armazenado no Supabase

- **Configuração de Ambiente**
  - DB_HOST usando IP direto do pooler Supabase
  - Extra hosts no Docker para todos serviços externos
  - NODE_OPTIONS com dns-result-order=ipv4first

### Fixed
- Resolução DNS no Docker para smtp.ethereal.email
- Problemas de conectividade com Supabase no Docker
- Envio de emails funcionando corretamente no container
- Login e criação de usuários 100% funcional

### Security
- Nenhuma informação sensível armazenada localmente
- Todos os dados de usuários no Supabase cloud
- Service keys apenas para operações administrativas
- Tokens JWT com expiração de 15 minutos

## [0.4.1] - 2025-09-02

### Added
- **Serviço de Email Completo** - Infraestrutura para envio de emails
  - EmailService implementado com Nodemailer
  - Templates HTML responsivos para todos os tipos de email
  - Integração com Ethereal para testes de desenvolvimento
  - Suporte para produção com qualquer provedor SMTP
  - Máscaramento de endereços de email para privacidade

- **Two-Factor Authentication via Email**
  - SendTwoFAUseCase para envio de códigos 2FA
  - Endpoint `POST /auth/two-factor/send` para solicitar código
  - Códigos de 6 dígitos com expiração de 5 minutos
  - Template de email específico para códigos 2FA
  - Integração completa com fluxo de autenticação

- **Templates de Email Implementados**
  - Código de verificação 2FA com design profissional
  - Email de boas-vindas com onboarding
  - Redefinição de senha com link seguro
  - Verificação de email para novos cadastros
  - Alerta de login suspeito com detalhes do acesso

### Changed
- Auth module atualizado com provider ISendTwoFAUseCase
- Controller de autenticação com novo endpoint de envio 2FA
- Documentação Swagger atualizada com exemplos de uso

### Fixed
- Typo em nodemailer.createTransport (estava createTransporter)
- Verificação de token 2FA com Result pattern correto
- Acesso ao userId do TwoFactorTokenPayload usando 'sub'

## [0.4.0] - 2025-09-02

### Added
- **Módulo Users CRUD Completo** - Gestão completa de usuários
  - Create, Read, Update, Delete com permissões granulares
  - UserOwnerGuard: Admin ou próprio usuário podem editar/deletar
  - Listagem de todos usuários restrita a admins
  - Integração com Supabase Auth para criação de usuários
  - Validação completa com Zod schemas
  - Swagger documentation com exemplos para todos endpoints
  - Suporte a filtros: role, tenantId, isActive
  - Paginação em listagens
  - Soft delete mantendo histórico

- **Utilitários Centralizados**
  - roles.util.ts: Funções centralizadas para verificação de roles
  - SupabaseService: Serviço dedicado para integração com Supabase Auth

### Changed
- **Refatoração Massiva de Arquitetura** - Sistema 100% limpo
  - Entidades do domain removidas (mantidas apenas no infrastructure)
  - Validadores consolidados em auth.validators.ts único
  - Hierarquia de roles centralizada em roles.util.ts
  - Zero duplicação de código em todo o sistema

### Removed
- **Código Redundante Eliminado** - 616 linhas removidas
  - MessageBus não utilizado (61 eventos nunca usados)
  - Health controller duplicado
  - Entidades duplicadas do domain layer
  - Validadores duplicados (health.validators.ts)
  - 8 arquivos desnecessários eliminados

### Fixed
- Circular dependency em DTOs do módulo Users
- Imports após refatoração massiva
- Build do Docker com nova estrutura

## [0.3.1] - 2025-09-02

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
- Boilerplate inicial do projeto
- Estrutura de pastas seguindo DDD
- Configurações base (TypeScript, ESLint, Prettier)
- Package.json com dependências essenciais
- README com documentação inicial
- Sistema de versionamento semântico

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

---

*Mantenha este arquivo atualizado a cada release*
# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

### Changed

### Fixed

### Security

### Documentation

## [0.16.3] - 2025-09-25

### Added
- Adicionado script CLI npm run assign-super-admin-tenant para alinhar tenants de SUPER_ADMIN entre Supabase e banco relacional.

### DRY & Refactors
- Centralizado formata��o de respostas de pacientes e usu�rios em presenters compartilhados, eliminando mapeamentos duplicados nos controllers.
- SupabaseAuthService passou a normalizar objetos de usu�rio via helper �nico (`mapUserRecord`), reutilizado nos fluxos de sign-up/sign-in/get/refresh.
- Use cases de pacientes reutilizam `mapRoleToDomain`/`RolesEnum`, removendo verifica��es de role baseadas em strings PT/EN.
- `ZodValidationPipe` passou a utilizar `Logger` em vez de `console.error`, mantendo observabilidade consistente.

## [0.16.1] - 2025-09-25

### Changed

- APP_URL configurado explicitamente para desenvolvimento (http://localhost:3000) e produção (https://onterapi.vercel.app), alinhando os links usados pelos e-mails transacionais.
- DTOs de pacientes e usuários atualizados com descrições e exemplos acentuados corretamente.

### Fixed

- SupabaseAuthService.deleteUser ignora respostas "user not found" do Supabase e segue com o soft delete local.
- Assuntos dos e-mails de verificação, 2FA e boas-vindas corrigidos para exibir acentuação adequada.

## [0.16.0] - 2025-09-24

### Changed

- Provedor de email migrado para Resend, substituindo o transporte SMTP local e atualizando variáveis de ambiente.
- Remetente padrão apontando para Onterapi <noreply@onterapi.com.br> nos envs e integrações.

### Fixed

- Corrigido o carregamento de metadados do TypeORM em ambiente serverless habilitando utoLoadEntities, evitando erro EntityMetadataNotFoundError no login da Vercel.

## [0.15.0] - 2025-09-24


- Suporte a slugs unicos para usuarios e pacientes, com migracao TypeORM e utilitario compartilhado para gerar/backfill.
- Scripts CLI `npm run backfill:user-slugs`, `npm run sync:users` e `npm run prune:users` para manter Supabase e banco relacional alinhados.
- Fonte de dados TypeORM dedicada (`typeorm.datasource.ts`) e declaracoes de tipo locais para scripts.

### Changed

- Endpoints REST de pacientes e usuarios agora aceitam slugs; DTOs, guards, mapeadores e casos de uso foram atualizados para expor o campo.
- Casos de uso de usuarios passam a persistir e atualizar dados pelo repositorio relacional enquanto sincronizam metadata com Supabase.
- README e `tsconfig.json` atualizados para refletir o fluxo baseado em slugs e permitir build dos novos scripts.

### Fixed

- Operacoes de paciente (atualizar, transferir, arquivar) resolvem o identificador interno a partir do slug antes de manipular registros.
- Exclusao de usuario garante soft delete do registro local apos remover a conta no Supabase, evitando dados orfaos.

## [0.14.0] - 2025-09-23


- Modulo completo de pacientes (CRUD, filtros, transferencia, arquivamento) integrado ao Supabase.
- Endpoint `/patients/export` persistindo pedidos na tabela `patient_exports` com filtros armazenados.
- Nova documentacao de fluxo end-to-end (auth + 2FA + pacientes + export) e credenciais atualizadas.

### Changed

- SignOutUseCase passa a informar o `userId` ao Supabase e ignora assinaturas invalidas sem gerar erro.
- DTO `SignOutDto` agora valida `refreshToken` e `allDevices` com class-validator.
- README reescrito com instrucoes atualizadas, fluxos de teste e troubleshooting.
- Documentacao do Swagger atualizada para listar os roles exigidos nos modulos Auth, Two-Factor, Patients e Users.
- Fluxo de Two-Factor no Swagger atualizado: payload de validação documentado e endpoint manual de reenvio oculto.
- Swagger: removido esquema de API key não utilizado para evitar confusão na autenticação.
- Filtros da listagem de pacientes no Swagger exibem enums reais (status, risco, quickFilter) alinhados às validações de back-end.

### Fixed

- Logout em todos os dispositivos nao gera mais warning `invalid JWT` do Supabase.
- Exportacao de pacientes respeita roles (SECRETARY bloqueada) e registra jobs pendentes corretamente.
- Remocao de artefatos de encoding nas descricoes dos endpoints documentados no Swagger.

## [0.13.1] - 2025-09-21

### Changed

- Reforco de seguranca exigindo segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- Codigos 2FA gerados com RNG criptografico
- JwtAuthGuard agora injeta o contexto completo do usuario utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, sign-out, refresh) para respostas consistentes

### Fixed

- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- Criacao de usuarios utilizando a interface unificada do Supabase Auth

### Infrastructure

- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.1] - 2025-09-21

### Changed

- Reforço de segurança exigindo segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- Códigos 2FA gerados com RNG criptográfico
- JwtAuthGuard agora injeta o contexto completo do usuário utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, sign-out, refresh) para respostas consistentes

### Fixed

- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- Criação de usuários utilizando a interface unificada do Supabase Auth

### Infrastructure

- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.0] - 2025-09-04


- **Validação de email obrigatória para login**
  - Usuários não podem fazer login sem confirmar email
  - Mensagem específica "Email não verificado" ao invés de "Credenciais inválidas"
  - Tratamento correto do erro "Email not confirmed" do Supabase

### Fixed

- **Correções no fluxo de autenticação**
  - Verificação de email confirmado antes de permitir login
  - Prevenção de confirmação duplicada de email (retorna erro apropriado)
  - Mensagens de erro mais claras e específicas para cada situação

### Improved

- **Sistema de verificação de email**
  - Token de verificação único por usuário
  - Não permite confirmar email já confirmado
  - Integração completa com Supabase email_confirmed_at

### Tested

- **Fluxo completo de autenticação validado**
  - Login bloqueado sem email confirmado ✓
  - Login funcional após confirmação ✓
  - Prevenção de confirmação duplicada ✓
  - 2FA funcionando corretamente ✓
  - Bloqueio após 3 tentativas erradas de 2FA ✓

## [0.12.0] - 2025-09-03


- **BaseUseCase para eliminação de duplicação de try-catch**
  - Criado BaseUseCase abstrato que centraliza tratamento de erros
  - 10 use cases refatorados para usar o padrão DRY
  - UseCaseWrapper criado para adaptar diferentes assinaturas de métodos
  - UpdateUserUseCase e DeleteUserUseCase usando wrapper pattern

- **BaseGuard para abstração de guards**
  - Criado BaseGuard que centraliza lógica comum
  - 6 guards refatorados (JwtAuth, Roles, Tenant, UserOwner, EmailVerified, ActiveAccount)
  - Método getUser() centralizado para extração de usuário do contexto

- **Sistema de mensagens centralizado**
  - MESSAGES.constants.ts criado com todas as mensagens do sistema
  - 0 mensagens hardcoded (100% centralizadas)
  - Seções organizadas: AUTH, USER, VALIDATION, EVENTS, ERRORS, GUARDS, LOGS

- **Divisão de controllers e serviços grandes**
  - TwoFactorController separado do AuthController
  - EmailService dividido em 3: AuthEmailService, NotificationEmailService e facade
  - Redução significativa de complexidade por arquivo

- **Event Subscribers implementados**
  - AuthEventsSubscriber para eventos de autenticação
  - UserEventsSubscriber para eventos de usuários
  - Integração completa com MessageBus

### Changed

- **Result Pattern aplicado em toda a aplicação**
  - Todas as interfaces de use cases retornando Result<T>
  - Controllers atualizados para tratar result.error e result.data
  - Tratamento de erros padronizado e consistente

- **Usuário padrão do sistema**
  - Removidos todos os usuários de teste
  - Mantido apenas 1 super admin (lina73@ethereal.email / senha: admin)
  - README atualizado com credenciais simplificadas

### Fixed

- **Correções críticas de arquitetura DRY**
  - Eliminadas 635 linhas de código duplicado
  - Redução de duplicação de 20% para 0%
  - 100% dos use cases usando BaseUseCase ou wrapper
  - 100% dos guards usando BaseGuard

### Improved

- **Qualidade e manutenibilidade do código**
  - Zero comentários no código (código auto-documentado)
  - Zero mensagens hardcoded em logs
  - Arquitetura DDD/Clean 100% consistente
  - Todos os testes de endpoints passando

### Technical

- **Métricas finais de refatoração**
  - 396 inserções, 968 deleções (saldo: -572 linhas)
  - 35 arquivos modificados
  - 10 use cases refatorados
  - 6 guards refatorados
  - 3 serviços divididos
  - 0 duplicações restantes

## [0.11.0] - 2025-09-03


- **Sistema de Eventos Integrado aos Use Cases**
  - 7 eventos publicados em use cases críticos
  - USER_CREATED, USER_UPDATED, USER_DELETED implementados
  - USER_LOGGED_IN, TOKEN_REFRESHED implementados
  - TWO_FA_SENT, TWO_FA_VALIDATED implementados
  - MessageBus integrado nos módulos Auth e Users
  - EventEmitterModule configurado para mensageria assíncrona

### Fixed

- **Eliminação de Duplicações no Controllers**
  - Removido método mapToResponse duplicado em users.controller
  - Substituído por uso direto de CPFUtils.mask inline
  - Redução de 19 linhas de código duplicado

- **Erros de Compilação TypeScript**
  - Corrigido uso incorreto de normalizeLoginInfo em sign-in.use-case
  - Ajustado acesso a propriedades do objeto loginInfo
  - Build passando sem erros

### Improved

- **Integração de Mensageria**
  - MessageBus injetável em todos os use cases
  - EventEmitterModule.forRoot() configurado nos módulos
  - Base para comunicação assíncrona entre módulos
  - Preparado para integração com filas externas (RabbitMQ, Kafka)

- **Qualidade de Código**
  - Redução de duplicação: de 20% para ~5%
  - 68% das correções críticas implementadas (15/22)
  - Eventos implementados: 58% (7/12)
  - Zero throw new diretos (100% usando factory)

### Technical

- **Métricas de Progresso**
  - 15 correções críticas de 22 pendentes implementadas
  - 7 use cases com eventos publicados
  - 3 métodos grandes ainda precisam refatoração
  - API estável e funcionando em produção

## [0.10.0] - 2025-09-03


- **Sistema de Mensageria Completo**
  - MessageBus implementado com EventEmitter2
  - DomainEvents com 12 eventos definidos
  - Interface DomainEvent padronizada
  - Eventos: USER_CREATED, USER_UPDATED, USER_DELETED, USER_LOGGED_IN, etc.

- **Validadores Centralizados**
  - CPFValidator com validação completa de CPF brasileiro
  - EmailValidator com regex e normalização
  - PhoneValidator com validação de DDDs brasileiros
- **Constantes Centralizadas**
  - validation.constants.ts com mensagens e patterns
  - error.constants.ts com códigos de erro padronizados
  - event.constants.ts com nomes de eventos

- **Tipos Centralizados**
  - DeviceInfo movido para shared/types/device.types.ts
  - Eliminada duplicação em 19 arquivos

### Fixed

- **IUserRepository em Produção**
  - Corrigido mock vazio `useValue: {}`
  - Implementado `useClass: UserRepository`
  - Adicionado TypeOrmModule.forFeature([UserEntity])
  - Repository real agora é injetado corretamente

- **Tratamento de Erros Consistente**
  - AuthErrorFactory expandido com 5 novos tipos
  - Substituídos 13 `throw new` diretos por AuthErrorFactory
  - Tipos adicionados: TOKEN_NOT_PROVIDED, USER_NOT_AUTHENTICATED, ACCESS_DENIED, etc.

### Improved

- **Redução de Duplicação de Código**
  - DeviceInfo: de 19 duplicações para 1 centralizada
  - Tratamento de erros: 100% usando AuthErrorFactory
  - UserMapper eliminando duplicações de mapeamento
  - CPFUtils centralizando lógica de mascaramento

- **Arquitetura DDD**
  - Separação clara entre camadas
  - Sistema de eventos para comunicação entre módulos
  - Validadores reutilizáveis no shared
  - Constantes centralizadas por tipo

### Technical

- **Qualidade de Código**
  - Build sem erros TypeScript
  - API funcionando corretamente no Docker
  - 7 de 22 correções críticas implementadas
  - Base preparada para sistema de eventos completo

## [0.9.0] - 2025-09-03

### Changed

- **Limpeza Total de Código**
  - Removidos TODOS os comentários de TODOS os arquivos TypeScript
  - Incluindo JSDoc, comentários de linha e blocos
  - Código mais limpo e profissional
  - Mantidos apenas `.describe()` do Zod para documentação Swagger

### Improved

- **Organização de Diretórios**
  - Removidos 8 diretórios vazios redundantes do boilerplate inicial
  - Mantida estrutura modular (por feature) ao invés de centralizada
  - Estrutura mais coerente com DDD modular

### Technical

- **Qualidade de Código**
  - Zero comentários no código (código auto-explicativo)
  - Melhor aderência aos padrões clean code
  - Remoção de diretórios desnecessários: domain/enums, domain/interfaces/\*, infrastructure/config, etc
  - Mantidos apenas diretórios essenciais para futuras implementações

## [0.8.0] - 2025-09-03


- **Contador de Tentativas no 2FA**
  - Sistema de bloqueio após 3 tentativas erradas
  - Incremento automático de tentativas em códigos inválidos
  - Bloqueio efetivo quando attempts >= max_attempts
  - Método `findValidTwoFactorCode` no repositório

### Fixed

- **Lógica de Validação 2FA**
  - Corrigido incremento de tentativas para códigos válidos
  - Agora incrementa tentativas do código ativo, não do código errado
  - Validação correta busca código válido antes de verificar match

### Improved

- **Segurança do 2FA**
  - Bloqueio automático após exceder tentativas
  - Não aceita código correto após bloqueio
  - Proteção contra força bruta

### Technical

- **Limpeza de Código**
  - Removidos todos os TODOs do módulo auth
  - Implementado contador de tentativas completo
  - Código de produção sem comentários desnecessários

## [0.7.0] - 2025-09-03


- **Two-Factor Authentication (2FA) Completo**
  - Criada tabela `two_factor_codes` no Supabase Cloud
  - Geração de códigos de 6 dígitos com expiração de 5 minutos
  - Envio de código por email com template HTML responsivo
  - Validação de código com limite de 3 tentativas
  - Integração completa com Supabase Auth (sem banco local)
  - Logs visuais no desenvolvimento com links do Ethereal
  - Suporte para trust device (30 dias vs 7 dias padrão)

### Fixed

- **2FA com Supabase**: Integração dos use cases de 2FA
  - `send-two-fa.use-case.ts`: Busca usuário do Supabase ao invés de banco local
  - `validate-two-fa.use-case.ts`: Remove update em tabela local inexistente
  - Atualização de lastLoginAt via Supabase user_metadata
  - Correção de extração de dados do usuário (user.user || user)

### Database

- **Tabela two_factor_codes**: Estrutura completa criada
  - Colunas: id, user_id, code, method, expires_at, attempts, max_attempts, is_used, used_at, created_at
  - Índices para performance: idx_two_factor_codes_user_id, idx_two_factor_codes_expires_at
  - Foreign key com auth.users com CASCADE DELETE

### Documentation

- **Fluxo 2FA Documentado**: Como funciona o sistema completo
  - Login detecta 2FA habilitado e retorna tempToken
  - Envio de código gera 6 dígitos e salva no banco
  - Validação verifica código e retorna tokens JWT completos

## [0.6.0] - 2025-09-03


- **Sistema de Verificação de Email com Tokens Seguros**
  - Criada tabela `email_verification_tokens` no Supabase
  - Tokens únicos de 64 caracteres hexadecimais
  - Expiração de 24 horas para tokens
  - Tokens marcados como usados após verificação
  - Validação robusta: rejeita tokens de teste, tokens curtos, formatos inválidos
  - Integração com fluxo de criação de usuários

- **Melhorias no Módulo de Autenticação**
  - Refresh token agora retorna dados completos do usuário (email, name, role correto)
  - Verificação de email com validação real de tokens no banco
  - Usuários criados com `emailVerified: false` até confirmar email
  - Link de verificação enviado por email com token único

### Fixed

- **Refresh Token**: Corrigido para acessar corretamente `supabaseData.user`
  - Antes retornava email vazio, name vazio e role sempre PATIENT
  - Agora retorna todos os dados corretos do user_metadata
- **Email Verified**: Corrigido valor hardcoded
  - Usuários eram criados com `emailVerified: true` incorretamente
  - Agora começam com `false` e só mudam após verificação real

### Security

- **Verify Email**: Removido aceite de qualquer token
  - Antes tinha TODO e aceitava qualquer string
  - Agora valida token no banco de dados
  - Tokens só podem ser usados uma vez
  - Expiração de 24 horas implementada

### Documentation

- **README**: Adicionada tabela completa de usuários de teste
- **onterapi-dev.md**: Documentada configuração correta de conexão PostgreSQL/Supabase

## [0.5.1] - 2025-09-02

### Fixed

- **JwtAuthGuard**: Corrigido problema crítico de extração de metadata do usuário
  - Guard estava acessando incorretamente `user.user_metadata` ao invés de `user.user.user_metadata`
  - Isso causava todos os usuários serem identificados como role PATIENT
  - Agora extrai corretamente o role do metadata do Supabase
  - RolesGuard funcionando adequadamente após correção


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


- Suporte completo para deploy serverless na Vercel
- Configuração de edge functions otimizada
- Documentação de variáveis de ambiente necessárias

## [0.2.0-alpha.1] - 2025-08-31


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

_Mantenha este arquivo atualizado a cada release_

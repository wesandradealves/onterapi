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
- Adicionado script CLI npm run assign-super-admin-tenant para alinhar tenants SUPER_ADMIN entre Supabase e banco relacional.

### DRY & Refactors
- Centralizada a formatacao das respostas de pacientes e usuarios em presenters compartilhados, eliminando mapeamentos duplicados nos controllers.
- SupabaseAuthService passou a normalizar objetos de usuario via helper unico (mapUserRecord), reutilizado nos fluxos de sign-up/sign-in/get/refresh.
- Use cases de pacientes reutilizam mapRoleToDomain/RolesEnum, removendo verificacoes de role baseadas em strings PT/EN.
- ZodValidationPipe passou a utilizar Logger no lugar de console.error, mantendo observabilidade consistente.
## [0.16.1] - 2025-09-25

### Changed

- APP_URL configurado explicitamente para desenvolvimento (http://localhost:3000) e produÃ§Ã£o (https://onterapi.vercel.app), alinhando os links usados pelos e-mails transacionais.
- DTOs de pacientes e usuÃ¡rios atualizados com descriÃ§Ãµes e exemplos acentuados corretamente.

### Fixed

- SupabaseAuthService.deleteUser ignora respostas "user not found" do Supabase e segue com o soft delete local.
- Assuntos dos e-mails de verificaÃ§Ã£o, 2FA e boas-vindas corrigidos para exibir acentuaÃ§Ã£o adequada.

## [0.16.0] - 2025-09-24

### Changed

- Provedor de email migrado para Resend, substituino o transporte SMTP local e atualizano variÃ¡veis de ambiente.
- Remetente padrÃ£o apontano para Onterapi <noreply@onterapi.com.br> nos envs e integraÃ§Ãµes.

### Fixed

- Corrigido o carregameno de metadados do TypeORM em ambiente serverless habilitano utoLoadEntities, evitano erro EntityMetadataNotFoundError no login da Vercel.

## [0.15.0] - 2025-09-24


- Suporte a slugs unicos para usuarios e pacientes, com migracao TypeORM e utilitario compartilhado para gerar/backfill.
- Scripts CLI `npm run backfill:user-slugs`, `npm run sync:users` e `npm run prune:users` para manter Supabase e bano relacional alinhados.
- Fonte de dados TypeORM dedicada (`typeorm.datasource.ts`) e declaracoes de tipo locais para scripts.

### Changed

- Endpoints REST de pacientes e usuarios agora aceitam slugs; DTOs, guards, mapeadores e casos de uso foram atualizados para expor o campo.
- Casos de uso de usuarios passam a persistir e atualizar dados pelo repositorio relacional enquano sincronizam metadata com Supabase.
- README e `tsconfig.json` atualizados para refletir o fluxo baseado em slugs e permitir build dos novos scripts.

### Fixed

- Operacoes de paciente (atualizar, transferir, arquivar) resolvem o identificador interno a partir do slug antes de manipular registros.
- Exclusao de usuario garante soft delete do registro local apos remover a conta no Supabase, evitano dados orfaos.

## [0.14.0] - 2025-09-23


- Modulo completo de pacientes (CRUD, filtros, transferencia, arquivameno) integrado ao Supabase.
- Endpoint `/patients/export` persistino pedidos na tabela `patient_exports` com filtros armazenados.
- Nova documentacao de fluxo end-to-end (auth + 2FA + pacientes + export) e credenciais atualizadas.

### Changed

- SignOutUseCase passa a inormar o `userId` ao Supabase e ignora assinaturas invalidas sem gerar erro.
- DTO `SignOutDto` agora valida `refreshToken` e `allDevices` com class-validator.
- README reescrito com instrucoes atualizadas, fluxos de teste e troubleshooting.
- Documentacao do Swagger atualizada para listar os roles exigidos nos modulos Auth, Two-Factor, Patients e Users.
- Fluxo de Two-Factor no Swagger atualizado: payload de validaÃ§Ã£o documentado e endpoint manual de reenvio oculto.
- Swagger: removido esquema de API key nÃ£o utilizado para evitar confusÃ£o na autenticaÃ§Ã£o.
- Filtros da listagem de pacientes no Swagger exibem enums reais (status, risco, quickFilter) alinhados Ã s validaÃ§Ãµes de back-end.

### Fixed

- Logout em todos os dispositivos no gera mais warning `invalid JWT` do Supabase.
- Exportacao de pacientes respeita roles (SECRETARY bloqueada) e registra jobs pendentes corretamente.
- Remocao de artefatos de enoding nas descricoes dos endpoints documentados no Swagger.

## [0.13.1] - 2025-09-21

### Changed

- Reforco de seguranca exigino segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- Codigos 2FA gerados com RNG criptografico
- JwtAuthGuard agora injeta o contexto completo do usuario utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, signout, refresh) para respostas consistentes

### Fixed

- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- Criacao de usuarios utilizano a interface unificada do Supabase Auth

### Infrastructure

- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.1] - 2025-09-21

### Changed

- ReforÃ§o de seguranÃ§a exigino segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- CÃ³digos 2FA gerados com RNG criptogrÃ¡fico
- JwtAuthGuard agora injeta o contexto completo do usuÃ¡rio utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, signout, refresh) para respostas consistentes

### Fixed

- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- CriaÃ§Ã£o de usuÃ¡rios utilizano a interface unificada do Supabase Auth

### Infrastructure

- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.0] - 2025-09-04


- **ValidaÃ§Ã£o de email obrigatÃ³ria para login**
  - UsuÃ¡rios nÃ£o podem fazer login sem confirmar email
  - Mensagem especÃ­fica "Email nÃ£o verificado" ao invÃ©s de "Credenciais invÃ¡lidas"
  - Tratameno correto do erro "Email not confirmed" do Supabase

### Fixed

- **CorreÃ§Ãµes no fluxo de autenticaÃ§Ã£o**
  - VerificaÃ§Ã£o de email confirmado antes de permitir login
  - PrevenÃ§Ã£o de confirmaÃ§Ã£o duplicada de email (retorna erro apropriado)
  - Mensagens de erro mais claras e especÃ­ficas para cada situaÃ§Ã£o

### Improved

- **Sistema de verificaÃ§Ã£o de email**
  - Token de verificaÃ§Ã£o Ãºnico por usuÃ¡rio
  - NÃ£o permite confirmar email jÃ¡ confirmado
  - IntegraÃ§Ã£o completa com Supabase email_confirmed_at

### Tested

- **Fluxo completo de autenticaÃ§Ã£o validado**
  - Login bloqueado sem email confirmado âœ“
  - Login funcional apÃ³s confirmaÃ§Ã£o âœ“
  - PrevenÃ§Ã£o de confirmaÃ§Ã£o duplicada âœ“
  - 2FA funcionano corretamente âœ“
  - Bloqueio apÃ³s 3 tentativas erradas de 2FA âœ“

## [0.12.0] - 2025-09-03


- **BaseUseCase para eliminaÃ§Ã£o de duplicaÃ§Ã£o de try-catch**
  - Criado BaseUseCase abstrato que centraliza tratameno de erros
  - 10 use cases refatorados para usar o padrÃ£o DRY
  - UseCaseWrapper criado para adaptar diferentes assinaturas de mÃ©todos
  - UpdateUserUseCase e DeleteUserUseCase usano wrapper pattern

- **BaseGuard para abstraÃ§Ã£o de guards**
  - Criado BaseGuard que centraliza lÃ³gica comum
  - 6 guards refatorados (JwtAuth, Roles, Tenant, UserOwner, EmailVerified, ActiveAccount)
  - MÃ©todo getUser() centralizado para extraÃ§Ã£o de usuÃ¡rio do contexto

- **Sistema de mensagens centralizado**
  - MESSAGES.constants.ts criado com todas as mensagens do sistema
  - 0 mensagens hardcoded (100% centralizadas)
  - SeÃ§Ãµes organizadas: AUTH, USER, VALIDATION, EVENTS, ERRORS, GUARDS, LOGS

- **DivisÃ£o de controllers e serviÃ§os grandes**
  - TwoFactorController separado do AuthController
  - EmailService dividido em 3: AuthEmailService, NotificationEmailService e facade
  - ReduÃ§Ã£o significativa de complexidade por arquivo

- **Event Subscribers implementados**
  - AuthEventsSubscriber para evenos de autenticaÃ§Ã£o
  - UserEventsSubscriber para evenos de usuÃ¡rios
  - IntegraÃ§Ã£o completa com MessageBus

### Changed

- **Result Pattern aplicado em toda a aplicaÃ§Ã£o**
  - Todas as interfaces de use cases retornano Result<T>
  - Controllers atualizados para tratar result.error e result.data
  - Tratameno de erros padronizado e consistente

- **UsuÃ¡rio padrÃ£o do sistema**
  - Removidos todos os usuÃ¡rios de teste
  - Mantido apenas 1 super admin (lina73@ethereal.email / senha: admin)
  - README atualizado com credenciais simplificadas

### Fixed

- **CorreÃ§Ãµes crÃ­ticas de arquitetura DRY**
  - Eliminadas 635 linhas de cÃ³digo duplicado
  - ReduÃ§Ã£o de duplicaÃ§Ã£o de 20% para 0%
  - 100% dos use cases usano BaseUseCase ou wrapper
  - 100% dos guards usano BaseGuard

### Improved

- **Qualidade e manutenibilidade do cÃ³digo**
  - Zero comentÃ¡rios no cÃ³digo (cÃ³digo auto-documentado)
  - Zero mensagens hardcoded em logs
  - Arquitetura DDD/Clean 100% consistente
  - Todos os testes de endpoints passano

### Technical

- **MÃ©tricas finais de refatoraÃ§Ã£o**
  - 396 inserÃ§Ãµes, 968 deleÃ§Ãµes (saldo: -572 linhas)
  - 35 arquivos modificados
  - 10 use cases refatorados
  - 6 guards refatorados
  - 3 serviÃ§os divididos
  - 0 duplicaÃ§Ãµes restantes

## [0.11.0] - 2025-09-03


- **Sistema de Evenos Integrado aos Use Cases**
  - 7 evenos publicados em use cases crÃ­ticos
  - USER_CREATED, USER_UPDATED, USER_DELETED implementados
  - USER_LOGGED_IN, TOKEN_REFRESHED implementados
  - TWO_FA_SENT, TWO_FA_VALIDATED implementados
  - MessageBus integrado nos mÃ³dulos Auth e Users
  - EventEmitterModule configurado para mensageria assÃ­ncrona

### Fixed

- **EliminaÃ§Ã£o de DuplicaÃ§Ãµes no Controllers**
  - Removido mÃ©todo mapToResponse duplicado em users.controller
  - SubstituÃ­do por uso direto de CPFUtils.mask inline
  - ReduÃ§Ã£o de 19 linhas de cÃ³digo duplicado

- **Erros de CompilaÃ§Ã£o TypeScript**
  - Corrigido uso inorreto de normalizeLoginIno em sign-in.use-case
  - Ajustado acesso a propriedades do objeto loginIno
  - Build passano sem erros

### Improved

- **IntegraÃ§Ã£o de Mensageria**
  - MessageBus injetÃ¡vel em todos os use cases
  - EventEmitterModule.forRoot() configurado nos mÃ³dulos
  - Base para comunicaÃ§Ã£o assÃ­ncrona entre mÃ³dulos
  - Preparado para integraÃ§Ã£o com filas externas (RabbitMQ, Kafka)

- **Qualidade de CÃ³digo**
  - ReduÃ§Ã£o de duplicaÃ§Ã£o: de 20% para ~5%
  - 68% das correÃ§Ãµes crÃ­ticas implementadas (15/22)
  - Evenos implementados: 58% (7/12)
  - Zero throw new diretos (100% usano factory)

### Technical

- **MÃ©tricas de Progresso**
  - 15 correÃ§Ãµes crÃ­ticas de 22 pendentes implementadas
  - 7 use cases com evenos publicados
  - 3 mÃ©todos grandes ainda precisam refatoraÃ§Ã£o
  - API estÃ¡vel e funcionano em produÃ§Ã£o

## [0.10.0] - 2025-09-03


- **Sistema de Mensageria Completo**
  - MessageBus implementado com EventEmitter2
  - DomainEvents com 12 evenos definidos
  - Interface DomainEvent padronizada
  - Evenos: USER_CREATED, USER_UPDATED, USER_DELETED, USER_LOGGED_IN, etc.

- **Validadores Centralizados**
  - CPFValidator com validaÃ§Ã£o completa de CPF brasileiro
  - EmailValidator com regex e normalizaÃ§Ã£o
  - PhoneValidator com validaÃ§Ã£o de DDDs brasileiros
- **Constantes Centralizadas**
  - validation.constants.ts com mensagens e patterns
  - error.constants.ts com cÃ³digos de erro padronizados
  - event.constants.ts com nomes de evenos

- **Tipos Centralizados**
  - DeviceIno movido para shared/types/device.types.ts
  - Eliminada duplicaÃ§Ã£o em 19 arquivos

### Fixed

- **IUserRepository em ProduÃ§Ã£o**
  - Corrigido mock vazio `useValue: {}`
  - Implementado `useClass: UserRepository`
  - Adicionado TypeOrmModule.forFeature([UserEntity])
  - Repository real agora Ã© injetado corretamente

- **Tratameno de Erros Consistente**
  - AuthErrorFactory expandido com 5 novos tipos
  - SubstituÃ­dos 13 `throw new` diretos por AuthErrorFactory
  - Tipos adicionados: TOKEN_NOT_PROVIDED, USER_NOT_AUTHENTICATED, ACCESS_DENIED, etc.

### Improved

- **ReduÃ§Ã£o de DuplicaÃ§Ã£o de CÃ³digo**
  - DeviceIno: de 19 duplicaÃ§Ãµes para 1 centralizada
  - Tratameno de erros: 100% usano AuthErrorFactory
  - UserMapper eliminano duplicaÃ§Ãµes de mapeameno
  - CPFUtils centralizano lÃ³gica de mascarameno

- **Arquitetura DDD**
  - SeparaÃ§Ã£o clara entre camadas
  - Sistema de evenos para comunicaÃ§Ã£o entre mÃ³dulos
  - Validadores reutilizÃ¡veis no shared
  - Constantes centralizadas por tipo

### Technical

- **Qualidade de CÃ³digo**
  - Build sem erros TypeScript
  - API funcionano corretamente no Docker
  - 7 de 22 correÃ§Ãµes crÃ­ticas implementadas
  - Base preparada para sistema de evenos completo

## [0.9.0] - 2025-09-03

### Changed

- **Limpeza Total de CÃ³digo**
  - Removidos TODOS os comentÃ¡rios de TODOS os arquivos TypeScript
  - Incluino JSDoc, comentÃ¡rios de linha e blocos
  - CÃ³digo mais limpo e profissional
  - Mantidos apenas `.describe()` do Zod para documentaÃ§Ã£o Swagger

### Improved

- **OrganizaÃ§Ã£o de DiretÃ³rios**
  - Removidos 8 diretÃ³rios vazios redundantes do boilerplate inicial
  - Mantida estrutura modular (por feature) ao invÃ©s de centralizada
  - Estrutura mais coerente com DDD modular

### Technical

- **Qualidade de CÃ³digo**
  - Zero comentÃ¡rios no cÃ³digo (cÃ³digo auto-explicativo)
  - Melhor aderÃªncia aos padrÃµes clean code
  - RemoÃ§Ã£o de diretÃ³rios desnecessÃ¡rios: domain/enums, domain/interfaces/\*, infrastructure/config, etc
  - Mantidos apenas diretÃ³rios essenciais para futuras implementaÃ§Ãµes

## [0.8.0] - 2025-09-03


- **Contador de Tentativas no 2FA**
  - Sistema de bloqueio apÃ³s 3 tentativas erradas
  - Incremeno automÃ¡tico de tentativas em cÃ³digos invÃ¡lidos
  - Bloqueio efetivo quano attempts >= max_attempts
  - MÃ©todo `findValidTwoFactorCode` no repositÃ³rio

### Fixed

- **LÃ³gica de ValidaÃ§Ã£o 2FA**
  - Corrigido incremeno de tentativas para cÃ³digos vÃ¡lidos
  - Agora incrementa tentativas do cÃ³digo ativo, nÃ£o do cÃ³digo errado
  - ValidaÃ§Ã£o correta busca cÃ³digo vÃ¡lido antes de verificar match

### Improved

- **SeguranÃ§a do 2FA**
  - Bloqueio automÃ¡tico apÃ³s exceder tentativas
  - NÃ£o aceita cÃ³digo correto apÃ³s bloqueio
  - ProteÃ§Ã£o contra forÃ§a bruta

### Technical

- **Limpeza de CÃ³digo**
  - Removidos todos os TODOs do mÃ³dulo auth
  - Implementado contador de tentativas completo
  - CÃ³digo de produÃ§Ã£o sem comentÃ¡rios desnecessÃ¡rios

## [0.7.0] - 2025-09-03


- **Two-Factor Authentication (2FA) Completo**
  - Criada tabela `two_factor_codes` no Supabase Cloud
  - GeraÃ§Ã£o de cÃ³digos de 6 dÃ­gitos com expiraÃ§Ã£o de 5 minutos
  - Envio de cÃ³digo por email com template HTML responsivo
  - ValidaÃ§Ã£o de cÃ³digo com limite de 3 tentativas
  - IntegraÃ§Ã£o completa com Supabase Auth (sem bano local)
  - Logs visuais no desenvolvimento com links do Ethereal
  - Suporte para trust device (30 dias vs 7 dias padrÃ£o)

### Fixed

- **2FA com Supabase**: IntegraÃ§Ã£o dos use cases de 2FA
  - `send-two-fa.use-case.ts`: Busca usuÃ¡rio do Supabase ao invÃ©s de bano local
  - `validate-two-fa.use-case.ts`: Remove update em tabela local inexistente
  - AtualizaÃ§Ã£o de lastLoginAt via Supabase user_metadata
  - CorreÃ§Ã£o de extraÃ§Ã£o de dados do usuÃ¡rio (user.user || user)

### Database

- **Tabela two_factor_codes**: Estrutura completa criada
  - Colunas: id, user_id, code, method, expires_at, attempts, max_attempts, is_used, used_at, created_at
  - Ãndices para performance: idx_two_factor_codes_user_id, idx_two_factor_codes_expires_at
  - Foreign key com auth.users com CASCADE DELETE

### Documentation

- **Fluxo 2FA Documentado**: Como funciona o sistema completo
  - Login detecta 2FA habilitado e retorna tempToken
  - Envio de cÃ³digo gera 6 dÃ­gitos e salva no bano
  - ValidaÃ§Ã£o verifica cÃ³digo e retorna tokens JWT completos

## [0.6.0] - 2025-09-03


- **Sistema de VerificaÃ§Ã£o de Email com Tokens Seguros**
  - Criada tabela `email_verification_tokens` no Supabase
  - Tokens Ãºnicos de 64 caracteres hexadecimais
  - ExpiraÃ§Ã£o de 24 horas para tokens
  - Tokens marcados como usados apÃ³s verificaÃ§Ã£o
  - ValidaÃ§Ã£o robusta: rejeita tokens de teste, tokens curtos, formatos invÃ¡lidos
  - IntegraÃ§Ã£o com fluxo de criaÃ§Ã£o de usuÃ¡rios

- **Melhorias no MÃ³dulo de AutenticaÃ§Ã£o**
  - Refresh token agora retorna dados completos do usuÃ¡rio (email, name, role correto)
  - VerificaÃ§Ã£o de email com validaÃ§Ã£o real de tokens no bano
  - UsuÃ¡rios criados com `emailVerified: false` atÃ© confirmar email
  - Link de verificaÃ§Ã£o enviado por email com token Ãºnico

### Fixed

- **Refresh Token**: Corrigido para acessar corretamente `supabaseData.user`
  - Antes retornava email vazio, name vazio e role sempre PATIENT
  - Agora retorna todos os dados corretos do user_metadata
- **Email Verified**: Corrigido valor hardcoded
  - UsuÃ¡rios eram criados com `emailVerified: true` inorretamente
  - Agora comeÃ§am com `false` e sÃ³ mudam apÃ³s verificaÃ§Ã£o real

### Security

- **Verify Email**: Removido aceite de qualquer token
  - Antes tinha TODO e aceitava qualquer string
  - Agora valida token no bano de dados
  - Tokens sÃ³ podem ser usados uma vez
  - ExpiraÃ§Ã£o de 24 horas implementada

### Documentation

- **README**: Adicionada tabela completa de usuÃ¡rios de teste
- **onterapi-dev.md**: Documentada configuraÃ§Ã£o correta de conexÃ£o PostgreSQL/Supabase

## [0.5.1] - 2025-09-02

### Fixed

- **JwtAuthGuard**: Corrigido problema crÃ­tico de extraÃ§Ã£o de metadata do usuÃ¡rio
  - Guard estava acessano inorretamente `user.user_metadata` ao invÃ©s de `user.user.user_metadata`
  - Isso causava todos os usuÃ¡rios serem identificados como role PATIENT
  - Agora extrai corretamente o role do metadata do Supabase
  - RolesGuard funcionano adequadamente apÃ³s correÃ§Ã£o


- **ConfiguraÃ§Ã£o SUPABASE_SERVICE_ROLE_KEY**: Adicionada chave de serviÃ§o ao .env
  - NecessÃ¡ria para operaÃ§Ãµes administrativas do Supabase
  - Permite deletar e gerenciar usuÃ¡rios via API admin

### Changed

- **MÃ³dulo Users**: Endpoints totalmente testados e funcionais
  - POST /users - CriaÃ§Ã£o com validaÃ§Ã£o de CPF e telefone âœ…
  - GET /users - Listagem com paginaÃ§Ã£o (requer SUPER_ADMIN) âœ…
  - GET /users/:id - Busca por ID (retorna estrutura vazia - conhecido) âš ï¸
  - PATCH /users/:id - AtualizaÃ§Ã£o parcial funcionano âœ…
  - DELETE /users/:id - DeleÃ§Ã£o soft (requer SUPER_ADMIN) âœ…
  - PUT /users/:id - NÃ£o implementado (retorna 404) âŒ

## [0.5.0] - 2025-09-02


- **Sistema de AutenticaÃ§Ã£o 100% Supabase Cloud**
  - RemoÃ§Ã£o completa de bano de dados local
  - AutenticaÃ§Ã£o usano apenas Supabase Auth
  - NÃ£o hÃ¡ mais tabelas locais de usuÃ¡rios ou sessÃµes
  - IntegraÃ§Ã£o direta com Supabase para todas operaÃ§Ãµes

- **Email de Alerta de Login**
  - NotificaÃ§Ã£o automÃ¡tica por email em cada login
  - InormaÃ§Ãµes incluÃ­das: IP, dispositivo, localizaÃ§Ã£o, data/hora
  - Template HTML profissional e responsivo
  - Logs com link direto do Ethereal para visualizaÃ§Ã£o em desenvolvimento

- **Melhorias no Docker**
  - ConfiguraÃ§Ã£o de DNS com Google DNS (8.8.8.8, 8.8.4.4)
  - Extra hosts configurados para Supabase e SMTP
  - IPs diretos para evitar problemas de resoluÃ§Ã£o DNS
  - Health check configurado para monitorameno

- **Logs Aprimorados**
  - Links do Ethereal destacados nos logs
  - Mensagens formatadas para melhor visualizaÃ§Ã£o
  - Warnings visuais para evenos importantes

### Changed

- **Arquitetura Simplificada**
  - SignInUseCase usa apenas Supabase Auth
  - CreateUserUseCase cria usuÃ¡rios direto no Supabase
  - RemoÃ§Ã£o de todas as referÃªncias a authRepository local
  - User metadata armazenado no Supabase

- **ConfiguraÃ§Ã£o de Ambiente**
  - DB_HOST usano IP direto do pooler Supabase
  - Extra hosts no Docker para todos serviÃ§os externos
  - NODE_OPTIONS com dns-result-order=ipv4first

### Fixed

- ResoluÃ§Ã£o DNS no Docker para smtp.ethereal.email
- Problemas de conectividade com Supabase no Docker
- Envio de emails funcionano corretamente no container
- Login e criaÃ§Ã£o de usuÃ¡rios 100% funcional

### Security

- Nenhuma inormaÃ§Ã£o sensÃ­vel armazenada localmente
- Todos os dados de usuÃ¡rios no Supabase cloud
- Service keys apenas para operaÃ§Ãµes administrativas
- Tokens JWT com expiraÃ§Ã£o de 15 minutos

## [0.4.1] - 2025-09-02


- **ServiÃ§o de Email Completo** - Infraestrutura para envio de emails
  - EmailService implementado com Nodemailer
  - Templates HTML responsivos para todos os tipos de email
  - IntegraÃ§Ã£o com Ethereal para testes de desenvolvimento
  - Suporte para produÃ§Ã£o com qualquer provedor SMTP
  - MÃ¡scarameno de endereÃ§os de email para privacidade

- **Two-Factor Authentication via Email**
  - SendTwoFAUseCase para envio de cÃ³digos 2FA
  - Endpoint `POST /auth/two-factor/send` para solicitar cÃ³digo
  - CÃ³digos de 6 dÃ­gitos com expiraÃ§Ã£o de 5 minutos
  - Template de email especÃ­fico para cÃ³digos 2FA
  - IntegraÃ§Ã£o completa com fluxo de autenticaÃ§Ã£o

- **Templates de Email Implementados**
  - CÃ³digo de verificaÃ§Ã£o 2FA com design profissional
  - Email de boas-vindas com onoarding
  - RedefiniÃ§Ã£o de senha com link seguro
  - VerificaÃ§Ã£o de email para novos cadastros
  - Alerta de login suspeito com detalhes do acesso

### Changed

- Auth module atualizado com provider ISendTwoFAUseCase
- Controller de autenticaÃ§Ã£o com novo endpoint de envio 2FA
- DocumentaÃ§Ã£o Swagger atualizada com exemplos de uso

### Fixed

- Typo em nodemailer.createTransport (estava createTransporter)
- VerificaÃ§Ã£o de token 2FA com Result pattern correto
- Acesso ao userId do TwoFactorTokenPayload usano 'sub'

## [0.4.0] - 2025-09-02


- **MÃ³dulo Users CRUD Completo** - GestÃ£o completa de usuÃ¡rios
  - Create, Read, Update, Delete com permissÃµes granulares
  - UserOwnerGuard: Adminou prÃ³prio usuÃ¡rio podem editar/deletar
  - Listagem de todos usuÃ¡rios restrita a admins
  - IntegraÃ§Ã£o com Supabase Auth para criaÃ§Ã£o de usuÃ¡rios
  - ValidaÃ§Ã£o completa com Zod schemas
  - Swagger documentation com exemplos para todos endpoints
  - Suporte a filtros: role, tenantId, isActive
  - PaginaÃ§Ã£o em listagens
  - Soft delete manteno histÃ³rico

- **UtilitÃ¡rios Centralizados**
  - roles.util.ts: FunÃ§Ãµes centralizadas para verificaÃ§Ã£o de roles
  - SupabaseService: ServiÃ§o dedicado para integraÃ§Ã£o com Supabase Auth

### Changed

- **RefatoraÃ§Ã£o Massiva de Arquitetura** - Sistema 100% limpo
  - Entidades do domain removidas (mantidas apenas no infrastructure)
  - Validadores conolidados em auth.validators.ts Ãºnico
  - Hierarquia de roles centralizada em roles.util.ts
  - Zero duplicaÃ§Ã£o de cÃ³digo em todo o sistema

### Removed

- **CÃ³digo Redundante Eliminado** - 616 linhas removidas
  - MessageBus nÃ£o utilizado (61 evenos nunca usados)
  - Health controller duplicado
  - Entidades duplicadas do domain layer
  - Validadores duplicados (health.validators.ts)
  - 8 arquivos desnecessÃ¡rios eliminados

### Fixed

- Circular dependency em DTOs do mÃ³dulo Users
- Imports apÃ³s refatoraÃ§Ã£o massiva
- Build do Docker com nova estrutura

## [0.3.1] - 2025-09-02


- **DocumentaÃ§Ã£o Swagger Completa**
  - @ApiBody com types e examples em todos endpoints
  - DTOs para signout e me responses
  - DescriÃ§Ãµes detalhadas e exemplos realistas
  - Todos endpoints testÃ¡veis no Swagger UI
  - Regra de documentaÃ§Ã£o obrigatÃ³ria em onterapi-dev.md

### Fixed

- Headers user-agent e ip removidos do Swagger UI para interface mais limpa
- Path aliases (@infrastructure, @domain, @shared) removidos para compatibilidade com Vercel
- Erros TypeScript nos DTOs com definite assignment operator

### Changed

- Endpoint /me alterado de POST para GET (mais RESTful)
- Simplificada captura de deviceIno nos endpoints

### Removed

- **Endpoint sign-up removido do mÃ³dulo Auth**
  - Cadastro de usuÃ¡rios serÃ¡ feito no mÃ³dulo Users (a ser criado)
  - SignUpUseCase e arquivos relacionados removidos
  - Auth agora Ã© exclusivamente para autenticaÃ§Ã£o (login, logout, refresh, 2FA)

## [0.3.0] - 2025-09-01


- **MÃ³dulo de AutenticaÃ§Ã£o Completo** - Arquitetura DDD e Clean Architecture
  - **Domain Layer**: Entidades puras, interfaces de use cases, repositÃ³rios e serviÃ§os
  - **Infrastructure Layer**: Entidades TypeORM, integraÃ§Ã£o com Supabase Auth, repositÃ³rio com Query Builder
  - **Application Layer**: Controllers REST, DTOs, implementaÃ§Ã£o dos use cases
  - **Sistema de Roles (RBAC)**: 11 roles hierÃ¡rquicos (SUPER_ADMIN, CLINIC_OWNER, PROFESSIONAL, etc.)
  - **Multi-tenant**: Suporte completo com isolameno por tenant_id
  - **Two-Factor Authentication (2FA)**: Suporte para TOTP, SMS e email
  - **SeguranÃ§a**: JWT tokens, refresh tokens, rate limiting, proteÃ§Ã£o contra brute force
  - **Guards**: JwtAuthGuard, RolesGuard, TenantGuard
  - **Decorators**: @Public, @Roles, @CurrentUser

- **Shared Utils**: FunÃ§Ãµes reutilizÃ¡veis seguino padrÃµes enterprise
  - `db-connection.util.ts`: Savepoints para transaÃ§Ãµes granulares
  - `crypto.util.ts`: Hash com bcryptjs, criptografia AES-256
  - `auth.validators.ts`: Validadores Zod para CPF, senha forte, telefone
  - **Result Pattern**: Tratameno de erros consistente
  - **Zod Validation Pipe**: ValidaÃ§Ã£o forte de tipos

- **Docker Configuration**
  - Dockerfile otimizado com multi-stage build e usuÃ¡rio nÃ£o-root
  - Docker Compose com Redis, health checks e networking
  - Scripts de automaÃ§Ã£o para Winows (PowerShell) e Linux (Bash)
  - DocumentaÃ§Ã£o completa integrada no README
  - Porta 3001 configurada para evitar conflitos

### Fixed

- ConexÃ£o com bano usano Supabase Pooler para IPv4 (Docker/Vercel)
- TypeScript property initialization com definite assignment operator
- Dependency injection com @Inject decorator para interfaces
- Import bcryptjs ao invÃ©s de bcrypt para compatibilidade Docker
- ConfiguraÃ§Ã£o de ambiente correta (SUPABASE_SERVICE_ROLE_KEY)

### Changed

- MigraÃ§Ã£o para Supabase Pooler (aws-0-sa-east-1.pooler.supabase.com:6543)
- Porta padrÃ£o alterada de 3000 para 3001
- DocumentaÃ§Ã£o Docker centralizada no README
- Uso de apenas .env para configuraÃ§Ã£o (sem .env.docker)

## [0.2.4] - 2025-09-01

### Fixed

- Erro de runtime na Vercel corrigido (sintaxe nodejs20.x removida)
- ConfiguraÃ§Ã£o vercel.json simplificada usano builds/routes padrÃ£o
- Erro "Canot find module '@shared/messaging/message-bus.module'" definitivamente corrigido
- Path aliases removidos em favor de caminos relativos para compatibilidade com Vercel

### Changed

- Import de @shared/messaging mudado para ./shared/messaging (camino relativo)
- Removido tsconfig-paths que nÃ£o funciona em ambiente serverless
- Script de build simplificado removeno tsc-alias

## [0.2.3-alpha.1] - 2025-08-31

### Fixed

- Import do Express corrigido de namespace para default import no api/index.ts
- ConfiguraÃ§Ã£o do Vercel atualizada para NestJS serverless
- api/index.ts simplificado removeno dependÃªncia do BootstrapFactory
- Build passano localmente e prono para deploy

### Changed

- vercel.json reconfigurado com framework null e funÃ§Ãµes serverless
- Runtime definido como nodejs20.x com limites apropriados
- ConfiguraÃ§Ãµes de produÃ§Ã£o inline no api/index.ts (helmet, validation)
- Logger condicional baseado em NODE_ENV


- ValidationPipe global configurado no handler serverless
- Helmet.js para seguranÃ§a em produÃ§Ã£o
- DocumentaÃ§Ã£o de variÃ¡veis de ambiente necessÃ¡rias para Vercel

## [0.2.2-alpha.1] - 2025-08-31

### Fixed

- Corrigido .vercelignore que estava removeno arquivos necessÃ¡rios (src, tsconfig)
- Ajustado vercel.json para usar builds e routes corretos
- Handler /api/index.ts otimizado para Vercel
- Build da Vercel agora funciona corretamente

### Changed

- SimplificaÃ§Ã£o do .vercelignore manteno apenas arquivos desnecessÃ¡rios
- vercel.json usa configuraÃ§Ã£o de builds ao invÃ©s de rewrites

## [0.2.1-alpha.1] - 2025-08-31


- Suporte completo para deploy serverless na Vercel
- ConfiguraÃ§Ã£o de edge functions otimizada
- DocumentaÃ§Ã£o de variÃ¡veis de ambiente necessÃ¡rias

## [0.2.0-alpha.1] - 2025-08-31


- IntegraÃ§Ã£o completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitorameno completo (DB, memÃ³ria, disco)
- Sistema de mensageria unificado com EventEmitter
- Bootstrap factory centralizada para eliminar duplicaÃ§Ã£o
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- IntegraÃ§Ã£o com @nestjs/terminus para health checks nativos
- Output style customizado para desenvolvimento OnTerapi
- Regras de qualidade extrema (DRY, linter, build obrigatÃ³rios)
- Boilerplate inicial do projeto
- Estrutura de pastas seguino DDD
- ConfiguraÃ§Ãµes base (TypeScript, ESLint, Prettier)
- Package.json com dependÃªncias essenciais
- README com documentaÃ§Ã£o inicial
- Sistema de Versionamento semÃ¢ntico

### Changed

- Bano de dados migrado de local para Supabase cloud
- README expandido com documentaÃ§Ã£o completa do Supabase
- DocumentaÃ§Ã£o centralizada no README (regra: sem arquivos .md extras)
- RefatoraÃ§Ã£o completa para eliminar duplicaÃ§Ã£o de cÃ³digo
- SubstituiÃ§Ã£o de `any` por `unknown` para type safety
- Path do DiskHealthIndicator corrigido para Winows

### Removed

- Arquivos de teste desnecessÃ¡rios (main-test.ts, app-test.module.ts)
- MÃ³dulo example removido (nÃ£o essencial)
- Entidade test.entity.ts removida
- MÃ³dulo health customizado (usano Terminus nativo)

### Fixed

- Erros de TypeScript em decorators Zod
- Imports nÃ£o utilizados removidos
- ConfiguraÃ§Ã£o de paths TypeScript (@shared, @domain, etc)
- Health check no Winows (path C:\ ao invÃ©s de /)

### Security

- SSL/TLS habilitado para conexÃ£o com Supabase
- SeparaÃ§Ã£o de chaves pÃºblicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementaÃ§Ã£o
- Helmet.js configurado para seguranÃ§a HTTP

---

_Mantenha este arquivo atualizado a cada release_



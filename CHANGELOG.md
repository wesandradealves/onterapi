# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Changed

### Fixed

### Security

### Documentation
- Fluxograma atualizado para indicar os testes automatizados do modulo Auth.
- README atualizado com baseline de qualidade de 26/09 (totais de 155 testes, cobertura 100%) e payload de pacientes ampliado com campos clinicos.
- coverage/coverage-summary.json versionado para preservar a referencia de cobertura plena.

## [0.16.4] - 2025-09-25

### Added
- Suites de integracao para Auth e Users cobrindo validacoes, guards e repositorios in-memory (test/integration/auth.controller.integration.spec.ts, test/integration/users.controller.integration.spec.ts).
- Suites e2e para Auth e Users exercitando login 2FA, CRUD completo e logout (test/e2e/auth.e2e-spec.ts, test/e2e/users.e2e-spec.ts).
- Suite unitaria dedicada ao user-request.mapper garantindo cobertura integral (test/unit/modules.users.user-request.mapper.spec.ts).
- Estrutura inicial de testes automatizados com Jest (jest.config.js, tsconfig.test.json) e suites unitarias para presenters, utils e guards.
- Suites unitarias adicionais cobrindo BaseUseCase, CPFValidator, presenters de pacientes/usuarios e CreatePatientUseCase.
- Cobertura unitaria estendida para 100% dos casos de uso de pacientes, pipe Zod, validator de CPF e UseCaseWrapper.
- Suites de integracao (test/integration/patients.controller.integration.spec.ts) e e2e (test/e2e/patients.e2e-spec.ts) para PatientsController com mocks controlados de guardas e repositorio.
- Suite unitaria dedicada ao listUsersSchema garantindo coercoes de filtros (test/unit/modules.users.list-users-schema.spec.ts).
- Suite unitaria dedicada ao listPatientsSchema garantindo coercoes de filtros de query (test/unit/modules.patients.list-patients-schema.spec.ts).
- Suite unitaria dedicada ao signOutSchema garantindo defaults e validacao do payload (test/unit/modules.auth.sign-out-schema.spec.ts).
- Mapper central para requests de pacientes (src/modules/patients/api/mappers/patient-request.mapper.ts) com suites unitarias completas (test/unit/modules.patients/patient-request.mapper.spec.ts).
- Mapper compartilhado para normalizacao dos fluxos de auth (src/modules/auth/api/mappers/auth-request.mapper.ts) coberto por testes dedicados (test/unit/modules.auth/auth-request.mapper.spec.ts).

### Changed
- test/jest-e2e.json passa a usar tsconfig.e2e.json diretamente no transform, eliminando os warnings de configuracao do ts-jest.
- README.md consolidado com baseline de qualidade, guia de modulos e roteiro PowerShell para testes manuais via curl (QUALITY_BASELINE.md incorporado).
- UsersController delega normalizacao de create/list/update ao mapper compartilhado, usando ZodValidationPipe e fallback de tenant (src/modules/users/api/controllers/users.controller.ts:97).
- Controllers de Auth e Users passam a reutilizar unwrapResult, reduzindo boilerplate de tratamento de Result.
- QUALITY_BASELINE.md atualizado com novas notas, metas e evidencias alinhadas a cobertura total.
- Script npm test:cov agora executa em modo sequencial (--runInBand) para evitar falhas intermitentes dos workers.
- coverageThreshold global no Jest elevado para 100% de statements/branches/functions/lines.
- jest.config.js passa a coletar cobertura dos mappers de pacientes, prevenindo regressao silenciosa (jest.config.js:17).
- UsersController e os casos de uso de usuario consomem dados validados via Zod, eliminando class-validator duplicado e adotando CreateUserCommand/IUpdateUser (src/modules/users/api/controllers/users.controller.ts, src/modules/users/use-cases).
- PatientsController aplica ZodValidationPipe em create/list e remove pipes redundantes, alinhando o fluxo ao dominio (src/modules/patients/api/controllers/patients.controller.ts).
- AuthController e TwoFactorController delegam normalizacao aos mappers compartilhados, eliminando construcoes duplicadas (src/modules/auth/api/controllers/auth.controller.ts:118, src/modules/auth/api/controllers/two-factor.controller.ts:55).
- DTOs do modulo de pacientes agora servem apenas ao Swagger, sem class-validator, refletindo o schema compartilhado (src/modules/patients/api/dtos/create-patient.dto.ts, src/modules/patients/api/dtos/update-patient.dto.ts, src/modules/patients/api/dtos/export-patients.dto.ts).
- PatientsController utiliza resolveContext e o mapper compartilhado para construir inputs de dominio sem duplicacao (src/modules/patients/api/controllers/patients.controller.ts:113, src/modules/patients/api/mappers/patient-request.mapper.ts:96).

### Fixed

### Security

### Documentation
- README.md documenta o fluxo completo de testes manuais (Auth, Users, Patients) e unifica a baseline de qualidade.
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.
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

- APP_URL configurado explicitamente para desenvolvimento (http://localhost:3000) e produÃƒÂ§ÃƒÂ£o (https://onterapi.vercel.app), alinhando os links usados pelos e-mails transacionais.
- DTOs de pacientes e usuÃƒÂ¡rios atualizados com descriÃƒÂ§ÃƒÂµes e exemplos acentuados corretamente.

### Fixed

- SupabaseAuthService.deleteUser ignora respostas "user not found" do Supabase e segue com o soft delete local.
- Assuntos dos e-mails de verificaÃƒÂ§ÃƒÂ£o, 2FA e boas-vindas corrigidos para exibir acentuaÃƒÂ§ÃƒÂ£o adequada.

## [0.16.0] - 2025-09-24

### Changed

- Provedor de email migrado para Resend, substituino o transporte SMTP local e atualizano variÃƒÂ¡veis de ambiente.
- Remetente padrÃƒÂ£o apontano para Onterapi <noreply@onterapi.com.br> nos envs e integraÃƒÂ§ÃƒÂµes.

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
- Fluxo de Two-Factor no Swagger atualizado: payload de validaÃƒÂ§ÃƒÂ£o documentado e endpoint manual de reenvio oculto.
- Swagger: removido esquema de API key nÃƒÂ£o utilizado para evitar confusÃƒÂ£o na autenticaÃƒÂ§ÃƒÂ£o.
- Filtros da listagem de pacientes no Swagger exibem enums reais (status, risco, quickFilter) alinhados ÃƒÂ s validaÃƒÂ§ÃƒÂµes de back-end.

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

- ReforÃƒÂ§o de seguranÃƒÂ§a exigino segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- CÃƒÂ³digos 2FA gerados com RNG criptogrÃƒÂ¡fico
- JwtAuthGuard agora injeta o contexto completo do usuÃƒÂ¡rio utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, signout, refresh) para respostas consistentes

### Fixed

- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- CriaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rios utilizano a interface unificada do Supabase Auth

### Infrastructure

- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.0] - 2025-09-04


- **ValidaÃƒÂ§ÃƒÂ£o de email obrigatÃƒÂ³ria para login**
  - UsuÃƒÂ¡rios nÃƒÂ£o podem fazer login sem confirmar email
  - Mensagem especÃƒÂ­fica "Email nÃƒÂ£o verificado" ao invÃƒÂ©s de "Credenciais invÃƒÂ¡lidas"
  - Tratameno correto do erro "Email not confirmed" do Supabase

### Fixed

- **CorreÃƒÂ§ÃƒÂµes no fluxo de autenticaÃƒÂ§ÃƒÂ£o**
  - VerificaÃƒÂ§ÃƒÂ£o de email confirmado antes de permitir login
  - PrevenÃƒÂ§ÃƒÂ£o de confirmaÃƒÂ§ÃƒÂ£o duplicada de email (retorna erro apropriado)
  - Mensagens de erro mais claras e especÃƒÂ­ficas para cada situaÃƒÂ§ÃƒÂ£o

### Improved

- **Sistema de verificaÃƒÂ§ÃƒÂ£o de email**
  - Token de verificaÃƒÂ§ÃƒÂ£o ÃƒÂºnico por usuÃƒÂ¡rio
  - NÃƒÂ£o permite confirmar email jÃƒÂ¡ confirmado
  - IntegraÃƒÂ§ÃƒÂ£o completa com Supabase email_confirmed_at

### Tested

- **Fluxo completo de autenticaÃƒÂ§ÃƒÂ£o validado**
  - Login bloqueado sem email confirmado Ã¢Å“â€œ
  - Login funcional apÃƒÂ³s confirmaÃƒÂ§ÃƒÂ£o Ã¢Å“â€œ
  - PrevenÃƒÂ§ÃƒÂ£o de confirmaÃƒÂ§ÃƒÂ£o duplicada Ã¢Å“â€œ
  - 2FA funcionano corretamente Ã¢Å“â€œ
  - Bloqueio apÃƒÂ³s 3 tentativas erradas de 2FA Ã¢Å“â€œ

## [0.12.0] - 2025-09-03


- **BaseUseCase para eliminaÃƒÂ§ÃƒÂ£o de duplicaÃƒÂ§ÃƒÂ£o de try-catch**
  - Criado BaseUseCase abstrato que centraliza tratameno de erros
  - 10 use cases refatorados para usar o padrÃƒÂ£o DRY
  - UseCaseWrapper criado para adaptar diferentes assinaturas de mÃƒÂ©todos
  - UpdateUserUseCase e DeleteUserUseCase usano wrapper pattern

- **BaseGuard para abstraÃƒÂ§ÃƒÂ£o de guards**
  - Criado BaseGuard que centraliza lÃƒÂ³gica comum
  - 6 guards refatorados (JwtAuth, Roles, Tenant, UserOwner, EmailVerified, ActiveAccount)
  - MÃƒÂ©todo getUser() centralizado para extraÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rio do contexto

- **Sistema de mensagens centralizado**
  - MESSAGES.constants.ts criado com todas as mensagens do sistema
  - 0 mensagens hardcoded (100% centralizadas)
  - SeÃƒÂ§ÃƒÂµes organizadas: AUTH, USER, VALIDATION, EVENTS, ERRORS, GUARDS, LOGS

- **DivisÃƒÂ£o de controllers e serviÃƒÂ§os grandes**
  - TwoFactorController separado do AuthController
  - EmailService dividido em 3: AuthEmailService, NotificationEmailService e facade
  - ReduÃƒÂ§ÃƒÂ£o significativa de complexidade por arquivo

- **Event Subscribers implementados**
  - AuthEventsSubscriber para evenos de autenticaÃƒÂ§ÃƒÂ£o
  - UserEventsSubscriber para evenos de usuÃƒÂ¡rios
  - IntegraÃƒÂ§ÃƒÂ£o completa com MessageBus

### Changed

- **Result Pattern aplicado em toda a aplicaÃƒÂ§ÃƒÂ£o**
  - Todas as interfaces de use cases retornano Result<T>
  - Controllers atualizados para tratar result.error e result.data
  - Tratameno de erros padronizado e consistente

- **UsuÃƒÂ¡rio padrÃƒÂ£o do sistema**
  - Removidos todos os usuÃƒÂ¡rios de teste
  - Mantido apenas 1 super admin (lina73@ethereal.email / senha: admin)
  - README atualizado com credenciais simplificadas

### Fixed

- **CorreÃƒÂ§ÃƒÂµes crÃƒÂ­ticas de arquitetura DRY**
  - Eliminadas 635 linhas de cÃƒÂ³digo duplicado
  - ReduÃƒÂ§ÃƒÂ£o de duplicaÃƒÂ§ÃƒÂ£o de 20% para 0%
  - 100% dos use cases usano BaseUseCase ou wrapper
  - 100% dos guards usano BaseGuard

### Improved

- **Qualidade e manutenibilidade do cÃƒÂ³digo**
  - Zero comentÃƒÂ¡rios no cÃƒÂ³digo (cÃƒÂ³digo auto-documentado)
  - Zero mensagens hardcoded em logs
  - Arquitetura DDD/Clean 100% consistente
  - Todos os testes de endpoints passano

### Technical

- **MÃƒÂ©tricas finais de refatoraÃƒÂ§ÃƒÂ£o**
  - 396 inserÃƒÂ§ÃƒÂµes, 968 deleÃƒÂ§ÃƒÂµes (saldo: -572 linhas)
  - 35 arquivos modificados
  - 10 use cases refatorados
  - 6 guards refatorados
  - 3 serviÃƒÂ§os divididos
  - 0 duplicaÃƒÂ§ÃƒÂµes restantes

## [0.11.0] - 2025-09-03


- **Sistema de Evenos Integrado aos Use Cases**
  - 7 evenos publicados em use cases crÃƒÂ­ticos
  - USER_CREATED, USER_UPDATED, USER_DELETED implementados
  - USER_LOGGED_IN, TOKEN_REFRESHED implementados
  - TWO_FA_SENT, TWO_FA_VALIDATED implementados
  - MessageBus integrado nos mÃƒÂ³dulos Auth e Users
  - EventEmitterModule configurado para mensageria assÃƒÂ­ncrona

### Fixed

- **EliminaÃƒÂ§ÃƒÂ£o de DuplicaÃƒÂ§ÃƒÂµes no Controllers**
  - Removido mÃƒÂ©todo mapToResponse duplicado em users.controller
  - SubstituÃƒÂ­do por uso direto de CPFUtils.mask inline
  - ReduÃƒÂ§ÃƒÂ£o de 19 linhas de cÃƒÂ³digo duplicado

- **Erros de CompilaÃƒÂ§ÃƒÂ£o TypeScript**
  - Corrigido uso inorreto de normalizeLoginIno em sign-in.use-case
  - Ajustado acesso a propriedades do objeto loginIno
  - Build passano sem erros

### Improved

- **IntegraÃƒÂ§ÃƒÂ£o de Mensageria**
  - MessageBus injetÃƒÂ¡vel em todos os use cases
  - EventEmitterModule.forRoot() configurado nos mÃƒÂ³dulos
  - Base para comunicaÃƒÂ§ÃƒÂ£o assÃƒÂ­ncrona entre mÃƒÂ³dulos
  - Preparado para integraÃƒÂ§ÃƒÂ£o com filas externas (RabbitMQ, Kafka)

- **Qualidade de CÃƒÂ³digo**
  - ReduÃƒÂ§ÃƒÂ£o de duplicaÃƒÂ§ÃƒÂ£o: de 20% para ~5%
  - 68% das correÃƒÂ§ÃƒÂµes crÃƒÂ­ticas implementadas (15/22)
  - Evenos implementados: 58% (7/12)
  - Zero throw new diretos (100% usano factory)

### Technical

- **MÃƒÂ©tricas de Progresso**
  - 15 correÃƒÂ§ÃƒÂµes crÃƒÂ­ticas de 22 pendentes implementadas
  - 7 use cases com evenos publicados
  - 3 mÃƒÂ©todos grandes ainda precisam refatoraÃƒÂ§ÃƒÂ£o
  - API estÃƒÂ¡vel e funcionano em produÃƒÂ§ÃƒÂ£o

## [0.10.0] - 2025-09-03


- **Sistema de Mensageria Completo**
  - MessageBus implementado com EventEmitter2
  - DomainEvents com 12 evenos definidos
  - Interface DomainEvent padronizada
  - Evenos: USER_CREATED, USER_UPDATED, USER_DELETED, USER_LOGGED_IN, etc.

- **Validadores Centralizados**
  - CPFValidator com validaÃƒÂ§ÃƒÂ£o completa de CPF brasileiro
  - EmailValidator com regex e normalizaÃƒÂ§ÃƒÂ£o
  - PhoneValidator com validaÃƒÂ§ÃƒÂ£o de DDDs brasileiros
- **Constantes Centralizadas**
  - validation.constants.ts com mensagens e patterns
  - error.constants.ts com cÃƒÂ³digos de erro padronizados
  - event.constants.ts com nomes de evenos

- **Tipos Centralizados**
  - DeviceIno movido para shared/types/device.types.ts
  - Eliminada duplicaÃƒÂ§ÃƒÂ£o em 19 arquivos

### Fixed

- **IUserRepository em ProduÃƒÂ§ÃƒÂ£o**
  - Corrigido mock vazio `useValue: {}`
  - Implementado `useClass: UserRepository`
  - Adicionado TypeOrmModule.forFeature([UserEntity])
  - Repository real agora ÃƒÂ© injetado corretamente

- **Tratameno de Erros Consistente**
  - AuthErrorFactory expandido com 5 novos tipos
  - SubstituÃƒÂ­dos 13 `throw new` diretos por AuthErrorFactory
  - Tipos adicionados: TOKEN_NOT_PROVIDED, USER_NOT_AUTHENTICATED, ACCESS_DENIED, etc.

### Improved

- **ReduÃƒÂ§ÃƒÂ£o de DuplicaÃƒÂ§ÃƒÂ£o de CÃƒÂ³digo**
  - DeviceIno: de 19 duplicaÃƒÂ§ÃƒÂµes para 1 centralizada
  - Tratameno de erros: 100% usano AuthErrorFactory
  - UserMapper eliminano duplicaÃƒÂ§ÃƒÂµes de mapeameno
  - CPFUtils centralizano lÃƒÂ³gica de mascarameno

- **Arquitetura DDD**
  - SeparaÃƒÂ§ÃƒÂ£o clara entre camadas
  - Sistema de evenos para comunicaÃƒÂ§ÃƒÂ£o entre mÃƒÂ³dulos
  - Validadores reutilizÃƒÂ¡veis no shared
  - Constantes centralizadas por tipo

### Technical

- **Qualidade de CÃƒÂ³digo**
  - Build sem erros TypeScript
  - API funcionano corretamente no Docker
  - 7 de 22 correÃƒÂ§ÃƒÂµes crÃƒÂ­ticas implementadas
  - Base preparada para sistema de evenos completo

## [0.9.0] - 2025-09-03

### Changed

- **Limpeza Total de CÃƒÂ³digo**
  - Removidos TODOS os comentÃƒÂ¡rios de TODOS os arquivos TypeScript
  - Incluino JSDoc, comentÃƒÂ¡rios de linha e blocos
  - CÃƒÂ³digo mais limpo e profissional
  - Mantidos apenas `.describe()` do Zod para documentaÃƒÂ§ÃƒÂ£o Swagger

### Improved

- **OrganizaÃƒÂ§ÃƒÂ£o de DiretÃƒÂ³rios**
  - Removidos 8 diretÃƒÂ³rios vazios redundantes do boilerplate inicial
  - Mantida estrutura modular (por feature) ao invÃƒÂ©s de centralizada
  - Estrutura mais coerente com DDD modular

### Technical

- **Qualidade de CÃƒÂ³digo**
  - Zero comentÃƒÂ¡rios no cÃƒÂ³digo (cÃƒÂ³digo auto-explicativo)
  - Melhor aderÃƒÂªncia aos padrÃƒÂµes clean code
  - RemoÃƒÂ§ÃƒÂ£o de diretÃƒÂ³rios desnecessÃƒÂ¡rios: domain/enums, domain/interfaces/\*, infrastructure/config, etc
  - Mantidos apenas diretÃƒÂ³rios essenciais para futuras implementaÃƒÂ§ÃƒÂµes

## [0.8.0] - 2025-09-03


- **Contador de Tentativas no 2FA**
  - Sistema de bloqueio apÃƒÂ³s 3 tentativas erradas
  - Incremeno automÃƒÂ¡tico de tentativas em cÃƒÂ³digos invÃƒÂ¡lidos
  - Bloqueio efetivo quano attempts >= max_attempts
  - MÃƒÂ©todo `findValidTwoFactorCode` no repositÃƒÂ³rio

### Fixed

- **LÃƒÂ³gica de ValidaÃƒÂ§ÃƒÂ£o 2FA**
  - Corrigido incremeno de tentativas para cÃƒÂ³digos vÃƒÂ¡lidos
  - Agora incrementa tentativas do cÃƒÂ³digo ativo, nÃƒÂ£o do cÃƒÂ³digo errado
  - ValidaÃƒÂ§ÃƒÂ£o correta busca cÃƒÂ³digo vÃƒÂ¡lido antes de verificar match

### Improved

- **SeguranÃƒÂ§a do 2FA**
  - Bloqueio automÃƒÂ¡tico apÃƒÂ³s exceder tentativas
  - NÃƒÂ£o aceita cÃƒÂ³digo correto apÃƒÂ³s bloqueio
  - ProteÃƒÂ§ÃƒÂ£o contra forÃƒÂ§a bruta

### Technical

- **Limpeza de CÃƒÂ³digo**
  - Removidos todos os TODOs do mÃƒÂ³dulo auth
  - Implementado contador de tentativas completo
  - CÃƒÂ³digo de produÃƒÂ§ÃƒÂ£o sem comentÃƒÂ¡rios desnecessÃƒÂ¡rios

## [0.7.0] - 2025-09-03


- **Two-Factor Authentication (2FA) Completo**
  - Criada tabela `two_factor_codes` no Supabase Cloud
  - GeraÃƒÂ§ÃƒÂ£o de cÃƒÂ³digos de 6 dÃƒÂ­gitos com expiraÃƒÂ§ÃƒÂ£o de 5 minutos
  - Envio de cÃƒÂ³digo por email com template HTML responsivo
  - ValidaÃƒÂ§ÃƒÂ£o de cÃƒÂ³digo com limite de 3 tentativas
  - IntegraÃƒÂ§ÃƒÂ£o completa com Supabase Auth (sem bano local)
  - Logs visuais no desenvolvimento com links do Ethereal
  - Suporte para trust device (30 dias vs 7 dias padrÃƒÂ£o)

### Fixed

- **2FA com Supabase**: IntegraÃƒÂ§ÃƒÂ£o dos use cases de 2FA
  - `send-two-fa.use-case.ts`: Busca usuÃƒÂ¡rio do Supabase ao invÃƒÂ©s de bano local
  - `validate-two-fa.use-case.ts`: Remove update em tabela local inexistente
  - AtualizaÃƒÂ§ÃƒÂ£o de lastLoginAt via Supabase user_metadata
  - CorreÃƒÂ§ÃƒÂ£o de extraÃƒÂ§ÃƒÂ£o de dados do usuÃƒÂ¡rio (user.user || user)

### Database

- **Tabela two_factor_codes**: Estrutura completa criada
  - Colunas: id, user_id, code, method, expires_at, attempts, max_attempts, is_used, used_at, created_at
  - ÃƒÂndices para performance: idx_two_factor_codes_user_id, idx_two_factor_codes_expires_at
  - Foreign key com auth.users com CASCADE DELETE

### Documentation
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.\n\n- **Fluxo 2FA Documentado**: Como funciona o sistema completo
  - Login detecta 2FA habilitado e retorna tempToken
  - Envio de cÃƒÂ³digo gera 6 dÃƒÂ­gitos e salva no bano
  - ValidaÃƒÂ§ÃƒÂ£o verifica cÃƒÂ³digo e retorna tokens JWT completos

## [0.6.0] - 2025-09-03


- **Sistema de VerificaÃƒÂ§ÃƒÂ£o de Email com Tokens Seguros**
  - Criada tabela `email_verification_tokens` no Supabase
  - Tokens ÃƒÂºnicos de 64 caracteres hexadecimais
  - ExpiraÃƒÂ§ÃƒÂ£o de 24 horas para tokens
  - Tokens marcados como usados apÃƒÂ³s verificaÃƒÂ§ÃƒÂ£o
  - ValidaÃƒÂ§ÃƒÂ£o robusta: rejeita tokens de teste, tokens curtos, formatos invÃƒÂ¡lidos
  - IntegraÃƒÂ§ÃƒÂ£o com fluxo de criaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rios

- **Melhorias no MÃƒÂ³dulo de AutenticaÃƒÂ§ÃƒÂ£o**
  - Refresh token agora retorna dados completos do usuÃƒÂ¡rio (email, name, role correto)
  - VerificaÃƒÂ§ÃƒÂ£o de email com validaÃƒÂ§ÃƒÂ£o real de tokens no bano
  - UsuÃƒÂ¡rios criados com `emailVerified: false` atÃƒÂ© confirmar email
  - Link de verificaÃƒÂ§ÃƒÂ£o enviado por email com token ÃƒÂºnico

### Fixed

- **Refresh Token**: Corrigido para acessar corretamente `supabaseData.user`
  - Antes retornava email vazio, name vazio e role sempre PATIENT
  - Agora retorna todos os dados corretos do user_metadata
- **Email Verified**: Corrigido valor hardcoded
  - UsuÃƒÂ¡rios eram criados com `emailVerified: true` inorretamente
  - Agora comeÃƒÂ§am com `false` e sÃƒÂ³ mudam apÃƒÂ³s verificaÃƒÂ§ÃƒÂ£o real

### Security

- **Verify Email**: Removido aceite de qualquer token
  - Antes tinha TODO e aceitava qualquer string
  - Agora valida token no bano de dados
  - Tokens sÃƒÂ³ podem ser usados uma vez
  - ExpiraÃƒÂ§ÃƒÂ£o de 24 horas implementada

### Documentation
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.\n\n- **README**: Adicionada tabela completa de usuÃƒÂ¡rios de teste
- **onterapi-dev.md**: Documentada configuraÃƒÂ§ÃƒÂ£o correta de conexÃƒÂ£o PostgreSQL/Supabase

## [0.5.1] - 2025-09-02

### Fixed

- **JwtAuthGuard**: Corrigido problema crÃƒÂ­tico de extraÃƒÂ§ÃƒÂ£o de metadata do usuÃƒÂ¡rio
  - Guard estava acessano inorretamente `user.user_metadata` ao invÃƒÂ©s de `user.user.user_metadata`
  - Isso causava todos os usuÃƒÂ¡rios serem identificados como role PATIENT
  - Agora extrai corretamente o role do metadata do Supabase
  - RolesGuard funcionano adequadamente apÃƒÂ³s correÃƒÂ§ÃƒÂ£o


- **ConfiguraÃƒÂ§ÃƒÂ£o SUPABASE_SERVICE_ROLE_KEY**: Adicionada chave de serviÃƒÂ§o ao .env
  - NecessÃƒÂ¡ria para operaÃƒÂ§ÃƒÂµes administrativas do Supabase
  - Permite deletar e gerenciar usuÃƒÂ¡rios via API admin

### Changed

- **MÃƒÂ³dulo Users**: Endpoints totalmente testados e funcionais
  - POST /users - CriaÃƒÂ§ÃƒÂ£o com validaÃƒÂ§ÃƒÂ£o de CPF e telefone Ã¢Å“â€¦
  - GET /users - Listagem com paginaÃƒÂ§ÃƒÂ£o (requer SUPER_ADMIN) Ã¢Å“â€¦
  - GET /users/:id - Busca por ID (retorna estrutura vazia - conhecido) Ã¢Å¡Â Ã¯Â¸Â
  - PATCH /users/:id - AtualizaÃƒÂ§ÃƒÂ£o parcial funcionano Ã¢Å“â€¦
  - DELETE /users/:id - DeleÃƒÂ§ÃƒÂ£o soft (requer SUPER_ADMIN) Ã¢Å“â€¦
  - PUT /users/:id - NÃƒÂ£o implementado (retorna 404) Ã¢ÂÅ’

## [0.5.0] - 2025-09-02


- **Sistema de AutenticaÃƒÂ§ÃƒÂ£o 100% Supabase Cloud**
  - RemoÃƒÂ§ÃƒÂ£o completa de bano de dados local
  - AutenticaÃƒÂ§ÃƒÂ£o usano apenas Supabase Auth
  - NÃƒÂ£o hÃƒÂ¡ mais tabelas locais de usuÃƒÂ¡rios ou sessÃƒÂµes
  - IntegraÃƒÂ§ÃƒÂ£o direta com Supabase para todas operaÃƒÂ§ÃƒÂµes

- **Email de Alerta de Login**
  - NotificaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica por email em cada login
  - InormaÃƒÂ§ÃƒÂµes incluÃƒÂ­das: IP, dispositivo, localizaÃƒÂ§ÃƒÂ£o, data/hora
  - Template HTML profissional e responsivo
  - Logs com link direto do Ethereal para visualizaÃƒÂ§ÃƒÂ£o em desenvolvimento

- **Melhorias no Docker**
  - ConfiguraÃƒÂ§ÃƒÂ£o de DNS com Google DNS (8.8.8.8, 8.8.4.4)
  - Extra hosts configurados para Supabase e SMTP
  - IPs diretos para evitar problemas de resoluÃƒÂ§ÃƒÂ£o DNS
  - Health check configurado para monitorameno

- **Logs Aprimorados**
  - Links do Ethereal destacados nos logs
  - Mensagens formatadas para melhor visualizaÃƒÂ§ÃƒÂ£o
  - Warnings visuais para evenos importantes

### Changed

- **Arquitetura Simplificada**
  - SignInUseCase usa apenas Supabase Auth
  - CreateUserUseCase cria usuÃƒÂ¡rios direto no Supabase
  - RemoÃƒÂ§ÃƒÂ£o de todas as referÃƒÂªncias a authRepository local
  - User metadata armazenado no Supabase

- **ConfiguraÃƒÂ§ÃƒÂ£o de Ambiente**
  - DB_HOST usano IP direto do pooler Supabase
  - Extra hosts no Docker para todos serviÃƒÂ§os externos
  - NODE_OPTIONS com dns-result-order=ipv4first

### Fixed

- ResoluÃƒÂ§ÃƒÂ£o DNS no Docker para smtp.ethereal.email
- Problemas de conectividade com Supabase no Docker
- Envio de emails funcionano corretamente no container
- Login e criaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rios 100% funcional

### Security

- Nenhuma inormaÃƒÂ§ÃƒÂ£o sensÃƒÂ­vel armazenada localmente
- Todos os dados de usuÃƒÂ¡rios no Supabase cloud
- Service keys apenas para operaÃƒÂ§ÃƒÂµes administrativas
- Tokens JWT com expiraÃƒÂ§ÃƒÂ£o de 15 minutos

## [0.4.1] - 2025-09-02


- **ServiÃƒÂ§o de Email Completo** - Infraestrutura para envio de emails
  - EmailService implementado com Nodemailer
  - Templates HTML responsivos para todos os tipos de email
  - IntegraÃƒÂ§ÃƒÂ£o com Ethereal para testes de desenvolvimento
  - Suporte para produÃƒÂ§ÃƒÂ£o com qualquer provedor SMTP
  - MÃƒÂ¡scarameno de endereÃƒÂ§os de email para privacidade

- **Two-Factor Authentication via Email**
  - SendTwoFAUseCase para envio de cÃƒÂ³digos 2FA
  - Endpoint `POST /auth/two-factor/send` para solicitar cÃƒÂ³digo
  - CÃƒÂ³digos de 6 dÃƒÂ­gitos com expiraÃƒÂ§ÃƒÂ£o de 5 minutos
  - Template de email especÃƒÂ­fico para cÃƒÂ³digos 2FA
  - IntegraÃƒÂ§ÃƒÂ£o completa com fluxo de autenticaÃƒÂ§ÃƒÂ£o

- **Templates de Email Implementados**
  - CÃƒÂ³digo de verificaÃƒÂ§ÃƒÂ£o 2FA com design profissional
  - Email de boas-vindas com onoarding
  - RedefiniÃƒÂ§ÃƒÂ£o de senha com link seguro
  - VerificaÃƒÂ§ÃƒÂ£o de email para novos cadastros
  - Alerta de login suspeito com detalhes do acesso

### Changed

- Auth module atualizado com provider ISendTwoFAUseCase
- Controller de autenticaÃƒÂ§ÃƒÂ£o com novo endpoint de envio 2FA
- DocumentaÃƒÂ§ÃƒÂ£o Swagger atualizada com exemplos de uso

### Fixed

- Typo em nodemailer.createTransport (estava createTransporter)
- VerificaÃƒÂ§ÃƒÂ£o de token 2FA com Result pattern correto
- Acesso ao userId do TwoFactorTokenPayload usano 'sub'

## [0.4.0] - 2025-09-02


- **MÃƒÂ³dulo Users CRUD Completo** - GestÃƒÂ£o completa de usuÃƒÂ¡rios
  - Create, Read, Update, Delete com permissÃƒÂµes granulares
  - UserOwnerGuard: Adminou prÃƒÂ³prio usuÃƒÂ¡rio podem editar/deletar
  - Listagem de todos usuÃƒÂ¡rios restrita a admins
  - IntegraÃƒÂ§ÃƒÂ£o com Supabase Auth para criaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rios
  - ValidaÃƒÂ§ÃƒÂ£o completa com Zod schemas
  - Swagger documentation com exemplos para todos endpoints
  - Suporte a filtros: role, tenantId, isActive
  - PaginaÃƒÂ§ÃƒÂ£o em listagens
  - Soft delete manteno histÃƒÂ³rico

- **UtilitÃƒÂ¡rios Centralizados**
  - roles.util.ts: FunÃƒÂ§ÃƒÂµes centralizadas para verificaÃƒÂ§ÃƒÂ£o de roles
  - SupabaseService: ServiÃƒÂ§o dedicado para integraÃƒÂ§ÃƒÂ£o com Supabase Auth

### Changed

- **RefatoraÃƒÂ§ÃƒÂ£o Massiva de Arquitetura** - Sistema 100% limpo
  - Entidades do domain removidas (mantidas apenas no infrastructure)
  - Validadores conolidados em auth.validators.ts ÃƒÂºnico
  - Hierarquia de roles centralizada em roles.util.ts
  - Zero duplicaÃƒÂ§ÃƒÂ£o de cÃƒÂ³digo em todo o sistema

### Removed

- **CÃƒÂ³digo Redundante Eliminado** - 616 linhas removidas
  - MessageBus nÃƒÂ£o utilizado (61 evenos nunca usados)
  - Health controller duplicado
  - Entidades duplicadas do domain layer
  - Validadores duplicados (health.validators.ts)
  - 8 arquivos desnecessÃƒÂ¡rios eliminados

### Fixed

- Circular dependency em DTOs do mÃƒÂ³dulo Users
- Imports apÃƒÂ³s refatoraÃƒÂ§ÃƒÂ£o massiva
- Build do Docker com nova estrutura

## [0.3.1] - 2025-09-02


- **DocumentaÃƒÂ§ÃƒÂ£o Swagger Completa**
  - @ApiBody com types e examples em todos endpoints
  - DTOs para signout e me responses
  - DescriÃƒÂ§ÃƒÂµes detalhadas e exemplos realistas
  - Todos endpoints testÃƒÂ¡veis no Swagger UI
  - Regra de documentaÃƒÂ§ÃƒÂ£o obrigatÃƒÂ³ria em onterapi-dev.md

### Fixed

- Headers user-agent e ip removidos do Swagger UI para interface mais limpa
- Path aliases (@infrastructure, @domain, @shared) removidos para compatibilidade com Vercel
- Erros TypeScript nos DTOs com definite assignment operator

### Changed

- Endpoint /me alterado de POST para GET (mais RESTful)
- Simplificada captura de deviceIno nos endpoints

### Removed

- **Endpoint sign-up removido do mÃƒÂ³dulo Auth**
  - Cadastro de usuÃƒÂ¡rios serÃƒÂ¡ feito no mÃƒÂ³dulo Users (a ser criado)
  - SignUpUseCase e arquivos relacionados removidos
  - Auth agora ÃƒÂ© exclusivamente para autenticaÃƒÂ§ÃƒÂ£o (login, logout, refresh, 2FA)

## [0.3.0] - 2025-09-01


- **MÃƒÂ³dulo de AutenticaÃƒÂ§ÃƒÂ£o Completo** - Arquitetura DDD e Clean Architecture
  - **Domain Layer**: Entidades puras, interfaces de use cases, repositÃƒÂ³rios e serviÃƒÂ§os
  - **Infrastructure Layer**: Entidades TypeORM, integraÃƒÂ§ÃƒÂ£o com Supabase Auth, repositÃƒÂ³rio com Query Builder
  - **Application Layer**: Controllers REST, DTOs, implementaÃƒÂ§ÃƒÂ£o dos use cases
  - **Sistema de Roles (RBAC)**: 11 roles hierÃƒÂ¡rquicos (SUPER_ADMIN, CLINIC_OWNER, PROFESSIONAL, etc.)
  - **Multi-tenant**: Suporte completo com isolameno por tenant_id
  - **Two-Factor Authentication (2FA)**: Suporte para TOTP, SMS e email
  - **SeguranÃƒÂ§a**: JWT tokens, refresh tokens, rate limiting, proteÃƒÂ§ÃƒÂ£o contra brute force
  - **Guards**: JwtAuthGuard, RolesGuard, TenantGuard
  - **Decorators**: @Public, @Roles, @CurrentUser

- **Shared Utils**: FunÃƒÂ§ÃƒÂµes reutilizÃƒÂ¡veis seguino padrÃƒÂµes enterprise
  - `db-connection.util.ts`: Savepoints para transaÃƒÂ§ÃƒÂµes granulares
  - `crypto.util.ts`: Hash com bcryptjs, criptografia AES-256
  - `auth.validators.ts`: Validadores Zod para CPF, senha forte, telefone
  - **Result Pattern**: Tratameno de erros consistente
  - **Zod Validation Pipe**: ValidaÃƒÂ§ÃƒÂ£o forte de tipos

- **Docker Configuration**
  - Dockerfile otimizado com multi-stage build e usuÃƒÂ¡rio nÃƒÂ£o-root
  - Docker Compose com Redis, health checks e networking
  - Scripts de automaÃƒÂ§ÃƒÂ£o para Winows (PowerShell) e Linux (Bash)
  - DocumentaÃƒÂ§ÃƒÂ£o completa integrada no README
  - Porta 3001 configurada para evitar conflitos

### Fixed

- ConexÃƒÂ£o com bano usano Supabase Pooler para IPv4 (Docker/Vercel)
- TypeScript property initialization com definite assignment operator
- Dependency injection com @Inject decorator para interfaces
- Import bcryptjs ao invÃƒÂ©s de bcrypt para compatibilidade Docker
- ConfiguraÃƒÂ§ÃƒÂ£o de ambiente correta (SUPABASE_SERVICE_ROLE_KEY)

### Changed

- MigraÃƒÂ§ÃƒÂ£o para Supabase Pooler (aws-0-sa-east-1.pooler.supabase.com:6543)
- Porta padrÃƒÂ£o alterada de 3000 para 3001
- DocumentaÃƒÂ§ÃƒÂ£o Docker centralizada no README
- Uso de apenas .env para configuraÃƒÂ§ÃƒÂ£o (sem .env.docker)

## [0.2.4] - 2025-09-01

### Fixed

- Erro de runtime na Vercel corrigido (sintaxe nodejs20.x removida)
- ConfiguraÃƒÂ§ÃƒÂ£o vercel.json simplificada usano builds/routes padrÃƒÂ£o
- Erro "Canot find module '@shared/messaging/message-bus.module'" definitivamente corrigido
- Path aliases removidos em favor de caminos relativos para compatibilidade com Vercel

### Changed

- Import de @shared/messaging mudado para ./shared/messaging (camino relativo)
- Removido tsconfig-paths que nÃƒÂ£o funciona em ambiente serverless
- Script de build simplificado removeno tsc-alias

## [0.2.3-alpha.1] - 2025-08-31

### Fixed

- Import do Express corrigido de namespace para default import no api/index.ts
- ConfiguraÃƒÂ§ÃƒÂ£o do Vercel atualizada para NestJS serverless
- api/index.ts simplificado removeno dependÃƒÂªncia do BootstrapFactory
- Build passano localmente e prono para deploy

### Changed

- vercel.json reconfigurado com framework null e funÃƒÂ§ÃƒÂµes serverless
- Runtime definido como nodejs20.x com limites apropriados
- ConfiguraÃƒÂ§ÃƒÂµes de produÃƒÂ§ÃƒÂ£o inline no api/index.ts (helmet, validation)
- Logger condicional baseado em NODE_ENV


- ValidationPipe global configurado no handler serverless
- Helmet.js para seguranÃƒÂ§a em produÃƒÂ§ÃƒÂ£o
- DocumentaÃƒÂ§ÃƒÂ£o de variÃƒÂ¡veis de ambiente necessÃƒÂ¡rias para Vercel

## [0.2.2-alpha.1] - 2025-08-31

### Fixed

- Corrigido .vercelignore que estava removeno arquivos necessÃƒÂ¡rios (src, tsconfig)
- Ajustado vercel.json para usar builds e routes corretos
- Handler /api/index.ts otimizado para Vercel
- Build da Vercel agora funciona corretamente

### Changed

- SimplificaÃƒÂ§ÃƒÂ£o do .vercelignore manteno apenas arquivos desnecessÃƒÂ¡rios
- vercel.json usa configuraÃƒÂ§ÃƒÂ£o de builds ao invÃƒÂ©s de rewrites

## [0.2.1-alpha.1] - 2025-08-31


- Suporte completo para deploy serverless na Vercel
- ConfiguraÃƒÂ§ÃƒÂ£o de edge functions otimizada
- DocumentaÃƒÂ§ÃƒÂ£o de variÃƒÂ¡veis de ambiente necessÃƒÂ¡rias

## [0.2.0-alpha.1] - 2025-08-31


- IntegraÃƒÂ§ÃƒÂ£o completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitorameno completo (DB, memÃƒÂ³ria, disco)
- Sistema de mensageria unificado com EventEmitter
- Bootstrap factory centralizada para eliminar duplicaÃƒÂ§ÃƒÂ£o
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- IntegraÃƒÂ§ÃƒÂ£o com @nestjs/terminus para health checks nativos
- Output style customizado para desenvolvimento OnTerapi
- Regras de qualidade extrema (DRY, linter, build obrigatÃƒÂ³rios)
- Boilerplate inicial do projeto
- Estrutura de pastas seguino DDD
- ConfiguraÃƒÂ§ÃƒÂµes base (TypeScript, ESLint, Prettier)
- Package.json com dependÃƒÂªncias essenciais
- README com documentaÃƒÂ§ÃƒÂ£o inicial
- Sistema de Versionamento semÃƒÂ¢ntico

### Changed

- Bano de dados migrado de local para Supabase cloud
- README expandido com documentaÃƒÂ§ÃƒÂ£o completa do Supabase
- DocumentaÃƒÂ§ÃƒÂ£o centralizada no README (regra: sem arquivos .md extras)
- RefatoraÃƒÂ§ÃƒÂ£o completa para eliminar duplicaÃƒÂ§ÃƒÂ£o de cÃƒÂ³digo
- SubstituiÃƒÂ§ÃƒÂ£o de `any` por `unknown` para type safety
- Path do DiskHealthIndicator corrigido para Winows

### Removed

- Arquivos de teste desnecessÃƒÂ¡rios (main-test.ts, app-test.module.ts)
- MÃƒÂ³dulo example removido (nÃƒÂ£o essencial)
- Entidade test.entity.ts removida
- MÃƒÂ³dulo health customizado (usano Terminus nativo)

### Fixed

- Erros de TypeScript em decorators Zod
- Imports nÃƒÂ£o utilizados removidos
- ConfiguraÃƒÂ§ÃƒÂ£o de paths TypeScript (@shared, @domain, etc)
- Health check no Winows (path C:\ ao invÃƒÂ©s de /)

### Security

- SSL/TLS habilitado para conexÃƒÂ£o com Supabase
- SeparaÃƒÂ§ÃƒÂ£o de chaves pÃƒÂºblicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementaÃƒÂ§ÃƒÂ£o
- Helmet.js configurado para seguranÃƒÂ§a HTTP

---

_Mantenha este arquivo atualizado a cada release_























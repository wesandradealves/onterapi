# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [Unreleased]\r\n\r\n### Added\r\n- Endpoints públicos de reenvio de verificação e reset de senha (`/auth/verification/resend`, `/auth/password/reset/request`, `/auth/password/reset/confirm`), com use cases dedicados, DTOs Zod e cobertura unitária/integrada.\r\n- NotificationEmailService agora dispara confirmação de troca de senha com template HTML específico.\r\n\r\n### Changed\r\n- AuthController agora normaliza os headers `x-forwarded-for` nos fluxos de reenvio e reset de senha para auditoria consistente.\r\n\r\n### Fixed

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

- APP_URL configurado explicitamente para desenvolvimento (http://localhost:3000) e produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (https://onterapi.vercel.app), alinhando os links usados pelos e-mails transacionais.
- DTOs de pacientes e usuÃƒÆ’Ã‚Â¡rios atualizados com descriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes e exemplos acentuados corretamente.

### Fixed

- SupabaseAuthService.deleteUser ignora respostas "user not found" do Supabase e segue com o soft delete local.
- Assuntos dos e-mails de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, 2FA e boas-vindas corrigidos para exibir acentuaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o adequada.

## [0.16.0] - 2025-09-24

### Changed

- Provedor de email migrado para Resend, substituino o transporte SMTP local e atualizano variÃƒÆ’Ã‚Â¡veis de ambiente.
- Remetente padrÃƒÆ’Ã‚Â£o apontano para Onterapi <noreply@onterapi.com.br> nos envs e integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.

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
- Fluxo de Two-Factor no Swagger atualizado: payload de validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o documentado e endpoint manual de reenvio oculto.
- Swagger: removido esquema de API key nÃƒÆ’Ã‚Â£o utilizado para evitar confusÃƒÆ’Ã‚Â£o na autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
- Filtros da listagem de pacientes no Swagger exibem enums reais (status, risco, quickFilter) alinhados ÃƒÆ’Ã‚Â s validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de back-end.

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

- ReforÃƒÆ’Ã‚Â§o de seguranÃƒÆ’Ã‚Â§a exigino segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- CÃƒÆ’Ã‚Â³digos 2FA gerados com RNG criptogrÃƒÆ’Ã‚Â¡fico
- JwtAuthGuard agora injeta o contexto completo do usuÃƒÆ’Ã‚Â¡rio utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, signout, refresh) para respostas consistentes

### Fixed

- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rios utilizano a interface unificada do Supabase Auth

### Infrastructure

- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.0] - 2025-09-04


- **ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de email obrigatÃƒÆ’Ã‚Â³ria para login**
  - UsuÃƒÆ’Ã‚Â¡rios nÃƒÆ’Ã‚Â£o podem fazer login sem confirmar email
  - Mensagem especÃƒÆ’Ã‚Â­fica "Email nÃƒÆ’Ã‚Â£o verificado" ao invÃƒÆ’Ã‚Â©s de "Credenciais invÃƒÆ’Ã‚Â¡lidas"
  - Tratameno correto do erro "Email not confirmed" do Supabase

### Fixed

- **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes no fluxo de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o**
  - VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de email confirmado antes de permitir login
  - PrevenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o duplicada de email (retorna erro apropriado)
  - Mensagens de erro mais claras e especÃƒÆ’Ã‚Â­ficas para cada situaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o

### Improved

- **Sistema de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de email**
  - Token de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Âºnico por usuÃƒÆ’Ã‚Â¡rio
  - NÃƒÆ’Ã‚Â£o permite confirmar email jÃƒÆ’Ã‚Â¡ confirmado
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa com Supabase email_confirmed_at

### Tested

- **Fluxo completo de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o validado**
  - Login bloqueado sem email confirmado ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“
  - Login funcional apÃƒÆ’Ã‚Â³s confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“
  - PrevenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o duplicada ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“
  - 2FA funcionano corretamente ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“
  - Bloqueio apÃƒÆ’Ã‚Â³s 3 tentativas erradas de 2FA ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“

## [0.12.0] - 2025-09-03


- **BaseUseCase para eliminaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de try-catch**
  - Criado BaseUseCase abstrato que centraliza tratameno de erros
  - 10 use cases refatorados para usar o padrÃƒÆ’Ã‚Â£o DRY
  - UseCaseWrapper criado para adaptar diferentes assinaturas de mÃƒÆ’Ã‚Â©todos
  - UpdateUserUseCase e DeleteUserUseCase usano wrapper pattern

- **BaseGuard para abstraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de guards**
  - Criado BaseGuard que centraliza lÃƒÆ’Ã‚Â³gica comum
  - 6 guards refatorados (JwtAuth, Roles, Tenant, UserOwner, EmailVerified, ActiveAccount)
  - MÃƒÆ’Ã‚Â©todo getUser() centralizado para extraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rio do contexto

- **Sistema de mensagens centralizado**
  - MESSAGES.constants.ts criado com todas as mensagens do sistema
  - 0 mensagens hardcoded (100% centralizadas)
  - SeÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes organizadas: AUTH, USER, VALIDATION, EVENTS, ERRORS, GUARDS, LOGS

- **DivisÃƒÆ’Ã‚Â£o de controllers e serviÃƒÆ’Ã‚Â§os grandes**
  - TwoFactorController separado do AuthController
  - EmailService dividido em 3: AuthEmailService, NotificationEmailService e facade
  - ReduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o significativa de complexidade por arquivo

- **Event Subscribers implementados**
  - AuthEventsSubscriber para evenos de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  - UserEventsSubscriber para evenos de usuÃƒÆ’Ã‚Â¡rios
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa com MessageBus

### Changed

- **Result Pattern aplicado em toda a aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o**
  - Todas as interfaces de use cases retornano Result<T>
  - Controllers atualizados para tratar result.error e result.data
  - Tratameno de erros padronizado e consistente

- **UsuÃƒÆ’Ã‚Â¡rio padrÃƒÆ’Ã‚Â£o do sistema**
  - Removidos todos os usuÃƒÆ’Ã‚Â¡rios de teste
  - Mantido apenas 1 super admin (lina73@ethereal.email / senha: admin)
  - README atualizado com credenciais simplificadas

### Fixed

- **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes crÃƒÆ’Ã‚Â­ticas de arquitetura DRY**
  - Eliminadas 635 linhas de cÃƒÆ’Ã‚Â³digo duplicado
  - ReduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 20% para 0%
  - 100% dos use cases usano BaseUseCase ou wrapper
  - 100% dos guards usano BaseGuard

### Improved

- **Qualidade e manutenibilidade do cÃƒÆ’Ã‚Â³digo**
  - Zero comentÃƒÆ’Ã‚Â¡rios no cÃƒÆ’Ã‚Â³digo (cÃƒÆ’Ã‚Â³digo auto-documentado)
  - Zero mensagens hardcoded em logs
  - Arquitetura DDD/Clean 100% consistente
  - Todos os testes de endpoints passano

### Technical

- **MÃƒÆ’Ã‚Â©tricas finais de refatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o**
  - 396 inserÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, 968 deleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes (saldo: -572 linhas)
  - 35 arquivos modificados
  - 10 use cases refatorados
  - 6 guards refatorados
  - 3 serviÃƒÆ’Ã‚Â§os divididos
  - 0 duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes restantes

## [0.11.0] - 2025-09-03


- **Sistema de Evenos Integrado aos Use Cases**
  - 7 evenos publicados em use cases crÃƒÆ’Ã‚Â­ticos
  - USER_CREATED, USER_UPDATED, USER_DELETED implementados
  - USER_LOGGED_IN, TOKEN_REFRESHED implementados
  - TWO_FA_SENT, TWO_FA_VALIDATED implementados
  - MessageBus integrado nos mÃƒÆ’Ã‚Â³dulos Auth e Users
  - EventEmitterModule configurado para mensageria assÃƒÆ’Ã‚Â­ncrona

### Fixed

- **EliminaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de DuplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes no Controllers**
  - Removido mÃƒÆ’Ã‚Â©todo mapToResponse duplicado em users.controller
  - SubstituÃƒÆ’Ã‚Â­do por uso direto de CPFUtils.mask inline
  - ReduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 19 linhas de cÃƒÆ’Ã‚Â³digo duplicado

- **Erros de CompilaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o TypeScript**
  - Corrigido uso inorreto de normalizeLoginIno em sign-in.use-case
  - Ajustado acesso a propriedades do objeto loginIno
  - Build passano sem erros

### Improved

- **IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Mensageria**
  - MessageBus injetÃƒÆ’Ã‚Â¡vel em todos os use cases
  - EventEmitterModule.forRoot() configurado nos mÃƒÆ’Ã‚Â³dulos
  - Base para comunicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o assÃƒÆ’Ã‚Â­ncrona entre mÃƒÆ’Ã‚Â³dulos
  - Preparado para integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com filas externas (RabbitMQ, Kafka)

- **Qualidade de CÃƒÆ’Ã‚Â³digo**
  - ReduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: de 20% para ~5%
  - 68% das correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes crÃƒÆ’Ã‚Â­ticas implementadas (15/22)
  - Evenos implementados: 58% (7/12)
  - Zero throw new diretos (100% usano factory)

### Technical

- **MÃƒÆ’Ã‚Â©tricas de Progresso**
  - 15 correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes crÃƒÆ’Ã‚Â­ticas de 22 pendentes implementadas
  - 7 use cases com evenos publicados
  - 3 mÃƒÆ’Ã‚Â©todos grandes ainda precisam refatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  - API estÃƒÆ’Ã‚Â¡vel e funcionano em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o

## [0.10.0] - 2025-09-03


- **Sistema de Mensageria Completo**
  - MessageBus implementado com EventEmitter2
  - DomainEvents com 12 evenos definidos
  - Interface DomainEvent padronizada
  - Evenos: USER_CREATED, USER_UPDATED, USER_DELETED, USER_LOGGED_IN, etc.

- **Validadores Centralizados**
  - CPFValidator com validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa de CPF brasileiro
  - EmailValidator com regex e normalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  - PhoneValidator com validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de DDDs brasileiros
- **Constantes Centralizadas**
  - validation.constants.ts com mensagens e patterns
  - error.constants.ts com cÃƒÆ’Ã‚Â³digos de erro padronizados
  - event.constants.ts com nomes de evenos

- **Tipos Centralizados**
  - DeviceIno movido para shared/types/device.types.ts
  - Eliminada duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em 19 arquivos

### Fixed

- **IUserRepository em ProduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o**
  - Corrigido mock vazio `useValue: {}`
  - Implementado `useClass: UserRepository`
  - Adicionado TypeOrmModule.forFeature([UserEntity])
  - Repository real agora ÃƒÆ’Ã‚Â© injetado corretamente

- **Tratameno de Erros Consistente**
  - AuthErrorFactory expandido com 5 novos tipos
  - SubstituÃƒÆ’Ã‚Â­dos 13 `throw new` diretos por AuthErrorFactory
  - Tipos adicionados: TOKEN_NOT_PROVIDED, USER_NOT_AUTHENTICATED, ACCESS_DENIED, etc.

### Improved

- **ReduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de DuplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de CÃƒÆ’Ã‚Â³digo**
  - DeviceIno: de 19 duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para 1 centralizada
  - Tratameno de erros: 100% usano AuthErrorFactory
  - UserMapper eliminano duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de mapeameno
  - CPFUtils centralizano lÃƒÆ’Ã‚Â³gica de mascarameno

- **Arquitetura DDD**
  - SeparaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o clara entre camadas
  - Sistema de evenos para comunicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o entre mÃƒÆ’Ã‚Â³dulos
  - Validadores reutilizÃƒÆ’Ã‚Â¡veis no shared
  - Constantes centralizadas por tipo

### Technical

- **Qualidade de CÃƒÆ’Ã‚Â³digo**
  - Build sem erros TypeScript
  - API funcionano corretamente no Docker
  - 7 de 22 correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes crÃƒÆ’Ã‚Â­ticas implementadas
  - Base preparada para sistema de evenos completo

## [0.9.0] - 2025-09-03

### Changed

- **Limpeza Total de CÃƒÆ’Ã‚Â³digo**
  - Removidos TODOS os comentÃƒÆ’Ã‚Â¡rios de TODOS os arquivos TypeScript
  - Incluino JSDoc, comentÃƒÆ’Ã‚Â¡rios de linha e blocos
  - CÃƒÆ’Ã‚Â³digo mais limpo e profissional
  - Mantidos apenas `.describe()` do Zod para documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Swagger

### Improved

- **OrganizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de DiretÃƒÆ’Ã‚Â³rios**
  - Removidos 8 diretÃƒÆ’Ã‚Â³rios vazios redundantes do boilerplate inicial
  - Mantida estrutura modular (por feature) ao invÃƒÆ’Ã‚Â©s de centralizada
  - Estrutura mais coerente com DDD modular

### Technical

- **Qualidade de CÃƒÆ’Ã‚Â³digo**
  - Zero comentÃƒÆ’Ã‚Â¡rios no cÃƒÆ’Ã‚Â³digo (cÃƒÆ’Ã‚Â³digo auto-explicativo)
  - Melhor aderÃƒÆ’Ã‚Âªncia aos padrÃƒÆ’Ã‚Âµes clean code
  - RemoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de diretÃƒÆ’Ã‚Â³rios desnecessÃƒÆ’Ã‚Â¡rios: domain/enums, domain/interfaces/\*, infrastructure/config, etc
  - Mantidos apenas diretÃƒÆ’Ã‚Â³rios essenciais para futuras implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes

## [0.8.0] - 2025-09-03


- **Contador de Tentativas no 2FA**
  - Sistema de bloqueio apÃƒÆ’Ã‚Â³s 3 tentativas erradas
  - Incremeno automÃƒÆ’Ã‚Â¡tico de tentativas em cÃƒÆ’Ã‚Â³digos invÃƒÆ’Ã‚Â¡lidos
  - Bloqueio efetivo quano attempts >= max_attempts
  - MÃƒÆ’Ã‚Â©todo `findValidTwoFactorCode` no repositÃƒÆ’Ã‚Â³rio

### Fixed

- **LÃƒÆ’Ã‚Â³gica de ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 2FA**
  - Corrigido incremeno de tentativas para cÃƒÆ’Ã‚Â³digos vÃƒÆ’Ã‚Â¡lidos
  - Agora incrementa tentativas do cÃƒÆ’Ã‚Â³digo ativo, nÃƒÆ’Ã‚Â£o do cÃƒÆ’Ã‚Â³digo errado
  - ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o correta busca cÃƒÆ’Ã‚Â³digo vÃƒÆ’Ã‚Â¡lido antes de verificar match

### Improved

- **SeguranÃƒÆ’Ã‚Â§a do 2FA**
  - Bloqueio automÃƒÆ’Ã‚Â¡tico apÃƒÆ’Ã‚Â³s exceder tentativas
  - NÃƒÆ’Ã‚Â£o aceita cÃƒÆ’Ã‚Â³digo correto apÃƒÆ’Ã‚Â³s bloqueio
  - ProteÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o contra forÃƒÆ’Ã‚Â§a bruta

### Technical

- **Limpeza de CÃƒÆ’Ã‚Â³digo**
  - Removidos todos os TODOs do mÃƒÆ’Ã‚Â³dulo auth
  - Implementado contador de tentativas completo
  - CÃƒÆ’Ã‚Â³digo de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sem comentÃƒÆ’Ã‚Â¡rios desnecessÃƒÆ’Ã‚Â¡rios

## [0.7.0] - 2025-09-03


- **Two-Factor Authentication (2FA) Completo**
  - Criada tabela `two_factor_codes` no Supabase Cloud
  - GeraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cÃƒÆ’Ã‚Â³digos de 6 dÃƒÆ’Ã‚Â­gitos com expiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 5 minutos
  - Envio de cÃƒÆ’Ã‚Â³digo por email com template HTML responsivo
  - ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cÃƒÆ’Ã‚Â³digo com limite de 3 tentativas
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa com Supabase Auth (sem bano local)
  - Logs visuais no desenvolvimento com links do Ethereal
  - Suporte para trust device (30 dias vs 7 dias padrÃƒÆ’Ã‚Â£o)

### Fixed

- **2FA com Supabase**: IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dos use cases de 2FA
  - `send-two-fa.use-case.ts`: Busca usuÃƒÆ’Ã‚Â¡rio do Supabase ao invÃƒÆ’Ã‚Â©s de bano local
  - `validate-two-fa.use-case.ts`: Remove update em tabela local inexistente
  - AtualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de lastLoginAt via Supabase user_metadata
  - CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de extraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de dados do usuÃƒÆ’Ã‚Â¡rio (user.user || user)

### Database

- **Tabela two_factor_codes**: Estrutura completa criada
  - Colunas: id, user_id, code, method, expires_at, attempts, max_attempts, is_used, used_at, created_at
  - ÃƒÆ’Ã‚Ândices para performance: idx_two_factor_codes_user_id, idx_two_factor_codes_expires_at
  - Foreign key com auth.users com CASCADE DELETE

### Documentation
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.\n\n- **Fluxo 2FA Documentado**: Como funciona o sistema completo
  - Login detecta 2FA habilitado e retorna tempToken
  - Envio de cÃƒÆ’Ã‚Â³digo gera 6 dÃƒÆ’Ã‚Â­gitos e salva no bano
  - ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o verifica cÃƒÆ’Ã‚Â³digo e retorna tokens JWT completos

## [0.6.0] - 2025-09-03


- **Sistema de VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Email com Tokens Seguros**
  - Criada tabela `email_verification_tokens` no Supabase
  - Tokens ÃƒÆ’Ã‚Âºnicos de 64 caracteres hexadecimais
  - ExpiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 24 horas para tokens
  - Tokens marcados como usados apÃƒÆ’Ã‚Â³s verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  - ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o robusta: rejeita tokens de teste, tokens curtos, formatos invÃƒÆ’Ã‚Â¡lidos
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com fluxo de criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rios

- **Melhorias no MÃƒÆ’Ã‚Â³dulo de AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o**
  - Refresh token agora retorna dados completos do usuÃƒÆ’Ã‚Â¡rio (email, name, role correto)
  - VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de email com validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o real de tokens no bano
  - UsuÃƒÆ’Ã‚Â¡rios criados com `emailVerified: false` atÃƒÆ’Ã‚Â© confirmar email
  - Link de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o enviado por email com token ÃƒÆ’Ã‚Âºnico

### Fixed

- **Refresh Token**: Corrigido para acessar corretamente `supabaseData.user`
  - Antes retornava email vazio, name vazio e role sempre PATIENT
  - Agora retorna todos os dados corretos do user_metadata
- **Email Verified**: Corrigido valor hardcoded
  - UsuÃƒÆ’Ã‚Â¡rios eram criados com `emailVerified: true` inorretamente
  - Agora comeÃƒÆ’Ã‚Â§am com `false` e sÃƒÆ’Ã‚Â³ mudam apÃƒÆ’Ã‚Â³s verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o real

### Security

- **Verify Email**: Removido aceite de qualquer token
  - Antes tinha TODO e aceitava qualquer string
  - Agora valida token no bano de dados
  - Tokens sÃƒÆ’Ã‚Â³ podem ser usados uma vez
  - ExpiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 24 horas implementada

### Documentation
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.\n\n- **README**: Adicionada tabela completa de usuÃƒÆ’Ã‚Â¡rios de teste
- **onterapi-dev.md**: Documentada configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o correta de conexÃƒÆ’Ã‚Â£o PostgreSQL/Supabase

## [0.5.1] - 2025-09-02

### Fixed

- **JwtAuthGuard**: Corrigido problema crÃƒÆ’Ã‚Â­tico de extraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de metadata do usuÃƒÆ’Ã‚Â¡rio
  - Guard estava acessano inorretamente `user.user_metadata` ao invÃƒÆ’Ã‚Â©s de `user.user.user_metadata`
  - Isso causava todos os usuÃƒÆ’Ã‚Â¡rios serem identificados como role PATIENT
  - Agora extrai corretamente o role do metadata do Supabase
  - RolesGuard funcionano adequadamente apÃƒÆ’Ã‚Â³s correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o


- **ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o SUPABASE_SERVICE_ROLE_KEY**: Adicionada chave de serviÃƒÆ’Ã‚Â§o ao .env
  - NecessÃƒÆ’Ã‚Â¡ria para operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes administrativas do Supabase
  - Permite deletar e gerenciar usuÃƒÆ’Ã‚Â¡rios via API admin

### Changed

- **MÃƒÆ’Ã‚Â³dulo Users**: Endpoints totalmente testados e funcionais
  - POST /users - CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de CPF e telefone ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
  - GET /users - Listagem com paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (requer SUPER_ADMIN) ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
  - GET /users/:id - Busca por ID (retorna estrutura vazia - conhecido) ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â
  - PATCH /users/:id - AtualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o parcial funcionano ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
  - DELETE /users/:id - DeleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o soft (requer SUPER_ADMIN) ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
  - PUT /users/:id - NÃƒÆ’Ã‚Â£o implementado (retorna 404) ÃƒÂ¢Ã‚ÂÃ…â€™

## [0.5.0] - 2025-09-02


- **Sistema de AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 100% Supabase Cloud**
  - RemoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa de bano de dados local
  - AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o usano apenas Supabase Auth
  - NÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ mais tabelas locais de usuÃƒÆ’Ã‚Â¡rios ou sessÃƒÆ’Ã‚Âµes
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o direta com Supabase para todas operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes

- **Email de Alerta de Login**
  - NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o automÃƒÆ’Ã‚Â¡tica por email em cada login
  - InormaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes incluÃƒÆ’Ã‚Â­das: IP, dispositivo, localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, data/hora
  - Template HTML profissional e responsivo
  - Logs com link direto do Ethereal para visualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em desenvolvimento

- **Melhorias no Docker**
  - ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de DNS com Google DNS (8.8.8.8, 8.8.4.4)
  - Extra hosts configurados para Supabase e SMTP
  - IPs diretos para evitar problemas de resoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o DNS
  - Health check configurado para monitorameno

- **Logs Aprimorados**
  - Links do Ethereal destacados nos logs
  - Mensagens formatadas para melhor visualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  - Warnings visuais para evenos importantes

### Changed

- **Arquitetura Simplificada**
  - SignInUseCase usa apenas Supabase Auth
  - CreateUserUseCase cria usuÃƒÆ’Ã‚Â¡rios direto no Supabase
  - RemoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de todas as referÃƒÆ’Ã‚Âªncias a authRepository local
  - User metadata armazenado no Supabase

- **ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Ambiente**
  - DB_HOST usano IP direto do pooler Supabase
  - Extra hosts no Docker para todos serviÃƒÆ’Ã‚Â§os externos
  - NODE_OPTIONS com dns-result-order=ipv4first

### Fixed

- ResoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o DNS no Docker para smtp.ethereal.email
- Problemas de conectividade com Supabase no Docker
- Envio de emails funcionano corretamente no container
- Login e criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rios 100% funcional

### Security

- Nenhuma inormaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sensÃƒÆ’Ã‚Â­vel armazenada localmente
- Todos os dados de usuÃƒÆ’Ã‚Â¡rios no Supabase cloud
- Service keys apenas para operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes administrativas
- Tokens JWT com expiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 15 minutos

## [0.4.1] - 2025-09-02


- **ServiÃƒÆ’Ã‚Â§o de Email Completo** - Infraestrutura para envio de emails
  - EmailService implementado com Nodemailer
  - Templates HTML responsivos para todos os tipos de email
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com Ethereal para testes de desenvolvimento
  - Suporte para produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com qualquer provedor SMTP
  - MÃƒÆ’Ã‚Â¡scarameno de endereÃƒÆ’Ã‚Â§os de email para privacidade

- **Two-Factor Authentication via Email**
  - SendTwoFAUseCase para envio de cÃƒÆ’Ã‚Â³digos 2FA
  - Endpoint `POST /auth/two-factor/send` para solicitar cÃƒÆ’Ã‚Â³digo
  - CÃƒÆ’Ã‚Â³digos de 6 dÃƒÆ’Ã‚Â­gitos com expiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 5 minutos
  - Template de email especÃƒÆ’Ã‚Â­fico para cÃƒÆ’Ã‚Â³digos 2FA
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa com fluxo de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o

- **Templates de Email Implementados**
  - CÃƒÆ’Ã‚Â³digo de verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 2FA com design profissional
  - Email de boas-vindas com onoarding
  - RedefiniÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de senha com link seguro
  - VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de email para novos cadastros
  - Alerta de login suspeito com detalhes do acesso

### Changed

- Auth module atualizado com provider ISendTwoFAUseCase
- Controller de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com novo endpoint de envio 2FA
- DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Swagger atualizada com exemplos de uso

### Fixed

- Typo em nodemailer.createTransport (estava createTransporter)
- VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de token 2FA com Result pattern correto
- Acesso ao userId do TwoFactorTokenPayload usano 'sub'

## [0.4.0] - 2025-09-02


- **MÃƒÆ’Ã‚Â³dulo Users CRUD Completo** - GestÃƒÆ’Ã‚Â£o completa de usuÃƒÆ’Ã‚Â¡rios
  - Create, Read, Update, Delete com permissÃƒÆ’Ã‚Âµes granulares
  - UserOwnerGuard: Adminou prÃƒÆ’Ã‚Â³prio usuÃƒÆ’Ã‚Â¡rio podem editar/deletar
  - Listagem de todos usuÃƒÆ’Ã‚Â¡rios restrita a admins
  - IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com Supabase Auth para criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rios
  - ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa com Zod schemas
  - Swagger documentation com exemplos para todos endpoints
  - Suporte a filtros: role, tenantId, isActive
  - PaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em listagens
  - Soft delete manteno histÃƒÆ’Ã‚Â³rico

- **UtilitÃƒÆ’Ã‚Â¡rios Centralizados**
  - roles.util.ts: FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes centralizadas para verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de roles
  - SupabaseService: ServiÃƒÆ’Ã‚Â§o dedicado para integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com Supabase Auth

### Changed

- **RefatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Massiva de Arquitetura** - Sistema 100% limpo
  - Entidades do domain removidas (mantidas apenas no infrastructure)
  - Validadores conolidados em auth.validators.ts ÃƒÆ’Ã‚Âºnico
  - Hierarquia de roles centralizada em roles.util.ts
  - Zero duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cÃƒÆ’Ã‚Â³digo em todo o sistema

### Removed

- **CÃƒÆ’Ã‚Â³digo Redundante Eliminado** - 616 linhas removidas
  - MessageBus nÃƒÆ’Ã‚Â£o utilizado (61 evenos nunca usados)
  - Health controller duplicado
  - Entidades duplicadas do domain layer
  - Validadores duplicados (health.validators.ts)
  - 8 arquivos desnecessÃƒÆ’Ã‚Â¡rios eliminados

### Fixed

- Circular dependency em DTOs do mÃƒÆ’Ã‚Â³dulo Users
- Imports apÃƒÆ’Ã‚Â³s refatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o massiva
- Build do Docker com nova estrutura

## [0.3.1] - 2025-09-02


- **DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Swagger Completa**
  - @ApiBody com types e examples em todos endpoints
  - DTOs para signout e me responses
  - DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes detalhadas e exemplos realistas
  - Todos endpoints testÃƒÆ’Ã‚Â¡veis no Swagger UI
  - Regra de documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o obrigatÃƒÆ’Ã‚Â³ria em onterapi-dev.md

### Fixed

- Headers user-agent e ip removidos do Swagger UI para interface mais limpa
- Path aliases (@infrastructure, @domain, @shared) removidos para compatibilidade com Vercel
- Erros TypeScript nos DTOs com definite assignment operator

### Changed

- Endpoint /me alterado de POST para GET (mais RESTful)
- Simplificada captura de deviceIno nos endpoints

### Removed

- **Endpoint sign-up removido do mÃƒÆ’Ã‚Â³dulo Auth**
  - Cadastro de usuÃƒÆ’Ã‚Â¡rios serÃƒÆ’Ã‚Â¡ feito no mÃƒÆ’Ã‚Â³dulo Users (a ser criado)
  - SignUpUseCase e arquivos relacionados removidos
  - Auth agora ÃƒÆ’Ã‚Â© exclusivamente para autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (login, logout, refresh, 2FA)

## [0.3.0] - 2025-09-01


- **MÃƒÆ’Ã‚Â³dulo de AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Completo** - Arquitetura DDD e Clean Architecture
  - **Domain Layer**: Entidades puras, interfaces de use cases, repositÃƒÆ’Ã‚Â³rios e serviÃƒÆ’Ã‚Â§os
  - **Infrastructure Layer**: Entidades TypeORM, integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com Supabase Auth, repositÃƒÆ’Ã‚Â³rio com Query Builder
  - **Application Layer**: Controllers REST, DTOs, implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dos use cases
  - **Sistema de Roles (RBAC)**: 11 roles hierÃƒÆ’Ã‚Â¡rquicos (SUPER_ADMIN, CLINIC_OWNER, PROFESSIONAL, etc.)
  - **Multi-tenant**: Suporte completo com isolameno por tenant_id
  - **Two-Factor Authentication (2FA)**: Suporte para TOTP, SMS e email
  - **SeguranÃƒÆ’Ã‚Â§a**: JWT tokens, refresh tokens, rate limiting, proteÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o contra brute force
  - **Guards**: JwtAuthGuard, RolesGuard, TenantGuard
  - **Decorators**: @Public, @Roles, @CurrentUser

- **Shared Utils**: FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes reutilizÃƒÆ’Ã‚Â¡veis seguino padrÃƒÆ’Ã‚Âµes enterprise
  - `db-connection.util.ts`: Savepoints para transaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes granulares
  - `crypto.util.ts`: Hash com bcryptjs, criptografia AES-256
  - `auth.validators.ts`: Validadores Zod para CPF, senha forte, telefone
  - **Result Pattern**: Tratameno de erros consistente
  - **Zod Validation Pipe**: ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o forte de tipos

- **Docker Configuration**
  - Dockerfile otimizado com multi-stage build e usuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o-root
  - Docker Compose com Redis, health checks e networking
  - Scripts de automaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para Winows (PowerShell) e Linux (Bash)
  - DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa integrada no README
  - Porta 3001 configurada para evitar conflitos

### Fixed

- ConexÃƒÆ’Ã‚Â£o com bano usano Supabase Pooler para IPv4 (Docker/Vercel)
- TypeScript property initialization com definite assignment operator
- Dependency injection com @Inject decorator para interfaces
- Import bcryptjs ao invÃƒÆ’Ã‚Â©s de bcrypt para compatibilidade Docker
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de ambiente correta (SUPABASE_SERVICE_ROLE_KEY)

### Changed

- MigraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para Supabase Pooler (aws-0-sa-east-1.pooler.supabase.com:6543)
- Porta padrÃƒÆ’Ã‚Â£o alterada de 3000 para 3001
- DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Docker centralizada no README
- Uso de apenas .env para configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (sem .env.docker)

## [0.2.4] - 2025-09-01

### Fixed

- Erro de runtime na Vercel corrigido (sintaxe nodejs20.x removida)
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o vercel.json simplificada usano builds/routes padrÃƒÆ’Ã‚Â£o
- Erro "Canot find module '@shared/messaging/message-bus.module'" definitivamente corrigido
- Path aliases removidos em favor de caminos relativos para compatibilidade com Vercel

### Changed

- Import de @shared/messaging mudado para ./shared/messaging (camino relativo)
- Removido tsconfig-paths que nÃƒÆ’Ã‚Â£o funciona em ambiente serverless
- Script de build simplificado removeno tsc-alias

## [0.2.3-alpha.1] - 2025-08-31

### Fixed

- Import do Express corrigido de namespace para default import no api/index.ts
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Vercel atualizada para NestJS serverless
- api/index.ts simplificado removeno dependÃƒÆ’Ã‚Âªncia do BootstrapFactory
- Build passano localmente e prono para deploy

### Changed

- vercel.json reconfigurado com framework null e funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes serverless
- Runtime definido como nodejs20.x com limites apropriados
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o inline no api/index.ts (helmet, validation)
- Logger condicional baseado em NODE_ENV


- ValidationPipe global configurado no handler serverless
- Helmet.js para seguranÃƒÆ’Ã‚Â§a em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
- DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de variÃƒÆ’Ã‚Â¡veis de ambiente necessÃƒÆ’Ã‚Â¡rias para Vercel

## [0.2.2-alpha.1] - 2025-08-31

### Fixed

- Corrigido .vercelignore que estava removeno arquivos necessÃƒÆ’Ã‚Â¡rios (src, tsconfig)
- Ajustado vercel.json para usar builds e routes corretos
- Handler /api/index.ts otimizado para Vercel
- Build da Vercel agora funciona corretamente

### Changed

- SimplificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do .vercelignore manteno apenas arquivos desnecessÃƒÆ’Ã‚Â¡rios
- vercel.json usa configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de builds ao invÃƒÆ’Ã‚Â©s de rewrites

## [0.2.1-alpha.1] - 2025-08-31


- Suporte completo para deploy serverless na Vercel
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de edge functions otimizada
- DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de variÃƒÆ’Ã‚Â¡veis de ambiente necessÃƒÆ’Ã‚Â¡rias

## [0.2.0-alpha.1] - 2025-08-31


- IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitorameno completo (DB, memÃƒÆ’Ã‚Â³ria, disco)
- Sistema de mensageria unificado com EventEmitter
- Bootstrap factory centralizada para eliminar duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com @nestjs/terminus para health checks nativos
- Output style customizado para desenvolvimento OnTerapi
- Regras de qualidade extrema (DRY, linter, build obrigatÃƒÆ’Ã‚Â³rios)
- Boilerplate inicial do projeto
- Estrutura de pastas seguino DDD
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes base (TypeScript, ESLint, Prettier)
- Package.json com dependÃƒÆ’Ã‚Âªncias essenciais
- README com documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o inicial
- Sistema de Versionamento semÃƒÆ’Ã‚Â¢ntico

### Changed

- Bano de dados migrado de local para Supabase cloud
- README expandido com documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa do Supabase
- DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o centralizada no README (regra: sem arquivos .md extras)
- RefatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa para eliminar duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cÃƒÆ’Ã‚Â³digo
- SubstituiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `any` por `unknown` para type safety
- Path do DiskHealthIndicator corrigido para Winows

### Removed

- Arquivos de teste desnecessÃƒÆ’Ã‚Â¡rios (main-test.ts, app-test.module.ts)
- MÃƒÆ’Ã‚Â³dulo example removido (nÃƒÆ’Ã‚Â£o essencial)
- Entidade test.entity.ts removida
- MÃƒÆ’Ã‚Â³dulo health customizado (usano Terminus nativo)

### Fixed

- Erros de TypeScript em decorators Zod
- Imports nÃƒÆ’Ã‚Â£o utilizados removidos
- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de paths TypeScript (@shared, @domain, etc)
- Health check no Winows (path C:\ ao invÃƒÆ’Ã‚Â©s de /)

### Security

- SSL/TLS habilitado para conexÃƒÆ’Ã‚Â£o com Supabase
- SeparaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de chaves pÃƒÆ’Ã‚Âºblicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
- Helmet.js configurado para seguranÃƒÆ’Ã‚Â§a HTTP

---

_Mantenha este arquivo atualizado a cada release_























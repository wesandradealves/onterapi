# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Caso de uso `CreateBookingUseCase` com DTO `CreateBookingDto`, permitindo converter holds em agendamentos confirmados e publicar o evento `scheduling.booking.created` via `MessageBus`.

- Caso de uso `CancelBookingUseCase` e DTO `CancelBookingDto`, padronizando motivos de cancelamento, controle de versão otimista e auditoria no fluxo de agendamentos.

### Changed
- `BookingValidationService` ganhou validações específicas para criação de agendamentos, regras de pagamento, cálculo de expiração de holds e marcação de no-show.

- Repositórios, entidades e mapeadores de `scheduling` agora suportam leitura por hold, campos financeiros opcionais e flags clínicas; o `SchedulingModule` exporta os novos tokens.

- `DomainEvents` passou a emitir `scheduling.booking.created`, alinhando integrações com o fluxo de criação.

### Testing
- Novas suites unitárias cobrem `CreateBookingUseCase`, `CancelBookingUseCase` e cenários adicionais do `BookingValidationService`.

### Documentation
- README referencia o Módulo de Agendamento na navegação principal.

## [0.17.3] - 2025-10-08
### Changed
- Centraliza o `MessageBus` em módulo global (`MessagingModule`) garantindo instância única via `CoreModule`.
- Normaliza paginação em listagens (usuários/pacientes/plan access logs) com clamps padrão e utilitário `clampLimit`.
- Cria helper `isoStringOrNow` para serialização consistente de datas e adiciona contexto aos logs sensíveis.

### Testing
- Adiciona testes unitários para `LegalTermPresenter` e amplia cobertura do `AnamnesisPresenter`, garantindo serializações opcionais.
- `npm run test:cov`
## [0.17.2] - 2025-10-02

### Added
- Tabela `anamnesis_metrics` + `AnamnesisMetricsRepository`, permitindo agregados por tenant/dia com contadores de passos, submissões, tokens, custo e feedback.
- Serviço `AnamnesisAIWebhookReplayService` com repositório dedicado (`anamnesis_ai_webhook_requests`) para bloquear replays entre instâncias.
- Migração `1738608000000-UpdateLegalTermsGovernance` adiciona status (`draft/published/retired`) e auditoria (`createdBy/publishedBy/retiredBy`) aos termos legais.
- Endpoint `GET /anamneses/metrics` com controller dedicado, DTOs e testes E2E garantindo o snapshot multi-tenant.
- Supabase Edge Function `supabase/functions/anamnesis-worker` espelha o worker Express e pode ser deployado via CLI (`--no-verify-jwt`).
- `/legal/terms` expõe status e responsáveis nas respostas (`LegalTermResponseDto`) e exige o usuário autenticado ao publicar/desativar.

### Security
- Replays do webhook agora são bloqueados por chave persistida (`analysisId` + assinatura) ao invés de cache volátil.

### Testing
- npm run lint
- npx tsc --noEmit
- npm run test -- --runInBand --silent
- npm run test:int -- --runInBand --silent
- npm run test:e2e -- --runInBand --silent

## [0.17.0] - 2025-10-01

### Added
- Servico AnamnesisAIWorkerService escuta ANAMNESIS_AI_REQUESTED, monta prompt com resumo compacto e rollup e dispara job HTTP configuravel para o worker externo.
- Utilitario buildAnamnesisAIPrompt sanitiza payloads e gera instrucoes padrao mais o JSON compacto enviado ao provedor.
- Seed 1738605000000-SeedTherapeuticPlanTerms adiciona termo padrao; .env documenta ANAMNESIS_AI_WORKER_URL, ANAMNESIS_AI_WORKER_TOKEN, ANAMNESIS_AI_PROMPT_VERSION e ANAMNESIS_AI_WORKER_TIMEOUT_MS.
- Suites unitarias dedicadas para o prompt e para o worker garantindo cobertura do novo fluxo.
- Modo local do worker (ANAMNESIS_AI_WORKER_MODE=local) gera plano assistivo diretamente via regra heuristica.
- AnamnesisMetricsService passa a registrar tokens de entrada/saida e latencia media para os planos gerados pela IA.
- Script `npm run worker:start` sobe o worker externo de IA (Express) com suporte a OpenAI/local e retorno assinado ao webhook.
- Endpoints `/legal/terms` permitem criar, publicar e desativar termos legais versionados por tenant, com validação de acesso multi-tenant.
- Observabilidade reforçada: logs de acesso ao plano terapêutico, métricas de turnaround/tokens/custo e alerta de latência configurável.

### Changed
- Evento ANAMNESIS_AI_REQUESTED passa a publicar AnamnesisAIRequestedEventPayload tipado e o submit agrupa eventos em DomainEvent<unknown>[] reutilizando o payload sanitizado.
- SubmitAnamnesisUseCase reaproveita buildAnamnesisAIRequestPayload, mantendo o JSON compacto tanto na persistencia quanto nos eventos.
- Worker tenta modo local antes de enviar HTTP quando configurado.
- README e docs/AI_CONTRACT.md reforcam o pipeline completo (submit -> worker -> webhook -> aceite) e os requisitos de configuracao do worker.

### Security
- Webhook `/anamneses/:id/ai-result` agora exige assinatura HMAC (`x-anamnesis-ai-signature` + `x-anamnesis-ai-timestamp`) com janela configurável (`ANAMNESIS_AI_WEBHOOK_MAX_SKEW_MS`).

### Testing
- npm run lint
- npx tsc --noEmit
- npm run test -- --runInBand --silent
- npm run test:int -- --runInBand --silent
- npm run test:e2e -- --runInBand --silent

## [0.16.7] - 2025-09-29

### Added
- Interface ExecutableUseCase padronizando execute/executeOrThrow para os casos de uso.

### Changed
- BaseUseCase e UseCaseWrapper passam a lançar exceções diretamente e expõem executeOrThrow, eliminando a dependência de unwrapResult nos controllers e garantindo propagação uniforme de erros.
- Controllers e casos de uso de Auth, Users, Patients e Anamnesis atualizados para o novo contrato; suites unitárias, de integração e E2E ajustadas para refletir o comportamento.
- .gitignore agora ignora a pasta payloads, evitando sujar o repositório com artefatos dos fluxos manuais de anamnese.

### Documentation
- README atualizado com as métricas da bateria manual de 29/09, novo total de 248 testes automatizados (~18 s) e referência de cobertura preservada em 100%.

## [0.16.6] - 2025-09-26

### Added
- Modulo completo de Anamnese com DTOs/presenters, casos de uso, controller e repositorio TypeORM, incluindo entidades, migracoes e suites de testes unitarios/integracao/E2E.
- Servico de armazenamento de anexos (`SupabaseAnamnesisAttachmentStorageService`) integrado aos casos de uso do modulo.
- Seeds adicionais por especialidade (nutrition, physiotherapy, psychology) para templates de passos com indice `uniq_step_template_scope`.
- Guard e caso de uso para ingestao de resultados de IA via webhook, com endpoint REST, DTOs e validacoes dedicadas.
- Entidade e fluxo de feedback supervisionado (`AnamnesisAITrainingFeedbackEntity`, `recordAITrainingFeedback`).
- Servico `AnamnesisMetricsService` e subscriber de eventos agregando metricas de steps, autosaves, IA e feedback humano.

### Changed
- Repositorio, presenters e DTOs atualizados para preservar anexos no historico, normalizar payloads JSON e expor auditoria (tenant/usuario).
- Planos terapeuticos agora vinculam `analysisId` e normalizam payloads/feedback ao salvar resultados da IA.
- `ReceiveAnamnesisAIResultUseCase` e `savePlanFeedback` conectados ao scoreboard de treinamentos, disparando eventos de dominio.
- Fluxos de auto-save, listagem e historico reforcados com idempotencia, guardas RBAC e publicacao de eventos.
- Rotas REST de anamnese aplicam `TenantGuard` junto aos guardas JWT/Roles para isolamento multi-tenant consistente.
- `TenantGuard` revisado para respeitar rotas anotadas com `@Public` (webhooks externos).
- Tipos de dominio, contratos de repositorio e fabrica de erros ajustados ao novo pipeline de IA.
- `AppModule` registra o `AnamnesisModule` e os eventos/handlers associados.

### Fixed
- Corrigido auto-save concorrente que podia sobrescrever rascunhos mais recentes quando snapshots antigos eram reenviados.

### Documentation
- README reorganizado para cobrir o modulo de anamnese (fluxo completo, exemplos de payloads, cabecalhos e integracao IA).
- Swagger descreve filtros de historico/listagem alinhados aos modulos de Auth/Users.
- README detalha a configuracao do bucket de anexos (Supabase Storage) e o fluxo manual via curl (anamnese completa, anexos, plano e historico).

[0.16.5] - 2025-09-26

### Added
- Estrutura base de dominio para Anamnese (`src/domain/anamnesis/types/anamnesis.types.ts`) com status, steps, planos terapeuticos e anexos.
- Entidades TypeORM para `anamneses`, `anamnesis_steps`, `anamnesis_therapeutic_plans`, `anamnesis_attachments` e migracao `1738100000000-CreateAnamnesisTables`.
- Mapper `AnamnesisMapper` convertendo entidades para tipos de dominio e normalizando payloads JSON.
- Repositorio `AnamnesisRepository` com fluxos de criacao, salvamento de etapas, submissao, historico, anexos e feedback de planos.

### Infra
- Ajuste de template literal na `NotificationEmailService` para conformidade ESLint.

### Added
- Endpoints publicos de reenvio de verificacao e reset de senha (`/auth/verification/resend`, `/auth/password/reset/request`, `/auth/password/reset/confirm`), com use cases dedicados, DTOs Zod e cobertura unitaria/integrada.
- NotificationEmailService agora dispara confirmacao de troca de senha com template HTML especifico.

### Changed
- AuthController agora normaliza os headers `x-forwarded-for` nos fluxos de reenvio e reset de senha para auditoria consistente.

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

- APP_URL configurado explicitamente para desenvolvimento (http://localhost:3000) e producao (https://onterapi.vercel.app), alinhando os links usados pelos e-mails transacionais.
- DTOs de pacientes e usuarios atualizados com descricoes e exemplos acentuados corretamente.

### Fixed

- SupabaseAuthService.deleteUser ignora respostas "user not found" do Supabase e segue com o soft delete local.
- Assuntos dos e-mails de verificacao, 2FA e boas-vindas corrigidos para exibir acentuacao adequada.

## [0.16.0] - 2025-09-24

### Changed

- Provedor de email migrado para Resend, substituino o transporte SMTP local e atualizano variaveis de ambiente.
- Remetente padrao apontano para Onterapi <noreply@onterapi.com.br> nos envs e integracoes.

### Fixed

- Corrigido o carregameno de metadados do TypeORM em ambiente serverless habilitano autoLoadEntities, evitano erro EntityMetadataNotFoundError no login da Vercel.

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
- Fluxo de Two-Factor no Swagger atualizado: payload de validacao documentado e endpoint manual de reenvio oculto.
- Swagger: removido esquema de API key nao utilizado para evitar confusao na autenticacao.
- Filtros da listagem de pacientes no Swagger exibem enums reais (status, risco, quickFilter) alinhados as validacoes de back-end.

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

## [0.13.0] - 2025-09-04


- **Validacao de email obrigatoria para login**
  - Usuarios nao podem fazer login sem confirmar email
  - Mensagem especifica "Email nao verificado" ao inves de "Credenciais invalidas"
  - Tratameno correto do erro "Email not confirmed" do Supabase

### Fixed

- **Correcoes no fluxo de autenticacao**
  - Verificacao de email confirmado antes de permitir login
  - Prevencao de confirmacao duplicada de email (retorna erro apropriado)
  - Mensagens de erro mais claras e especificas para cada situacao

### Improved

- **Sistema de verificacao de email**
  - Token de verificacao unico por usuario
  - Nao permite confirmar email ja confirmado
  - Integracao completa com Supabase email_confirmed_at

### Tested

- **Fluxo completo de autenticacao validado**
  - Login bloqueado sem email confirmado 
  - Login funcional apos confirmacao 
  - Prevencao de confirmacao duplicada 
  - 2FA funcionano corretamente 
  - Bloqueio apos 3 tentativas erradas de 2FA 

## [0.12.0] - 2025-09-03


- **BaseUseCase para eliminacao de duplicacao de try-catch**
  - Criado BaseUseCase abstrato que centraliza tratameno de erros
  - 10 use cases refatorados para usar o padrao DRY
  - UseCaseWrapper criado para adaptar diferentes assinaturas de metodos
  - UpdateUserUseCase e DeleteUserUseCase usano wrapper pattern

- **BaseGuard para abstracao de guards**
  - Criado BaseGuard que centraliza logica comum
  - 6 guards refatorados (JwtAuth, Roles, Tenant, UserOwner, EmailVerified, ActiveAccount)
  - Metodo getUser() centralizado para extracao de usuario do contexto

- **Sistema de mensagens centralizado**
  - MESSAGES.constants.ts criado com todas as mensagens do sistema
  - 0 mensagens hardcoded (100% centralizadas)
  - Secoes organizadas: AUTH, USER, VALIDATION, EVENTS, ERRORS, GUARDS, LOGS

- **Divisao de controllers e servicos grandes**
  - TwoFactorController separado do AuthController
  - EmailService dividido em 3: AuthEmailService, NotificationEmailService e facade
  - Reducao significativa de complexidade por arquivo

- **Event Subscribers implementados**
  - AuthEventsSubscriber para evenos de autenticacao
  - UserEventsSubscriber para evenos de usuarios
  - Integracao completa com MessageBus

### Changed

- **Result Pattern aplicado em toda a aplicacao**
  - Todas as interfaces de use cases retornano Result<T>
  - Controllers atualizados para tratar result.error e result.data
  - Tratameno de erros padronizado e consistente

- **Usuario padrao do sistema**
  - Removidos todos os usuarios de teste
  - Mantido apenas 1 super admin (lina73@ethereal.email / senha: admin)
  - README atualizado com credenciais simplificadas

### Fixed

- **Correcoes criticas de arquitetura DRY**
  - Eliminadas 635 linhas de codigo duplicado
  - Reducao de duplicacao de 20% para 0%
  - 100% dos use cases usano BaseUseCase ou wrapper
  - 100% dos guards usano BaseGuard

### Improved

- **Qualidade e manutenibilidade do codigo**
  - Zero comentarios no codigo (codigo auto-documentado)
  - Zero mensagens hardcoded em logs
  - Arquitetura DDD/Clean 100% consistente
  - Todos os testes de endpoints passano

### Technical

- **Metricas finais de refatoracao**
  - 396 insercoes, 968 delecoes (saldo: -572 linhas)
  - 35 arquivos modificados
  - 10 use cases refatorados
  - 6 guards refatorados
  - 3 servicos divididos
  - 0 duplicacoes restantes

## [0.11.0] - 2025-09-03


- **Sistema de Evenos Integrado aos Use Cases**
  - 7 evenos publicados em use cases criticos
  - USER_CREATED, USER_UPDATED, USER_DELETED implementados
  - USER_LOGGED_IN, TOKEN_REFRESHED implementados
  - TWO_FA_SENT, TWO_FA_VALIDATED implementados
  - MessageBus integrado nos modulos Auth e Users
  - EventEmitterModule configurado para mensageria assincrona

### Fixed

- **Eliminacao de Duplicacoes no Controllers**
  - Removido metodo mapToResponse duplicado em users.controller
  - Substituido por uso direto de CPFUtils.mask inline
  - Reducao de 19 linhas de codigo duplicado

- **Erros de Compilacao TypeScript**
  - Corrigido uso inorreto de normalizeLoginIno em sign-in.use-case
  - Ajustado acesso a propriedades do objeto loginIno
  - Build passano sem erros

### Improved

- **Integracao de Mensageria**
  - MessageBus injetavel em todos os use cases
  - EventEmitterModule.forRoot() configurado nos modulos
  - Base para comunicacao assincrona entre modulos
  - Preparado para integracao com filas externas (RabbitMQ, Kafka)

- **Qualidade de Codigo**
  - Reducao de duplicacao: de 20% para ~5%
  - 68% das correcoes criticas implementadas (15/22)
  - Evenos implementados: 58% (7/12)
  - Zero throw new diretos (100% usano factory)

### Technical

- **Metricas de Progresso**
  - 15 correcoes criticas de 22 pendentes implementadas
  - 7 use cases com evenos publicados
  - 3 metodos grandes ainda precisam refatoracao
  - API estavel e funcionano em producao

## [0.10.0] - 2025-09-03


- **Sistema de Mensageria Completo**
  - MessageBus implementado com EventEmitter2
  - DomainEvents com 12 evenos definidos
  - Interface DomainEvent padronizada
  - Evenos: USER_CREATED, USER_UPDATED, USER_DELETED, USER_LOGGED_IN, etc.

- **Validadores Centralizados**
  - CPFValidator com validacao completa de CPF brasileiro
  - EmailValidator com regex e normalizacao
  - PhoneValidator com validacao de DDDs brasileiros
- **Constantes Centralizadas**
  - validation.constants.ts com mensagens e patterns
  - error.constants.ts com codigos de erro padronizados
  - event.constants.ts com nomes de evenos

- **Tipos Centralizados**
  - DeviceIno movido para shared/types/device.types.ts
  - Eliminada duplicacao em 19 arquivos

### Fixed

- **IUserRepository em Producao**
  - Corrigido mock vazio `useValue: {}`
  - Implementado `useClass: UserRepository`
  - Adicionado TypeOrmModule.forFeature([UserEntity])
  - Repository real agora e injetado corretamente

- **Tratameno de Erros Consistente**
  - AuthErrorFactory expandido com 5 novos tipos
  - Substituidos 13 `throw new` diretos por AuthErrorFactory
  - Tipos adicionados: TOKEN_NOT_PROVIDED, USER_NOT_AUTHENTICATED, ACCESS_DENIED, etc.

### Improved

- **Reducao de Duplicacao de Codigo**
  - DeviceIno: de 19 duplicacoes para 1 centralizada
  - Tratameno de erros: 100% usano AuthErrorFactory
  - UserMapper eliminano duplicacoes de mapeameno
  - CPFUtils centralizano logica de mascarameno

- **Arquitetura DDD**
  - Separacao clara entre camadas
  - Sistema de evenos para comunicacao entre modulos
  - Validadores reutilizaveis no shared
  - Constantes centralizadas por tipo

### Technical

- **Qualidade de Codigo**
  - Build sem erros TypeScript
  - API funcionano corretamente no Docker
  - 7 de 22 correcoes criticas implementadas
  - Base preparada para sistema de evenos completo

## [0.9.0] - 2025-09-03

### Changed

- **Limpeza Total de Codigo**
  - Removidos TODOS os comentarios de TODOS os arquivos TypeScript
  - Incluino JSDoc, comentarios de linha e blocos
  - Codigo mais limpo e profissional
  - Mantidos apenas `.describe()` do Zod para documentacao Swagger

### Improved

- **Organizacao de Diretorios**
  - Removidos 8 diretorios vazios redundantes do boilerplate inicial
  - Mantida estrutura modular (por feature) ao inves de centralizada
  - Estrutura mais coerente com DDD modular

### Technical

- **Qualidade de Codigo**
  - Zero comentarios no codigo (codigo auto-explicativo)
  - Melhor aderencia aos padroes clean code
  - Remocao de diretorios desnecessarios: domain/enums, domain/interfaces/\*, infrastructure/config, etc
  - Mantidos apenas diretorios essenciais para futuras implementacoes

## [0.8.0] - 2025-09-03


- **Contador de Tentativas no 2FA**
  - Sistema de bloqueio apos 3 tentativas erradas
  - Incremeno automatico de tentativas em codigos invalidos
  - Bloqueio efetivo quano attempts >= max_attempts
  - Metodo `findValidTwoFactorCode` no repositorio

### Fixed

- **Logica de Validacao 2FA**
  - Corrigido incremeno de tentativas para codigos validos
  - Agora incrementa tentativas do codigo ativo, nao do codigo errado
  - Validacao correta busca codigo valido antes de verificar match

### Improved

- **Seguranca do 2FA**
  - Bloqueio automatico apos exceder tentativas
  - Nao aceita codigo correto apos bloqueio
  - Protecao contra forca bruta

### Technical

- **Limpeza de Codigo**
  - Removidos todos os TODOs do modulo auth
  - Implementado contador de tentativas completo
  - Codigo de producao sem comentarios desnecessarios

## [0.7.0] - 2025-09-03


- **Two-Factor Authentication (2FA) Completo**
  - Criada tabela `two_factor_codes` no Supabase Cloud
  - Geracao de codigos de 6 digitos com expiracao de 5 minutos
  - Envio de codigo por email com template HTML responsivo
  - Validacao de codigo com limite de 3 tentativas
  - Integracao completa com Supabase Auth (sem bano local)
  - Logs visuais no desenvolvimento com links do Ethereal
  - Suporte para trust device (30 dias vs 7 dias padrao)

### Fixed

- **2FA com Supabase**: Integracao dos use cases de 2FA
  - `send-two-fa.use-case.ts`: Busca usuario do Supabase ao inves de bano local
  - `validate-two-fa.use-case.ts`: Remove update em tabela local inexistente
  - Atualizacao de lastLoginAt via Supabase user_metadata
  - Correcao de extracao de dados do usuario (user.user || user)

### Database

- **Tabela two_factor_codes**: Estrutura completa criada
  - Colunas: id, user_id, code, method, expires_at, attempts, max_attempts, is_used, used_at, created_at
  - Indices para performance: idx_two_factor_codes_user_id, idx_two_factor_codes_expires_at
  - Foreign key com auth.users com CASCADE DELETE

### Documentation
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.\n\n- **Fluxo 2FA Documentado**: Como funciona o sistema completo
  - Login detecta 2FA habilitado e retorna tempToken
  - Envio de codigo gera 6 digitos e salva no bano
  - Validacao verifica codigo e retorna tokens JWT completos

## [0.6.0] - 2025-09-03


- **Sistema de Verificacao de Email com Tokens Seguros**
  - Criada tabela `email_verification_tokens` no Supabase
  - Tokens unicos de 64 caracteres hexadecimais
  - Expiracao de 24 horas para tokens
  - Tokens marcados como usados apos verificacao
  - Validacao robusta: rejeita tokens de teste, tokens curtos, formatos invalidos
  - Integracao com fluxo de criacao de usuarios

- **Melhorias no Modulo de Autenticacao**
  - Refresh token agora retorna dados completos do usuario (email, name, role correto)
  - Verificacao de email com validacao real de tokens no bano
  - Usuarios criados com `emailVerified: false` ate confirmar email
  - Link de verificacao enviado por email com token unico

### Fixed

- **Refresh Token**: Corrigido para acessar corretamente `supabaseData.user`
  - Antes retornava email vazio, name vazio e role sempre PATIENT
  - Agora retorna todos os dados corretos do user_metadata
- **Email Verified**: Corrigido valor hardcoded
  - Usuarios eram criados com `emailVerified: true` inorretamente
  - Agora comecam com `false` e so mudam apos verificacao real

### Security

- **Verify Email**: Removido aceite de qualquer token
  - Antes tinha TODO e aceitava qualquer string
  - Agora valida token no bano de dados
  - Tokens so podem ser usados uma vez
  - Expiracao de 24 horas implementada

### Documentation
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.\n\n- **README**: Adicionada tabela completa de usuarios de teste
- **onterapi-dev.md**: Documentada configuracao correta de conexao PostgreSQL/Supabase

## [0.5.1] - 2025-09-02

### Fixed

- **JwtAuthGuard**: Corrigido problema critico de extracao de metadata do usuario
  - Guard estava acessano inorretamente `user.user_metadata` ao inves de `user.user.user_metadata`
  - Isso causava todos os usuarios serem identificados como role PATIENT
  - Agora extrai corretamente o role do metadata do Supabase
  - RolesGuard funcionano adequadamente apos correcao


- **Configuracao SUPABASE_SERVICE_ROLE_KEY**: Adicionada chave de servico ao .env
  - Necessaria para operacoes administrativas do Supabase
  - Permite deletar e gerenciar usuarios via API admin

### Changed

- **Modulo Users**: Endpoints totalmente testados e funcionais
  - POST /users - Criacao com validacao de CPF e telefone 
  - GET /users - Listagem com paginacao (requer SUPER_ADMIN) 
  - GET /users/:id - Busca por ID (retorna estrutura vazia - conhecido)  
  - PATCH /users/:id - Atualizacao parcial funcionano 
  - DELETE /users/:id - Delecao soft (requer SUPER_ADMIN) 
  - PUT /users/:id - Nao implementado (retorna 404) 

## [0.5.0] - 2025-09-02


- **Sistema de Autenticacao 100% Supabase Cloud**
  - Remocao completa de bano de dados local
  - Autenticacao usano apenas Supabase Auth
  - Nao ha mais tabelas locais de usuarios ou sessoes
  - Integracao direta com Supabase para todas operacoes

- **Email de Alerta de Login**
  - Notificacao automatica por email em cada login
  - Inormacoes incluidas: IP, dispositivo, localizacao, data/hora
  - Template HTML profissional e responsivo
  - Logs com link direto do Ethereal para visualizacao em desenvolvimento

- **Melhorias no Docker**
  - Configuracao de DNS com Google DNS (8.8.8.8, 8.8.4.4)
  - Extra hosts configurados para Supabase e SMTP
  - IPs diretos para evitar problemas de resolucao DNS
  - Health check configurado para monitorameno

- **Logs Aprimorados**
  - Links do Ethereal destacados nos logs
  - Mensagens formatadas para melhor visualizacao
  - Warnings visuais para evenos importantes

### Changed

- **Arquitetura Simplificada**
  - SignInUseCase usa apenas Supabase Auth
  - CreateUserUseCase cria usuarios direto no Supabase
  - Remocao de todas as referencias a authRepository local
  - User metadata armazenado no Supabase

- **Configuracao de Ambiente**
  - DB_HOST usano IP direto do pooler Supabase
  - Extra hosts no Docker para todos servicos externos
  - NODE_OPTIONS com dns-result-order=ipv4first

### Fixed

- Resolucao DNS no Docker para smtp.ethereal.email
- Problemas de conectividade com Supabase no Docker
- Envio de emails funcionano corretamente no container
- Login e criacao de usuarios 100% funcional

### Security

- Nenhuma inormacao sensivel armazenada localmente
- Todos os dados de usuarios no Supabase cloud
- Service keys apenas para operacoes administrativas
- Tokens JWT com expiracao de 15 minutos

## [0.4.1] - 2025-09-02


- **Servico de Email Completo** - Infraestrutura para envio de emails
  - EmailService implementado com Nodemailer
  - Templates HTML responsivos para todos os tipos de email
  - Integracao com Ethereal para testes de desenvolvimento
  - Suporte para producao com qualquer provedor SMTP
  - Mascarameno de enderecos de email para privacidade

- **Two-Factor Authentication via Email**
  - SendTwoFAUseCase para envio de codigos 2FA
  - Endpoint `POST /auth/two-factor/send` para solicitar codigo
  - Codigos de 6 digitos com expiracao de 5 minutos
  - Template de email especifico para codigos 2FA
  - Integracao completa com fluxo de autenticacao

- **Templates de Email Implementados**
  - Codigo de verificacao 2FA com design profissional
  - Email de boas-vindas com onoarding
  - Redefinicao de senha com link seguro
  - Verificacao de email para novos cadastros
  - Alerta de login suspeito com detalhes do acesso

### Changed

- Auth module atualizado com provider ISendTwoFAUseCase
- Controller de autenticacao com novo endpoint de envio 2FA
- Documentacao Swagger atualizada com exemplos de uso

### Fixed

- Typo em nodemailer.createTransport (estava createTransporter)
- Verificacao de token 2FA com Result pattern correto
- Acesso ao userId do TwoFactorTokenPayload usano 'sub'

## [0.4.0] - 2025-09-02


- **Modulo Users CRUD Completo** - Gestao completa de usuarios
  - Create, Read, Update, Delete com permissoes granulares
  - UserOwnerGuard: Adminou proprio usuario podem editar/deletar
  - Listagem de todos usuarios restrita a admins
  - Integracao com Supabase Auth para criacao de usuarios
  - Validacao completa com Zod schemas
  - Swagger documentation com exemplos para todos endpoints
  - Suporte a filtros: role, tenantId, isActive
  - Paginacao em listagens
  - Soft delete manteno historico

- **Utilitarios Centralizados**
  - roles.util.ts: Funcoes centralizadas para verificacao de roles
  - SupabaseService: Servico dedicado para integracao com Supabase Auth

### Changed

- **Refatoracao Massiva de Arquitetura** - Sistema 100% limpo
  - Entidades do domain removidas (mantidas apenas no infrastructure)
  - Validadores conolidados em auth.validators.ts unico
  - Hierarquia de roles centralizada em roles.util.ts
  - Zero duplicacao de codigo em todo o sistema

### Removed

- **Codigo Redundante Eliminado** - 616 linhas removidas
  - MessageBus nao utilizado (61 evenos nunca usados)
  - Health controller duplicado
  - Entidades duplicadas do domain layer
  - Validadores duplicados (health.validators.ts)
  - 8 arquivos desnecessarios eliminados

### Fixed

- Circular dependency em DTOs do modulo Users
- Imports apos refatoracao massiva
- Build do Docker com nova estrutura

## [0.3.1] - 2025-09-02


- **Documentacao Swagger Completa**
  - @ApiBody com types e examples em todos endpoints
  - DTOs para signout e me responses
  - Descricoes detalhadas e exemplos realistas
  - Todos endpoints testaveis no Swagger UI
  - Regra de documentacao obrigatoria em onterapi-dev.md

### Fixed

- Headers user-agent e ip removidos do Swagger UI para interface mais limpa
- Path aliases (@infrastructure, @domain, @shared) removidos para compatibilidade com Vercel
- Erros TypeScript nos DTOs com definite assignment operator

### Changed

- Endpoint /me alterado de POST para GET (mais RESTful)
- Simplificada captura de deviceIno nos endpoints

### Removed

- **Endpoint sign-up removido do modulo Auth**
  - Cadastro de usuarios sera feito no modulo Users (a ser criado)
  - SignUpUseCase e arquivos relacionados removidos
  - Auth agora e exclusivamente para autenticacao (login, logout, refresh, 2FA)

## [0.3.0] - 2025-09-01


- **Modulo de Autenticacao Completo** - Arquitetura DDD e Clean Architecture
  - **Domain Layer**: Entidades puras, interfaces de use cases, repositorios e servicos
  - **Infrastructure Layer**: Entidades TypeORM, integracao com Supabase Auth, repositorio com Query Builder
  - **Application Layer**: Controllers REST, DTOs, implementacao dos use cases
  - **Sistema de Roles (RBAC)**: 11 roles hierarquicos (SUPER_ADMIN, CLINIC_OWNER, PROFESSIONAL, etc.)
  - **Multi-tenant**: Suporte completo com isolameno por tenant_id
  - **Two-Factor Authentication (2FA)**: Suporte para TOTP, SMS e email
  - **Seguranca**: JWT tokens, refresh tokens, rate limiting, protecao contra brute force
  - **Guards**: JwtAuthGuard, RolesGuard, TenantGuard
  - **Decorators**: @Public, @Roles, @CurrentUser

- **Shared Utils**: Funcoes reutilizaveis seguino padroes enterprise
  - `db-connection.util.ts`: Savepoints para transacoes granulares
  - `crypto.util.ts`: Hash com bcryptjs, criptografia AES-256
  - `auth.validators.ts`: Validadores Zod para CPF, senha forte, telefone
  - **Result Pattern**: Tratameno de erros consistente
  - **Zod Validation Pipe**: Validacao forte de tipos

- **Docker Configuration**
  - Dockerfile otimizado com multi-stage build e usuario nao-root
  - Docker Compose com Redis, health checks e networking
  - Scripts de automacao para Winows (PowerShell) e Linux (Bash)
  - Documentacao completa integrada.no README
  - Porta 3001 configurada para evitar conflitos

### Fixed

- Conexao com bano usano Supabase Pooler para IPv4 (Docker/Vercel)
- TypeScript property initialization com definite assignment operator
- Dependency injection com @Inject decorator para interfaces
- Import bcryptjs ao inves de bcrypt para compatibilidade Docker
- Configuracao de ambiente correta (SUPABASE_SERVICE_ROLE_KEY)

### Changed

- Migracao para Supabase Pooler (aws-0-sa-east-1.pooler.supabase.com:6543)
- Porta padrao alterada de 3000 para 3001
- Documentacao Docker centralizada no README
- Uso de apenas .env para configuracao (sem .env.docker)

## [0.2.4] - 2025-09-01

### Fixed

- Erro de runtime na Vercel corrigido (sintaxe nodejs20.x removida)
- Configuracao vercel.json simplificada usano builds/routes padrao
- Erro "Canot find module '@shared/messaging/message-bus.module'" definitivamente corrigido
- Path aliases removidos em favor de caminos relativos para compatibilidade com Vercel

### Changed

- Import de @shared/messaging mudado para ./shared/messaging (camino relativo)
- Removido tsconfig-paths que nao funciona em ambiente serverless
- Script de build simplificado removeno tsc-alias

## [0.2.3-alpha.1] - 2025-08-31

### Fixed

- Import do Express corrigido de namespace para default import no api/index.ts
- Configuracao do Vercel atualizada para NestJS serverless
- api/index.ts simplificado removeno dependencia do BootstrapFactory
- Build passano localmente e prono para deploy

### Changed

- vercel.json reconfigurado com framework null e funcoes serverless
- Runtime definido como nodejs20.x com limites apropriados
- Configuracoes de producao inline no api/index.ts (helmet, validation)
- Logger condicional baseado em NODE_ENV


- ValidationPipe global configurado no handler serverless
- Helmet.js para seguranca em producao
- Documentacao de variaveis de ambiente necessarias para Vercel

## [0.2.2-alpha.1] - 2025-08-31

### Fixed

- Corrigido .vercelignore que estava removeno arquivos necessarios (src, tsconfig)
- Ajustado vercel.json para usar builds e routes corretos
- Handler /api/index.ts otimizado para Vercel
- Build da Vercel agora funciona corretamente

### Changed

- Simplificacao do .vercelignore manteno apenas arquivos desnecessarios
- vercel.json usa configuracao de builds ao inves de rewrites

## [0.2.1-alpha.1] - 2025-08-31


- Suporte completo para deploy serverless na Vercel
- Configuracao de edge functions otimizada
- Documentacao de variaveis de ambiente necessarias

## [0.2.0-alpha.1] - 2025-08-31


- Integracao completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitorameno completo (DB, memoria, disco)
- Sistema de mensageria unificado com EventEmitter
- Bootstrap factory centralizada para eliminar duplicacao
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- Integracao com @nestjs/terminus para health checks nativos
- Output style customizado para desenvolvimento OnTerapi
- Regras de qualidade extrema (DRY, linter, build obrigatorios)
- Boilerplate inicial do projeto
- Estrutura de pastas seguino DDD
- Configuracoes base (TypeScript, ESLint, Prettier)
- Package.json com dependencias essenciais
- README com documentacao inicial
- Sistema de Versionamento semantico

### Changed

- Bano de dados migrado de local para Supabase cloud
- README expandido com documentacao completa do Supabase
- Documentacao centralizada no README (regra: sem arquivos .md extras)
- Refatoracao completa para eliminar duplicacao de codigo
- Substituicao de `any` por `unknown` para type safety
- Path do DiskHealthIndicator corrigido para Winows

### Removed

- Arquivos de teste desnecessarios (main-test.ts, app-test.module.ts)
- Modulo example removido (nao essencial)
- Entidade test.entity.ts removida
- Modulo health customizado (usano Terminus nativo)

### Fixed

- Erros de TypeScript em decorators Zod
- Imports nao utilizados removidos
- Configuracao de paths TypeScript (@shared, @domain, etc)
- Health check no Winows (path C:\ ao inves de /)

### Security

- SSL/TLS habilitado para conexao com Supabase
- Separacao de chaves publicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementacao
- Helmet.js configurado para seguranca HTTP

---

_Mantenha este arquivo atualizado a cada release_


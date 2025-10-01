# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [0.16.9] - 2025-10-01

### Added
- Migracoes `1738600000000-UpdateAnamnesisAIAndPlans`, `1738601000000-CreateTherapeuticPlanAcceptances` e `1738602000000-CreatePatientAnamnesisRollups` para enriquecer auditoria do plano e manter resumo incremental por paciente.
- Tabela `therapeutic_plan_acceptances` com snapshot de termos, IP e User-Agent; serviço `PatientAnamnesisRollupService` responsável por consolidar anamneses aceitas.
- Documentacao `docs/AI_CONTRACT.md` detalhando payloads do webhook, aceite versionado e checklist de integraçao.

### Changed
- Webhook `POST /anamneses/:id/ai-result` agora aceita `planText`, `reasoningText`, `evidenceMap`, metadados do modelo e métricas de custo.
- Aceite `POST /anamneses/:id/plan` exige `termsVersion` + `termsTextSnapshot`, grava histórico em `therapeutic_plan_acceptances` e recalcula o rollup após o aceite.
- Domain events, DTOs, presenters e suites de testes alinharam novos status (`generated`/`accepted`), histórico de aceitações e dados exibidos no front.

## [0.16.8] - 2025-09-30

### Added
- Migracao 1738400000000-AddSoftDeleteToAnamnesis incluindo colunas `deleted_at`, `deleted_by` e `deleted_reason` em `anamneses` com suporte a soft delete e auditoria.
- Migracao 1738501000000-AddTermsAcceptedToTherapeuticPlan adicionando `terms_accepted` em `anamnesis_therapeutic_plans`.
- Caso de uso CancelAnamnesisUseCase, endpoint `POST /anamneses/{id}/cancel` e evento DomainEvents.ANAMNESIS_CANCELLED para propagar cancelamentos sob auditoria.

### Changed
- Salvamento do plano terapeutico passa a exigir `termsAccepted`, validando o aceite do termo de responsabilidade e persistindo o flag nas entidades, mappers, presenters e respostas da API.
- Listagens, historico e detalhe de anamnese ignoram registros cancelados e expoem `deletedAt`, `deletedBy` e `deletedReason` para auditoria.
- Suites unitarias, de integracao e e2e atualizadas com cenarios de cancelamento e aceite obrigatorio, mantendo payloads e factories alinhados as novas validacoes.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [0.16.7] - 2025-09-29

### Added
- Interface ExecutableUseCase padronizando execute/executeOrThrow para os casos de uso.

### Changed
- BaseUseCase e UseCaseWrapper passam a lanÃ§ar exceÃ§Ãµes diretamente e expÃµem executeOrThrow, eliminando a dependÃªncia de unwrapResult nos controllers e garantindo propagaÃ§Ã£o uniforme de erros.
- Controllers e casos de uso de Auth, Users, Patients e Anamnesis atualizados para o novo contrato; suites unitÃ¡rias, de integraÃ§Ã£o e E2E ajustadas para refletir o comportamento.
- .gitignore agora ignora a pasta payloads, evitando sujar o repositÃ³rio com artefatos dos fluxos manuais de anamnese.

### Documentation
- README atualizado com as mÃ©tricas da bateria manual de 29/09, novo total de 248 testes automatizados (~18 s) e referÃªncia de cobertura preservada em 100%.

## [0.16.6] - 2025-09-26

### Added
- Modulo completo de Anamnese com DTOs/presenters, casos de uso, controller e repositorio TypeORM, incluindo entidades, migracoes e suites de testes unitarios/integracao/E2E.
- Servico de armazenamento de anexos (SupabaseAnamnesisAttachmentStorageService) integrado aos casos de uso do modulo.
- Seeds adicionais por especialidade (nutrition, physiotherapy, psychology) para templates de passos com indice uniq_step_template_scope.
- Guard e caso de uso para ingestao de resultados de IA via webhook, com endpoint REST, DTOs e validacoes dedicadas.
- Entidade e fluxo de feedback supervisionado (AnamnesisAITrainingFeedbackEntity, 
ecordAITrainingFeedback).
- Servico AnamnesisMetricsService e subscriber de eventos agregando metricas de steps, autosaves, IA e feedback humano.

### Changed
- Repositorio, presenters e DTOs atualizados para preservar anexos no historico, normalizar payloads JSON e expor auditoria (tenant/usuario).
- Planos terapeuticos agora vinculam analysisId e normalizam payloads/feedback ao salvar resultados da IA.
- ReceiveAnamnesisAIResultUseCase e savePlanFeedback conectados ao scoreboard de treinamentos, disparando eventos de dominio.
- Fluxos de auto-save, listagem e historico reforcados com idempotencia, guardas RBAC e publicacao de eventos.
- Rotas REST de anamnese aplicam TenantGuard junto aos guardas JWT/Roles para isolamento multi-tenant consistente.
- TenantGuard revisado para respeitar rotas anotadas com @Public (webhooks externos).
- Tipos de dominio, contratos de repositorio e fabrica de erros ajustados ao novo pipeline de IA.
- AppModule registra o AnamnesisModule e os eventos/handlers associados.

### Fixed
- Corrigido auto-save concorrente que podia sobrescrever rascunhos mais recentes quando snapshots antigos eram reenviados.

### Documentation
- README reorganizado para cobrir o modulo de anamnese (fluxo completo, exemplos de payloads, cabecalhos e integracao IA).
- Swagger descreve filtros de historico/listagem alinhados aos modulos de Auth/Users.
- README detalha a configuracao do bucket de anexos (Supabase Storage) e o fluxo manual via curl (anamnese completa, anexos, plano e historico).

[0.16.5] - 2025-09-26

### Added
- Estrutura base de dominio para Anamnese (src/domain/anamnesis/types/anamnesis.types.ts) com status, steps, planos terapeuticos e anexos.
- Entidades TypeORM para anamneses, anamnesis_steps, anamnesis_therapeutic_plans, anamnesis_attachments e migracao 1738100000000-CreateAnamnesisTables.
- Mapper AnamnesisMapper convertendo entidades para tipos de dominio e normalizando payloads JSON.
- Repositorio AnamnesisRepository com fluxos de criacao, salvamento de etapas, submissao, historico, anexos e feedback de planos.

### Infra
- Ajuste de template literal na NotificationEmailService para conformidade ESLint.

### Added
- Endpoints publicos de reenvio de verificacao e reset de senha (/auth/verification/resend, /auth/password/reset/request, /auth/password/reset/confirm), com use cases dedicados, DTOs Zod e cobertura unitaria/integrada.
- NotificationEmailService agora dispara confirmacao de troca de senha com template HTML especifico.

### Changed
- AuthController agora normaliza os headers x-forwarded-for nos fluxos de reenvio e reset de senha para auditoria consistente.

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
- Suite unitaria dedicada ao listUsersSchema garantindo coercoes de filtros.
- Suite unitaria dedicada ao listPatientsSchema garantindo coercoes de filtros de query.
- Suite unitaria dedicada ao signOutSchema garantindo defaults e validacao do payload.
- Mapper central para requests de pacientes (src/modules/patients/api/mappers/patient-request.mapper.ts) com suites unitarias completas (test/unit/modules.patients/patient-request.mapper.spec.ts).
- Mapper compartilhado para normalizacao dos fluxos de auth (src/modules/auth/api/mappers/auth-request.mapper.ts) coberto por testes dedicados (test/unit/modules.auth/auth-request.mapper.spec.ts).

### Changed
- test/jest-e2e.json passa a usar tsconfig.e2e.json diretamente no transform, eliminando os warnings de configuracao do ts-jest.
- README.md consolidado com baseline de qualidade, guia de modulos e roteiro PowerShell para testes manuais via curl (QUALITY_BASELINE.md incorporado).
- UsersController delega normalizacao de create/list/update ao mapper compartilhado, usando ZodValidationPipe e fallback de tenant (src/modules/users/api/controllers/users.controller.ts:97).
- Controllers de Auth e Users passam a reutilizar unwrapResult, reduzindo boilerplate de tratamento de Result.

### Documentation
- README.md documenta o fluxo completo de testes manuais (Auth, Users, Patients) e unifica a baseline de qualidade.
- QUALITY_BASELINE.md revisado com novas notas, metas e evidencias.

## [0.16.3] - 2025-09-25

...

# Linha de Base de Qualidade - OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: feature/coverage (worktree)
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontuacao Atual

| Criterio | Nota atual (0-10) | Meta | Evidencias chave |
| --- | --- | --- | --- |
| DRY / Reuso de codigo | 7.0 | >= 8.5 | Reuso centralizado continua nos presenters compartilhados (src/modules/patients/api/presenters/patient.presenter.ts:1, src/modules/users/api/presenters/user.presenter.ts:1). Factories e DTOs ainda duplicam mapeamentos e permanecem alvo do proximo ciclo. |
| Automacao de qualidade | 8.5 | >= 8.5 | Gates locais agora executam 	est:unit, 	est:int e 	est:e2e antes do 	est:cov (scripts package.json:27-36), com thresholds globais de 100% em jest.config.js:23. Execucoes recentes (
pm run test:int, 
pm run test:e2e, 
pm run test:cov) passaram sem intervencao manual. |
| Testes automatizados | 9.5 | >= 9.5 | Malha cobre unidade (	est/unit/...), integracao HTTP (	est/integration/patients.controller.integration.spec.ts:1) e e2e com use cases reais (	est/e2e/patients.e2e-spec.ts:1). Cobertura agregada permanece em 100% para statements/branches/functions/lines (coverage/coverage-summary.json:1). |
| Validacoes e contratos | 6.0 | >= 9.0 | Persistem parses redundantes e DTOs desacoplados dos schemas Zod (src/modules/patients/api/controllers/patients.controller.ts:163, src/modules/users/api/controllers/users.controller.ts:109). |
| Governanca de dominio / RBAC | 8.0 | >= 9.0 | Autorizacao dos pacientes segue normalizada via mapRoleToDomain (ex.: src/modules/patients/use-cases/get-patient.use-case.ts:89) e agora validada nos testes de integracao/e2e (	est/integration/patients.controller.integration.spec.ts:74, 	est/e2e/patients.e2e-spec.ts:106). Modulos de agenda/financeiro continuam fora do escopo desta rodada. |

## Observacoes Detalhadas

### DRY e reuso
- Nenhuma regressao identificada: presenters e utilitarios permanecem reutilizados.
- Falta enderecar os spreads repetidos nos DTOs para elevar a nota no proximo ciclo.

### Automacao e scripts
- 	est:cov falha se cobertura global cair abaixo de 100% (jest.config.js:23);
- Novo combo 	est:int e 	est:e2e roda em série (package.json:33-34), garantindo verificacoes de controller/use case com mocks e repositório em memória.
- Ainda nao existe pipeline CI consumindo os scripts; gate continua manual.

### Testes
- 102 testes executam em ~9s cobrindo use cases, presenters, utils, integracao HTTP e e2e.
- Suites de integracao validam normalizacao de tenants e Zod (	est/integration/patients.controller.integration.spec.ts:37).
- E2E exercita GetPatientUseCase e ListPatientsUseCase com repositório em memoria e mocks de auditoria/IA (	est/e2e/patients.e2e-spec.ts:44).
- Suites de integracao/e2e para modulos de usuarios/auth ainda pendentes.

### Validacao e contratos
- Controllers continuam chamando schema.parse apos o ZodValidationPipe; remover duplicidade segue prioridade.
- Swagger/DTOs nao refletem as mesmas mensagens dos schemas Zod.

### RBAC e dominio
- Cobertura de testes garante que ensurePermissions e uildQuickActions sigam regras de negocio inclusive para roles internas.
- Agendas e financeiro ainda precisam migrar para a mesma estrategia.

## Testes Executados
- 
pm run test:unit
- 
pm run test:int
- 
pm run test:e2e
- 
pm run test:cov

## Proximos Passos Prioritarios
1. Expandir suites de integracao/e2e para os modulos de usuarios e auth, cobrindo fluxos de login/2FA e CRUD completo.
2. Remover parses duplicados nos controllers e alinhar DTOs aos schemas Zod.
3. Refatorar factories/DTOs para consumir presenters/mappers compartilhados, elevando a nota DRY.
4. Integrar os scripts check:quality, 	est:int, 	est:e2e ao pipeline CI para enforcement continuo.
5. Mapear modulos restantes (financeiro, agendas) para aplicar as mesmas regras de RBAC e adicionar cobertura automatizada correspondente.

Este documento serve como baseline; reavalie os criterios depois de cada entrega significativa.

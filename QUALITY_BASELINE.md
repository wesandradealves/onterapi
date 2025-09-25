# Linha de Base de Qualidade - OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: feature/coverage (worktree)
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontuacao Atual

| Criterio | Nota atual (0-10) | Meta | Evidencias chave |
| --- | --- | --- | --- |
| DRY / Reuso de codigo | 7.0 | >= 8.5 | Reuso centralizado continua nos presenters compartilhados (src/modules/patients/api/presenters/patient.presenter.ts:1, src/modules/users/api/presenters/user.presenter.ts:1). Factories e DTOs ainda duplicam mapeamentos e permanecem alvo do proximo ciclo. |
| Automacao de qualidade | 7.5 | >= 8.5 | Limiares globais de cobertura elevados para 100% em jest.config.js:23; scripts 	est:cov, check:quality e check:dry garantem gate local (package.json:27). Relatorio coverage/coverage-summary.json:1 confirma aderencia. |
| Testes automatizados | 9.0 | >= 9.5 | Suites unitarias agora cobrem todos os casos de uso de pacientes e utilitarios chaves (	est/unit/modules.patients/get-patient.use-case.spec.ts:1, 	est/unit/modules.patients/update-patient.use-case.spec.ts:1, 	est/unit/shared.use-case-wrapper.spec.ts:1). Cobertura agregada bateu 100% para statements/branches/functions/lines (coverage/coverage-summary.json:1). |
| Validacoes e contratos | 6.0 | >= 9.0 | Persistem parses redundantes e DTOs desacoplados dos schemas Zod (src/modules/patients/api/controllers/patients.controller.ts:120, src/modules/users/api/controllers/users.controller.ts:109). |
| Governanca de dominio / RBAC | 8.0 | >= 9.0 | Autorizacao dos pacientes segue normalizada via mapRoleToDomain (ex.: src/modules/patients/use-cases/get-patient.use-case.ts:89) e agora validada pelos testes (	est/unit/modules.auth/roles.guard.spec.ts:1, 	est/unit/modules.patients/get-patient.use-case.spec.ts:1). Modulos de agenda/financeiro continuam fora do escopo desta rodada. |

## Observacoes Detalhadas

### DRY e reuso
- Nenhuma regressao identificada: presenters e utilitarios permanecem reutilizados.
- Falta enderecar os spreads repetidos nos DTOs para elevar a nota no proximo ciclo.

### Automacao e scripts
- 	est:cov e check:quality agora falham se cobertura global cair abaixo de 100% (jest.config.js:23).
- Ainda nao existe pipeline CI consumindo os scripts; gate continua manual.

### Testes
- 98 testes unitarios executam em ~8s cobrindo use cases, presenters, utils e o UseCaseWrapper.
- Novos cenarios garantem autorizacao completa (roles proibidas, caminhos positivos/negativos) e validacao de CPF (branchs 10/11).
- Suites de integracao/e2e permanecem planejadas mas vazias (	est/integration, 	est/e2e).

### Validacao e contratos
- Controllers continuam chamando schema.parse apos o ZodValidationPipe; remover duplicidade segue prioridade.
- Swagger/DTOs nao refletem as mesmas mensagens dos schemas Zod.

### RBAC e dominio
- Cobertura de testes garante que ensurePermissions e uildQuickActions sigam regras de negocio inclusive para roles internas.
- Agendas e financeiro ainda precisam migrar para a mesma estrategia.

## Testes Executados
- 
pm run test:unit (ok)
- 
pm run test:cov (ok) – statements 100%, branches 100%, functions 100%, lines 100%

## Proximos Passos Prioritarios
1. Iniciar suites de integracao/e2e em 	est/integration e 	est/e2e, reutilizando fixtures (	est/utils/supabase-fixtures.ts:1).
2. Remover parses duplicados nos controllers e alinhar DTOs aos schemas Zod.
3. Refatorar factories/DTOs para consumir presenters/mappers compartilhados, elevando a nota DRY.
4. Integrar os scripts check:quality e 	est:cov ao pipeline CI para enforcement continuo.
5. Mapear modulos restantes (financeiro, agendas) para aplicar as mesmas regras de RBAC.

Este documento serve como baseline; reavalie os criterios depois de cada entrega significativa.

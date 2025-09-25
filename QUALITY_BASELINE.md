# Linha de Base de Qualidade - OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: feature/coverage (worktree)
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontuacao Atual

| Criterio | Nota atual (0-10) | Meta | Evidencias chave |
| --- | --- | --- | --- |
| DRY / Reuso de codigo | 7.0 | >= 8.5 | Controllers agora delegam para presenters compartilhados (src/modules/patients/api/controllers/patients.controller.ts:48, src/modules/users/api/controllers/users.controller.ts:45); normalizacao de roles centralizada com mapRoleToDomain (src/modules/patients/use-cases/create-patient.use-case.ts:36, src/modules/patients/use-cases/transfer-patient.use-case.ts:42). Persistem duplicacoes pontuais em factories e DTOs spread. |
| Automacao de qualidade | 5.5 | >= 8.0 | Scripts check:dry e check:quality configurados (package.json:26-33); configuracao de cobertura agregada no Jest (jest.config.js:15) com limiares globais (jest.config.js:23-28). Suites de integracao/e2e ainda ausentes apesar de test/jest-e2e.json. |
| Testes automatizados | 5.0 | >= 8.0 | Nova suite unitaria em test/unit cobrindo presenters, utils e pipe (ex.: test/unit/patient.presenter.spec.ts:1, test/unit/zod-validation.pipe.spec.ts:1); cobertura medida pelo script test:cov atingiu 85.71% statements (coverage/coverage-summary.json). Casos de uso e servicos principais continuam sem testes. |
| Validacoes e contratos | 6.0 | >= 9.0 | DTOs continuam duplicando regras dos schemas Zod (src/modules/patients/api/controllers/patients.controller.ts:122, src/modules/users/api/controllers/users.controller.ts:109); pipe ajustado com Logger mas controllers ainda fazem parse redundante. |
| Governanca de dominio / RBAC | 8.0 | >= 9.0 | Todos os use cases de pacientes usam mapRoleToDomain e enums (src/modules/patients/use-cases/list-patients.use-case.ts:53, src/modules/patients/use-cases/archive-patient.use-case.ts:42), eliminando strings soltas. Restam revisoes para outros modulos (financeiro, agendas) nao cobertos nesta entrega. |

## Observacoes Detalhadas

### DRY e reuso
- Presenters de pacientes e usuarios estao consolidados e consumidos pelos controllers, evitando mapeamentos repetidos (src/modules/patients/api/presenters/patient.presenter.ts, src/modules/users/api/presenters/user.presenter.ts).
- SupabaseAuthService.mapUserRecord esta coberto por teste, mas o servico ainda contem logica abrangente sem segmentacao; considerar extrair helpers para eventos/auditoria.
- Factories (src/shared/factories/auth-error.factory.ts) e DTOs continuam com spreads extensos que poderiam consumir presenters/mappers.

### Automacao e scripts
- check:quality agora executa lint + cobertura; rodadas locais passam, mas falta pipeline CI para garantir gate em Pull Requests.
- test/jest-e2e.json permanece sem specs em test/e2e; e2e automatizado precisa ser planejado conforme proximo passo.

### Testes
- 22 testes unitarios rodam em cerca de 6 segundos usando o script test:unit.
- Cobertura esta restrita a presenters, utils e validator; casos de uso, repositories e notificacoes seguem sem garantias automatizadas.
- Fixtures de Supabase (test/utils/supabase-fixtures.ts) prontos para ampliar cobertura de servicos externos.

### Validacao e contratos
- Controllers ainda executam schema.parse apos o ZodValidationPipe, incorrendo em parse duplo.
- Necessario alinhar DTOs Swagger com os schemas Zod para evitar divergencia de regras e mensagens.

### RBAC e dominio
- Pacientes: autorizacao normalizada via enums e utilitario; consistente com regra corporativa.
- Demais modulos (auth, agendas) ainda usam checagens locais; mapear em futuras iteracoes.

## Testes Executados
- test:unit (ok)
- test:cov (ok) - statements 85.71%, branches 55.00%, functions 100%, lines 89.62%

## Proximos Passos Prioritarios
1. Estender cobertura para casos de uso criticos (sign-in, create-patient, transfer) utilizando testes unitarios com mocks dos repositories.
2. Provisionar suite de integracao/e2e em test/integration e test/e2e, conectando mocks do Supabase ou containers descartaveis.
3. Remover parse duplo nos controllers em favor do valor retornado pelo ZodValidationPipe e alinhar DTOs aos schemas.
4. Extrair logicas volumosas de factories/shared helpers em unidades menores para ampliar reuso e testabilidade.
5. Integrar os novos scripts de qualidade em pipeline CI para garantir enforcement continuo.

Este documento serve como baseline; reavalie os criterios depois de cada entrega significativa.

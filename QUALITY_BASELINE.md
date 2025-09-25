# Linha de Base de Qualidade - OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: feature/coverage (worktree)
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontuacao Atual

| Criterio | Nota atual (0-10) | Meta | Evidencias chave |
| --- | --- | --- | --- |
| DRY / Reuso de codigo | 9.5 | >= 9.0 | AuthController e PatientsController delegam normalizacao de payloads aos mappers dedicados (src/modules/auth/api/controllers/auth.controller.ts:118, src/modules/auth/api/mappers/auth-request.mapper.ts:65, src/modules/patients/api/controllers/patients.controller.ts:110). |
| Automacao de qualidade | 8.5 | >= 8.5 | Sequencia de scripts continua rodando npm run test:unit → test:int → test:e2e → test:cov com limiar global travado em 100% (jest.config.js:12-20, package.json:23-38). |
| Testes automatizados | 9.9 | >= 9.5 | 131 testes cobrindo unidade/integracao/e2e e mappers recem-criados, mantendo cobertura global 100% (test/unit/modules.auth/auth-request.mapper.spec.ts:1, test/integration/patients.controller.integration.spec.ts:1, coverage/coverage-summary.json:1). |
| Validacoes e contratos | 8.7 | >= 9.0 | Fluxos de auth passam por schemas Zod e mappers antes dos use cases (src/modules/auth/api/controllers/two-factor.controller.ts:40, src/modules/auth/api/mappers/auth-request.mapper.ts:117), eliminando objetos montados manualmente. |
| Governanca de dominio / RBAC | 8.0 | >= 9.0 | Guardas e casos de uso continuam reforcando roles/tenant com auditoria (src/modules/patients/use-cases/get-patient.use-case.ts:89, test/e2e/patients.e2e-spec.ts:58). |

## Observacoes Detalhadas

### DRY e reuso
- AuthController, TwoFactorController e PatientsController compartilham resolucao de contexto/mapeamento via helpers, removendo spreads repetidos e normalizacoes ad-hoc.
- Mapper de auth cobre device info, tokens e defaults (two-factor-client), garantindo consistencia entre sign-in, refresh, sign-out e 2FA.
- Proximo alvo de DRY e extrair mappers equivalentes para usuarios (CRUD/filters) e demias modulos (agenda/financeiro).

### Automacao e scripts
- Fluxo local permanece linear (unit → int → e2e → cov) com collectCoverageFrom ampliado para mappers de auth/pacientes.
- Aguardando pipeline CI para rodar mesmos gates de forma automatizada.

### Testes
- Novo spec cobre todos os ramos do mapper de auth, incluindo arrays de headers e fallback de valores.
- Contagem total de 131 testes em ~17s; branch coverage mantida em 100% global.
- Suites de integracao/e2e seguem focadas em pacientes; auth/users ainda carecem de exercicios ponta-a-ponta.

### Validacao e contratos
- Todos os endpoints de auth e pacientes agora consomem dados ja validados pelo ZodValidationPipe + mapper, preservando DTOs para Swagger.
- Fallbacks de device/ip centralizados evitam divergencia de comportamento entre endpoints.

### RBAC e dominio
- Sem mudancas nas politicas; validacoes de role/tenant permanecem nos use cases existentes.
- Ainda necessario expandir cobertura para agenda/financeiro antes de elevar a meta.

## Testes Executados
- npm run test:unit
- npm run test:int
- npm run test:e2e
- npm run test:cov

## Proximos Passos Prioritarios
1. Extrair mapper/normalizacao semelhantes para o modulo de usuarios (create/update/list) e eliminar spreads residuais de metadata.
2. Expandir suites de integracao/e2e para fluxos de auth e usuarios, garantindo rastreabilidade completa de RBAC.
3. Automatizar lint + testes + cobertura em pipeline CI com gates de 100%.
4. Planejar mesma abordagem de mappers para agenda/financeiro, reforcando DRY e contratos nesses dominios.
5. Consolidar factories/logging sensivel verificando reutilizacao das mascaras em todos os fluxos de auth.

Este documento serve como baseline; reavalie os criterios depois de cada entrega significativa.

# Linha de Base de Qualidade - OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: feature/coverage (worktree)
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontuacao Atual

| Criterio | Nota atual (0-10) | Meta | Evidencias chave |
| --- | --- | --- | --- |
| DRY / Reuso de codigo | 9.7 | >= 9.0 | Controllers de Auth, Patients e Users delegam normalizacao de payloads aos mappers dedicados, evitando duplicacao de parsers (src/modules/auth/api/controllers/auth.controller.ts:118, src/modules/patients/api/controllers/patients.controller.ts:110, src/modules/users/api/controllers/users.controller.ts:97) enquanto user-request.mapper centraliza os contratos de usuarios (src/modules/users/api/mappers/user-request.mapper.ts:13). |
| Automacao de qualidade | 8.5 | >= 8.5 | Sequencia padrao npm run test:unit → test:int → test:e2e → test:cov se mantém com limiar global travado em 100% (jest.config.js:12-29, package.json:23-38). |
| Testes automatizados | 10.0 | >= 9.5 | 136 testes cobrindo unidade/integracao/e2e e todos os mappers, mantendo cobertura global 100% (test/unit/modules.users.user-request.mapper.spec.ts:1, test/integration/patients.controller.integration.spec.ts:1, coverage/coverage-summary.json:1). |
| Validacoes e contratos | 9.2 | >= 9.0 | Fluxos de auth, users e patients agora passam por schemas Zod e mappers antes dos use cases (src/modules/auth/api/mappers/auth-request.mapper.ts:117, src/modules/users/api/controllers/users.controller.ts:144, src/modules/patients/api/controllers/patients.controller.ts:110). |
| Governanca de dominio / RBAC | 8.0 | >= 9.0 | Guardas e casos de uso continuam reforcando roles/tenant com auditoria (src/modules/patients/use-cases/get-patient.use-case.ts:89, test/e2e/patients.e2e-spec.ts:58). |

## Observacoes Detalhadas

### DRY e reuso
- AuthController, TwoFactorController, PatientsController e agora UsersController compartilham resolucao de contexto/mapeamento via helpers, eliminando spreads e normalizacoes ad-hoc nos endpoints.
- Mapper de auth cobre device info, tokens e defaults; mapper de usuarios centraliza comandos de create/update/filter reaproveitados pelos casos de uso.
- Proximo alvo de DRY e replicar a mesma abordagem para agendamento e financeiro (mappers + presenters dedicados).

### Automacao e scripts
- Fluxo local permanece linear (unit → int → e2e → cov) com collectCoverageFrom ampliado para mappers de auth/pacientes/usuarios.
- Aguardando pipeline CI para rodar os mesmos gates de forma automatizada.

### Testes
- Novo spec cobre todos os ramos do mapper de usuarios, garantindo coercoes de tenantId e metadata.
- Contagem total de 136 testes em ~12s; branch coverage mantida em 100% global.
- Suites de integracao/e2e seguem focadas em pacientes; auth e usuarios ainda carecem de cenarios ponta-a-ponta.

### Validacao e contratos
- Todos os endpoints de auth, users e patients consomem dados validados pelo ZodValidationPipe e mappers, preservando DTOs apenas para Swagger.
- Fallbacks de device/ip e tenantId estao centralizados, evitando divergencias futuras.

### RBAC e dominio
- Sem mudancas nas politicas; validacoes de role/tenant permanecem nos use cases existentes.
- Necessario expandir cobertura para agenda/financeiro antes de elevar a meta.

## Testes Executados
- npm run test:unit
- npm run test:int
- npm run test:e2e
- npm run test:cov

## Proximos Passos Prioritarios
1. Replicar estrategia de mappers/presenters para agendamento e financeiro, reduzindo duplicacao nos controllers restantes.
2. Expandir suites de integracao/e2e para fluxos de auth e usuarios, validando RBAC e 2FA ponta-a-ponta.
3. Automatizar lint + testes + cobertura em pipeline CI com gates de 100%.
4. Consolidar factories/logging sensivel verificando reutilizacao das mascaras em todos os fluxos de auth.
5. Mapear contratos compartilhados de notificacoes para eliminar normalizacoes manuais em serviços externos.

Este documento serve como baseline; reavalie os criterios depois de cada entrega significativa.

# Linha de Base de Qualidade – OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: 12dc514
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontuação Inicial

| Critério | Nota atual (0-10) | Meta | Evidências chave |
| --- | --- | --- | --- |
| DRY / Reuso de código | 5.0 | = 8.5 | Mapeamentos duplicados em `src/modules/patients/api/controllers/patients.controller.ts:486` e `src/modules/users/api/controllers/users.controller.ts:327`; mapeadores centralizados não utilizados em `src/shared/mappers/*.ts`; conversões repetidas em `src/infrastructure/auth/services/supabase-auth.service.ts:62,321,355` |
| Automação de qualidade | 3.0 | = 8.0 | Scripts `check:dry` e `check:quality` ausentes (`package.json:31-32`); `test:e2e` aponta para configuração inexistente (`package.json:28`); pipelines atuais falham |
| Testes automatizados | 2.5 | = 8.0 | Apenas um teste unitário (`src/infrastructure/users/repositories/user.repository.spec.ts`), ausência de cobertura para casos de uso críticos |
| Validações e contratos | 6.0 | = 9.0 | Regras duplicadas entre DTOs/class-validator e schemas Zod, com parsing duplo (`src/modules/patients/api/controllers/patients.controller.ts:121,172`) |
| Governança de domínio / RBAC | 6.5 | = 9.0 | Verificações de papel com strings soltas (`src/modules/patients/use-cases/create-patient.use-case.ts:38`, `src/modules/patients/use-cases/transfer-patient.use-case.ts:36`) em vez de reutilizar `RolesEnum`/`RolesUtil` |

## Observações Detalhadas

### DRY e reuso
- Controladores de pacientes e usuários convertem entidades em DTOs manualmente enquanto `src/shared/mappers/patient.mapper.ts` e `src/shared/mappers/user.mapper.ts` permanecem não utilizados; consolidar em presenters/mappers únicos evita divergências.
- `SupabaseAuthService` recria o mesmo objeto `SupabaseUser` em múltiplos métodos (`signUp`, `updateUserMetadata`, `refreshToken`), sugerindo helper privado para normalização.
- `ZodValidationPipe` já retorna dados transformados; manter `schema.parse(...)` nos controladores (ex.: `patients.controller.ts:121,172`) duplica validações.

### Automação e scripts
- Execuções de `npm run check:dry` e `npm run check:quality` falham por falta de arquivos (`scripts/check-dry.ts`, `scripts/quality-check.ts`); necessário implementar ou ajustar `package.json`.
- O script `test:e2e` depende de `test/jest-e2e.json`, mas o diretório `test/` não existe, inviabilizando gate de regressão.

### Testes
- Apenas `user.repository` possui teste unitário; casos de uso de autenticação, pacientes e notificações carecem de cobertura.
- Não há coleta de métricas de cobertura; definir limiares mínimos via Jest `--coverage` deve acompanhar a criação dos testes.

### Validação e contratos
- DTOs decorados para Swagger replicam regras de schemas Zod (ex.: `CreateUserInputDTO` versus `createUserSchema`), dobrando manutenção.
- `ZodValidationPipe` utiliza `console.error` (`src/shared/pipes/zod-validation.pipe.ts:24-26`); padronizar com Logger evita ruído e mantém observabilidade configurável.

### RBAC e domínio
- Checks de permissão em `create-patient.use-case.ts:38` e `transfer-patient.use-case.ts:36` usam strings PT/EN; centralizar no `RolesEnum`/`RolesUtil` evita inconsistências futuras.

## Testes Executados
- `npm run check:dry` ? falha (arquivo ausente).
- `npm run check:quality` ? falha (arquivo ausente).
- `npm test -- --runTestsByPath src/infrastructure/users/repositories/user.repository.spec.ts` ? sucesso (1 teste executado).

## Próximos Passos Prioritários
1. Implementar `scripts/check-dry.ts` e `scripts/quality-check.ts` (ou ajustar `package.json`) para restaurar os gates de qualidade prometidos.
2. Extrair presenters/mappers para usuários e pacientes reutilizando `src/shared/mappers`, removendo código duplicado nos controllers.
3. Revisar controladores para consumir o valor já validado pelo `ZodValidationPipe`, eliminando parses redundantes e inconsistências.
4. Centralizar validação de roles utilizando `RolesEnum`/`RolesUtil`, eliminando listas manuais heterogêneas nos use cases de pacientes.
5. Montar suíte mínima de testes para fluxos críticos (sign-in, create-user, create-patient) e habilitar coleta de cobertura.

Este documento serve como baseline; após cada entrega, reavalie os critérios e atualize as notas para manter a qualidade alinhada às metas.

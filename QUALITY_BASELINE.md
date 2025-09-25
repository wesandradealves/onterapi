# Linha de Base de Qualidade � OnTerapi Backend v4

- Data: 2025-09-25
- Commit analisado: 12dc514
- Ambiente: desenvolvimento local (Node 22.18.0)

## Pontua��o Inicial

| Crit�rio | Nota atual (0-10) | Meta | Evid�ncias chave |
| --- | --- | --- | --- |
| DRY / Reuso de c�digo | 5.0 | = 8.5 | Mapeamentos duplicados em `src/modules/patients/api/controllers/patients.controller.ts:486` e `src/modules/users/api/controllers/users.controller.ts:327`; mapeadores centralizados n�o utilizados em `src/shared/mappers/*.ts`; convers�es repetidas em `src/infrastructure/auth/services/supabase-auth.service.ts:62,321,355` |
| Automa��o de qualidade | 3.0 | = 8.0 | Scripts `check:dry` e `check:quality` ausentes (`package.json:31-32`); `test:e2e` aponta para configura��o inexistente (`package.json:28`); pipelines atuais falham |
| Testes automatizados | 2.5 | = 8.0 | Apenas um teste unit�rio (`src/infrastructure/users/repositories/user.repository.spec.ts`), aus�ncia de cobertura para casos de uso cr�ticos |
| Valida��es e contratos | 6.0 | = 9.0 | Regras duplicadas entre DTOs/class-validator e schemas Zod, com parsing duplo (`src/modules/patients/api/controllers/patients.controller.ts:121,172`) |
| Governan�a de dom�nio / RBAC | 6.5 | = 9.0 | Verifica��es de papel com strings soltas (`src/modules/patients/use-cases/create-patient.use-case.ts:38`, `src/modules/patients/use-cases/transfer-patient.use-case.ts:36`) em vez de reutilizar `RolesEnum`/`RolesUtil` |

## Observa��es Detalhadas

### DRY e reuso
- Controladores de pacientes e usu�rios convertem entidades em DTOs manualmente enquanto `src/shared/mappers/patient.mapper.ts` e `src/shared/mappers/user.mapper.ts` permanecem n�o utilizados; consolidar em presenters/mappers �nicos evita diverg�ncias.
- `SupabaseAuthService` recria o mesmo objeto `SupabaseUser` em m�ltiplos m�todos (`signUp`, `updateUserMetadata`, `refreshToken`), sugerindo helper privado para normaliza��o.
- `ZodValidationPipe` j� retorna dados transformados; manter `schema.parse(...)` nos controladores (ex.: `patients.controller.ts:121,172`) duplica valida��es.

### Automa��o e scripts
- Execu��es de `npm run check:dry` e `npm run check:quality` falham por falta de arquivos (`scripts/check-dry.ts`, `scripts/quality-check.ts`); necess�rio implementar ou ajustar `package.json`.
- O script `test:e2e` depende de `test/jest-e2e.json`, mas o diret�rio `test/` n�o existe, inviabilizando gate de regress�o.

### Testes
- Apenas `user.repository` possui teste unit�rio; casos de uso de autentica��o, pacientes e notifica��es carecem de cobertura.
- N�o h� coleta de m�tricas de cobertura; definir limiares m�nimos via Jest `--coverage` deve acompanhar a cria��o dos testes.

### Valida��o e contratos
- DTOs decorados para Swagger replicam regras de schemas Zod (ex.: `CreateUserInputDTO` versus `createUserSchema`), dobrando manuten��o.
- `ZodValidationPipe` utiliza `console.error` (`src/shared/pipes/zod-validation.pipe.ts:24-26`); padronizar com Logger evita ru�do e mant�m observabilidade configur�vel.

### RBAC e dom�nio
- Checks de permiss�o em `create-patient.use-case.ts:38` e `transfer-patient.use-case.ts:36` usam strings PT/EN; centralizar no `RolesEnum`/`RolesUtil` evita inconsist�ncias futuras.

## Testes Executados
- `npm run check:dry` ? falha (arquivo ausente).
- `npm run check:quality` ? falha (arquivo ausente).
- `npm test -- --runTestsByPath src/infrastructure/users/repositories/user.repository.spec.ts` ? sucesso (1 teste executado).

## Pr�ximos Passos Priorit�rios
1. Implementar `scripts/check-dry.ts` e `scripts/quality-check.ts` (ou ajustar `package.json`) para restaurar os gates de qualidade prometidos.
2. Extrair presenters/mappers para usu�rios e pacientes reutilizando `src/shared/mappers`, removendo c�digo duplicado nos controllers.
3. Revisar controladores para consumir o valor j� validado pelo `ZodValidationPipe`, eliminando parses redundantes e inconsist�ncias.
4. Centralizar valida��o de roles utilizando `RolesEnum`/`RolesUtil`, eliminando listas manuais heterog�neas nos use cases de pacientes.
5. Montar su�te m�nima de testes para fluxos cr�ticos (sign-in, create-user, create-patient) e habilitar coleta de cobertura.

Este documento serve como baseline; ap�s cada entrega, reavalie os crit�rios e atualize as notas para manter a qualidade alinhada �s metas.

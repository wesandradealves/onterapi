# OnTerapi v4

Plataforma SaaS multi-tenant para gestao de clinicas e terapeutas, com Supabase Auth, 2FA, RBAC e modulo de pacientes conectado diretamente ao storage do Supabase.

## Sumario
- [Visao Geral](#visao-geral)
- [Credenciais de Teste](#credenciais-de-teste)
- [Fluxo de Autenticacao](#fluxo-de-autenticacao)
- [Modulo de Pacientes](#modulo-de-pacientes)
- [Modulo de Usuarios](#modulo-de-usuarios)
- [Exportacao de Pacientes](#exportacao-de-pacientes)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Testes Manuais Recomendados](#testes-manuais-recomendados)
- [Troubleshooting](#troubleshooting)

## Visao Geral
- NestJS 10 + TypeScript 5 + Result Pattern
- Supabase Cloud (PostgreSQL + Auth) como camada de dados principal
- TypeORM apenas para entidades/seed de apoio (sem banco local)
- JWT proprio (access/refresh) + 2FA por email
- MessageBus + eventos de dominio para auditar autenticao e pacientes
- DRY/Clean Architecture com BaseUseCase, BaseGuard e MessageBus unificados

## Credenciais de Teste
| Role | Email | Senha | Observacoes |
| ---- | ----- | ----- | ----------- |
| SUPER_ADMIN | orland97@ethereal.email | XwFUUjCagc3uhmxvhM | 2FA habilitado (codigo enviado via Ethereal) |
| SECRETARY | secretary.codex+20250923@exam.com | SenhaForte123! | Email ja verificado, sem 2FA |

> As credenciais ficam em `./.env` para desenvolvimento. Sempre gere 2FA pelo endpoint `/auth/two-factor/send`.

## Fluxo de Autenticacao
1. `POST /auth/sign-in` com email/senha. Super admin exige 2FA automaticamente.
2. `POST /auth/two-factor/send` com `tempToken` recebido.
3. Buscar codigo 2FA em `two_factor_codes` (via Supabase REST) ou pelo email Ethereal.
4. `POST /auth/two-factor/validate` com `tempToken` + `code`.
5. A partir do access token:
   - `GET /auth/me`
   - `POST /auth/refresh` com refresh token
   - `POST /auth/sign-out` (opcionalmente `{ "allDevices": true }`) agora cancela tambem as sessoes Supabase quando possivel e ignora tokens invalidos sem log de erro.

### Logs e Auditoria
- Todos os eventos (sign-in, 2FA enviado/validado, logout) sao publicados via `MessageBus`.
- Guardas `JwtAuthGuard`, `RolesGuard` e `TenantGuard` foram revisados para usar o contexto completo do usuario.

## Modulo de Pacientes
- CRUD completo persistido na tabela `patients` do Supabase.
- Filtros suportados: `status`, `riskLevel`, `tags`, `query`, paginacao e ordenacao (`createdAt`, `updatedAt`, `fullName`).
- Transferencia, arquivamento e restauro respeitam roles (somente OWNER/MANAGER/SUPER_ADMIN).
- Validacao de CPF (duplicidade por tenant) com mensagens traduzidas.
- DTOs e schemas (Zod) garantem payload limpo.

Rotas principais:
- `GET /patients` Lista paginada.
- `POST /patients` Cria paciente (CPF unico por tenant).
- `GET /patients/:slug` Retorna resumo, timeline (stub) e insights (stub).
- `PATCH /patients/:slug` Atualiza dados basicos, tags, professionalId.
- `POST /patients/:slug/transfer` Transferencia entre profissionais.
- `POST /patients/:slug/archive` Arquiva/soft-delete e bloqueia edicao.

## Modulo de Usuarios
- `GET /users` visivel apenas para SUPER_ADMIN.
- Cria usuarios com Supabase Auth (`POST /users`). Email precisa ser confirmado antes de login.
- Rotas de leitura/edicao usam slug estavel (`GET /users/:slug`, `PATCH /users/:slug`, `DELETE /users/:slug`).
- Atualizacoes refletem metadata e sessoes (`user_sessions`) para refresh tokens.
- Script `npm run backfill:user-slugs` sincroniza o slug do banco relacional com o metadata do Supabase Auth para contas legadas.
- Script `npm run sync:users` garante que apenas os usuarios presentes no Postgres estejam registrados no Supabase Auth (executa insert/update e remove contas extras).

## Exportacao de Pacientes
- `POST /patients/export` enfileira solicitacao na tabela `patient_exports`.
- Filtros enviados sao persistidos em JSONB (`status`, `tags`, `assignedProfessionalIds`, etc.).
- Resposta imediata `202 { "fileUrl": "" }` indicando job pendente.
- Worker (externo) deve preencher `file_path` posteriormente.

## Como Rodar Localmente
```bash
npm install
npm run build
npm run start:dev
```

Variaveis chave (`.env`):
```
SUPABASE_URL=https://ogffdaemylaezxpunmop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_2FA_SECRET=...
EMAIL_USER=orland97@ethereal.email
EMAIL_PASS=XwFUUjCagc3uhmxvhM
```

> Para evitar erros IPv6 use o pooler do Supabase (`aws-0-sa-east-1.pooler.supabase.com:6543`) e defina `NODE_OPTIONS=--dns-result-order=ipv4first`.

## Testes Manuais Recomendados
1. Login SUPER_ADMIN + fluxo 2FA completo.
2. Listar usuarios e pacientes com access token.
3. Criar paciente, atualizar, transferir, arquivar e confirmar estado.
4. Criar usuario secretaria (POST /users), forcar confirmacao (`confirmEmailByEmail`), validar login sem 2FA e checar bloqueios de permissao.
5. Exportar pacientes e inspecionar `patient_exports` via REST.
6. Logout com `{ "allDevices": true }` e verificacao de revogacao em `user_sessions`.

## Troubleshooting
- **Supabase signOut error: invalid JWT**: agora tratado como `debug`, fluxo segue normalmente.
- **Token nao fornecido**: verifique header `Authorization: Bearer <accessToken>`.
- **Tenant invalido**: sempre enviar o tenant real ou deixar o guard resolver via metadata.
- **Emails/Ethereal**: conferir caixa de saida do Ethereal para visualizar credenciais e codigos 2FA.

## Changelog
Mudancas recentes estao em [CHANGELOG.md](./CHANGELOG.md). Ultima versao: v0.15.0 (24/09/2025).




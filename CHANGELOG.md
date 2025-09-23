# Changelog

Todas as mudancas notaveis neste projeto serao documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e o projeto adota [Versionamento Semantico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Changed
- Documentacao do Swagger atualizada para listar os roles exigidos nos modulos Auth, Two-Factor, Patients e Users.
- Fluxo de Two-Factor no Swagger atualizado: payload de validação documentado e endpoint manual de reenvio oculto.
- Swagger: removido esquema de API key não utilizado para evitar confusão na autenticação.
- Filtros da listagem de pacientes no Swagger exibem enums reais (status, risco, quickFilter) alinhados às validações de back-end.

### Fixed
- Remocao de artefatos de encoding nas descricoes dos endpoints documentados no Swagger.


## [0.14.0] - 2025-09-23

### Added
- Modulo completo de pacientes (CRUD, filtros, transferencia, arquivamento) integrado ao Supabase.
- Endpoint `/patients/export` persistindo pedidos na tabela `patient_exports` com filtros armazenados.
- Nova documentacao de fluxo end-to-end (auth + 2FA + pacientes + export) e credenciais atualizadas.

### Changed
- SignOutUseCase passa a informar o `userId` ao Supabase e ignora assinaturas invalidas sem gerar erro.
- DTO `SignOutDto` agora valida `refreshToken` e `allDevices` com class-validator.
- README reescrito com instrucoes atualizadas, fluxos de teste e troubleshooting.

### Fixed
- Logout em todos os dispositivos nao gera mais warning `invalid JWT` do Supabase.
- Exportacao de pacientes respeita roles (SECRETARY bloqueada) e registra jobs pendentes corretamente.

## [0.13.1] - 2025-09-21

### Changed
- Reforco de seguranca exigindo segredos JWT definidos via ambiente
- ValidationPipe global com whitelist e forbidNonWhitelisted ativados
- Codigos 2FA gerados com RNG criptografico
- JwtAuthGuard agora injeta o contexto completo do usuario utilizado pelos demais guards
- Contratos e DTOs de Auth ajustados (me, sign-out, refresh) para respostas consistentes

### Fixed
- Logout em todos os dispositivos atualiza as colunas corretas em user_sessions
- SignOutResponseDto alinhado ao payload retornado (revokedSessions)
- Endpoint /auth/two-factor/send documentado e validado com Zod
- Criacao de usuarios utilizando a interface unificada do Supabase Auth

### Infrastructure
- EventEmitter centralizado no AppModule para mensageria compartilhada
- Interface ISupabaseAuthService passa a expor confirmEmailByEmail
- Fluxos E2E revalidados com super admin dedicado e tokens reais

## [0.13.0] - 2025-09-04

### Added
- **Validacao de email obrigatoria para login**
  - Usuarios nao podem fazer login sem confirmar email
  - Mensagem especifica "Email nao verificado" ao inves de "Credenciais invalidas"
  - Tratamento correto do erro "Email not confirmed" do Supabase

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
  - Login bloqueado sem email confirmado ✓
  - Login funcional apos confirmacao ✓
  - Prevencao de confirmacao duplicada ✓
  - 2FA funcionando corretamente ✓
  - Bloqueio apos 3 tentativas erradas de 2FA ✓

## [0.12.0] - 2025-09-03
...

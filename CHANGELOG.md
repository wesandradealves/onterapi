# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Fixed
- Erro de runtime na Vercel corrigido (sintaxe nodejs20.x removida)
- Configuração vercel.json simplificada usando builds/routes padrão
- Path aliases TypeScript resolvidos para produção (@shared, @domain, etc)
- Erro "Cannot find module '@shared/messaging/message-bus.module'" corrigido

### Added
- tsconfig-paths/register no api/index.ts para resolver aliases em runtime
- tsc-alias no processo de build para resolver paths em build time
- tsconfig.build.json com configuração específica de paths

### Changed
- Script de build atualizado para incluir tsc-alias

## [0.2.3-alpha.1] - 2025-08-31

### Fixed
- Import do Express corrigido de namespace para default import no api/index.ts
- Configuração do Vercel atualizada para NestJS serverless
- api/index.ts simplificado removendo dependência do BootstrapFactory
- Build passando localmente e pronto para deploy

### Changed
- vercel.json reconfigurado com framework null e funções serverless
- Runtime definido como nodejs20.x com limites apropriados
- Configurações de produção inline no api/index.ts (helmet, validation)
- Logger condicional baseado em NODE_ENV

### Added
- ValidationPipe global configurado no handler serverless
- Helmet.js para segurança em produção
- Documentação de variáveis de ambiente necessárias para Vercel

## [0.2.2-alpha.1] - 2025-08-31

### Fixed
- Corrigido .vercelignore que estava removendo arquivos necessários (src, tsconfig)
- Ajustado vercel.json para usar builds e routes corretos
- Handler /api/index.ts otimizado para Vercel
- Build da Vercel agora funciona corretamente

### Changed
- Simplificação do .vercelignore mantendo apenas arquivos desnecessários
- vercel.json usa configuração de builds ao invés de rewrites

## [0.2.1-alpha.1] - 2025-08-31

### Added
- Suporte completo para deploy serverless na Vercel
- Configuração de edge functions otimizada
- Documentação de variáveis de ambiente necessárias

## [0.2.0-alpha.1] - 2025-08-31

### Added
- Integração completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitoramento completo (DB, memória, disco)
- Sistema de mensageria unificado com EventEmitter
- Bootstrap factory centralizada para eliminar duplicação
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- Integração com @nestjs/terminus para health checks nativos
- Output style customizado para desenvolvimento OnTerapi
- Regras de qualidade extrema (DRY, linter, build obrigatórios)

### Changed
- Banco de dados migrado de local para Supabase cloud
- README expandido com documentação completa do Supabase
- Documentação centralizada no README (regra: sem arquivos .md extras)
- Refatoração completa para eliminar duplicação de código
- Substituição de `any` por `unknown` para type safety
- Path do DiskHealthIndicator corrigido para Windows

### Removed
- Arquivos de teste desnecessários (main-test.ts, app-test.module.ts)
- Módulo example removido (não essencial)
- Entidade test.entity.ts removida
- Módulo health customizado (usando Terminus nativo)

### Fixed
- Erros de TypeScript em decorators Zod
- Imports não utilizados removidos
- Configuração de paths TypeScript (@shared, @domain, etc)
- Health check no Windows (path C:\ ao invés de /)

### Security
- SSL/TLS habilitado para conexão com Supabase
- Separação de chaves públicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementação
- Helmet.js configurado para segurança HTTP

## [0.1.0] - 2024-12-28

### Added
- Boilerplate inicial do projeto
- Estrutura de pastas seguindo DDD
- Configurações base (TypeScript, ESLint, Prettier)
- Package.json com dependências essenciais
- README com documentação inicial
- Sistema de versionamento semântico

---

*Mantenha este arquivo atualizado a cada release*
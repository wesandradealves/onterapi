# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Integração completa com Supabase (PostgreSQL hospedado)
- Swagger UI configurado e funcional em `/api`
- Health check endpoint com monitoramento de banco
- Módulo de exemplo demonstrando validação Zod
- Validadores brasileiros (CPF, CNPJ, CRM, CRP, CNS, CEP)
- Decorators customizados (@ZodInputValidation, @ZodResponse)
- Integração com OpenAI para CrewAI

### Changed
- Banco de dados migrado de local para Supabase cloud
- README expandido com documentação completa do Supabase
- Documentação centralizada no README (regra: sem arquivos .md extras)

### Security
- SSL/TLS habilitado para conexão com Supabase
- Separação de chaves públicas (Anon) e privadas (Service Role)
- Row Level Security (RLS) preparado para implementação

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
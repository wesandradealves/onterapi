# OnTerapi v4 - Sistema de Gestão para Terapias Integrativas

## 📋 Índice
- [Sobre](#sobre)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Desenvolvimento](#desenvolvimento)
- [Módulos](#módulos)
- [API](#api)
- [Testes](#testes)
- [Deploy](#deploy)

## 📌 Sobre

OnTerapi v4 é uma plataforma SaaS multi-tenant completa para gestão de clínicas e profissionais de terapias integrativas, com sistema de IA multi-agentes especializado.

### Principais Funcionalidades
- 🏥 Gestão completa de clínicas e profissionais
- 📅 Sistema de agendamento inteligente
- 📋 Anamnese digital com 10 etapas estruturadas
- 💊 Planos terapêuticos com IA (23 agentes especializados)
- 💰 Módulo financeiro com split automático
- 🤖 Sistema CrewAI integrado
- 📱 Portais dedicados (profissional, paciente, admin)
- 🛒 Marketplace público

## 🏗️ Arquitetura

### Stack Tecnológica
- **Backend**: NestJS 10.3 + TypeScript 5.3
- **Database**: PostgreSQL 16 + TypeORM 0.3
- **Cache**: Redis 7
- **Queue**: Bull
- **Mensageria**: EventEmitter + RabbitMQ
- **Validação**: Zod 3.22
- **Auth**: JWT + Passport
- **Docs**: Swagger + Compodoc

### Padrões Arquiteturais
- **DDD** (Domain-Driven Design)
- **Clean Architecture**
- **CQRS Pattern**
- **Event-Driven Architecture**
- **Repository Pattern**
- **Result Pattern**

### Estrutura de Módulos
```
src/
├── domain/           # Lógica de negócio pura
├── infrastructure/   # Implementações técnicas
├── modules/          # Módulos da aplicação
├── shared/           # Código compartilhado
└── core/            # Configurações globais
```

## 🚀 Instalação

### Pré-requisitos
- Node.js >= 20.0.0
- PostgreSQL >= 16
- Redis >= 7
- npm >= 10.0.0

### Setup Inicial
```bash
# Clonar repositório
git clone https://github.com/onterapi/v4.git
cd onterapi-v4

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Rodar migrations
npm run migration:run

# Rodar seeds (dados iniciais)
npm run seed:run

# Iniciar desenvolvimento
npm run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=onterapi
DB_PASSWORD=secure_password
DB_DATABASE=onterapi_v4

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# API
PORT=3000
NODE_ENV=development
```

## 💻 Desenvolvimento

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento com hot-reload
npm run build        # Build para produção
npm run test         # Testes unitários
npm run test:e2e     # Testes end-to-end
npm run lint         # Linting
npm run check:dry    # Verificar violações DRY
npm run check:quality # Verificar qualidade do código
```

### Fluxo de Desenvolvimento
1. Criar branch: `git checkout -b feature/nome-feature`
2. Desenvolver seguindo padrões DDD/Clean
3. Escrever testes (mínimo 80% cobertura)
4. Validar: `npm run lint && npm run test`
5. Commit: `git commit -m "feat(module): descrição"`
6. Push e criar PR

## 📦 Módulos

### Módulos Principais
- **Auth**: Autenticação e autorização (RBAC)
- **Patients**: Gestão de pacientes
- **Appointments**: Sistema de agendamento
- **Anamnesis**: Anamnese digital
- **Consultations**: Gestão de consultas
- **TherapeuticPlans**: Planos com IA
- **Financial**: Pagamentos e split
- **Clinics**: Gestão multi-clínica
- **CrewAI**: Integração com 23 agentes

## 📊 API Documentation

### Swagger
Disponível em desenvolvimento: `http://localhost:3000/api`

### Endpoints Principais
- `POST /auth/login` - Autenticação
- `GET /patients` - Listar pacientes
- `POST /appointments` - Criar agendamento
- `GET /anamnesis/:id` - Buscar anamnese
- `POST /therapeutic-plans` - Gerar plano com IA

## 🧪 Testes

### Executar Testes
```bash
npm run test         # Unitários
npm run test:watch   # Watch mode
npm run test:cov     # Coverage
npm run test:e2e     # End-to-end
```

### Cobertura Mínima
- Unitários: 80%
- Integração: 70%
- E2E: Fluxos críticos

## 🔄 CI/CD

### Pipeline
1. **Lint & Format**: Validação de código
2. **Tests**: Unitários e integração
3. **Build**: Compilação TypeScript
4. **Security**: Scan de vulnerabilidades
5. **Deploy**: Staging → Production

## 📝 Changelog

Veja [CHANGELOG.md](./CHANGELOG.md) para histórico de mudanças.

## 📄 Licença

Proprietary - OnTerapi © 2024. Todos os direitos reservados.

## 🤝 Contribuindo

1. Siga os padrões definidos em `.claude/agent-onterapi.md`
2. Use commits semânticos
3. Mantenha cobertura de testes
4. Atualize documentação

## 📞 Suporte

- Email: dev@onterapi.com.br
- Docs: https://docs.onterapi.com.br

---

*OnTerapi v4 - Desenvolvido com princípios DDD e Clean Architecture*
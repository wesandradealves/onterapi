# 🐳 Docker Setup - OnTerapi Production Simulation

Este setup Docker simula o ambiente de produção localmente, conectando-se ao banco de dados Supabase externo.

## 📋 Pré-requisitos

- Docker Desktop instalado
- Docker Compose v2 ou superior
- Conexão com internet (para acessar Supabase)

## 🚀 Como Usar

### Windows (PowerShell)

```powershell
# Construir a imagem
.\docker-run.ps1 build

# Iniciar os containers
.\docker-run.ps1 up

# Ver logs
.\docker-run.ps1 logs

# Parar containers
.\docker-run.ps1 down

# Limpar tudo
.\docker-run.ps1 clean
```

### Linux/Mac (Bash)

```bash
# Dar permissão de execução
chmod +x docker-run.sh

# Construir a imagem
./docker-run.sh build

# Iniciar os containers
./docker-run.sh up

# Ver logs
./docker-run.sh logs

# Parar containers
./docker-run.sh down

# Limpar tudo
./docker-run.sh clean
```

### Comandos Docker Diretos

```bash
# Construir imagem
docker compose build

# Iniciar em background
docker compose up -d

# Ver logs em tempo real
docker compose logs -f app

# Parar tudo
docker compose down

# Entrar no container
docker compose exec app sh

# Reconstruir do zero
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

## 🔗 URLs de Acesso

Após iniciar os containers:

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Swagger Docs**: http://localhost:3000/api

## 🏗️ Arquitetura

### Dockerfile (Multi-stage Build)

1. **Stage 1 - Builder**: 
   - Compila o TypeScript para JavaScript
   - Instala todas as dependências

2. **Stage 2 - Production**:
   - Imagem Alpine Linux mínima
   - Apenas dependências de produção
   - Usuário não-root para segurança
   - Health check configurado

### Docker Compose

- **App Service**: NestJS rodando na porta 3000
- **Network**: Bridge network isolada
- **Volumes**: Preserva node_modules
- **Health Check**: Verifica /health endpoint
- **Environment**: Variáveis do Supabase

## 🔧 Configuração

### Variáveis de Ambiente

O arquivo `.env` contém todas as variáveis necessárias:

```env
NODE_ENV=production
PORT=3000
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_USERNAME=postgres.ogffdaemylaezxpunmop
DB_PASSWORD=5lGR6N9OyfF1fcMc
DB_DATABASE=postgres
DB_SSL=true
```

### Banco de Dados

Conecta-se ao Supabase Pooler (IPv4):
- Host: `aws-0-sa-east-1.pooler.supabase.com`
- Port: `6543` (pooler port)
- SSL habilitado
- Pooling de conexões configurado
- **Importante**: Usa pooler para garantir IPv4 (funciona em Docker e Vercel)

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs app

# Verificar se a porta 3000 está livre
netstat -an | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac
```

### Erro de conexão com Supabase

1. Verificar credenciais no `.env.docker`
2. Testar conectividade:
```bash
docker compose exec app sh
ping db.ogffdaemylaezxpunmop.supabase.co
```

### Build falha

```bash
# Limpar cache do Docker
docker system prune -af

# Reconstruir sem cache
docker compose build --no-cache
```

### Health check falhando

```bash
# Testar manualmente
docker compose exec app curl http://localhost:3000/health
```

## 📊 Monitoramento

### Ver uso de recursos

```bash
docker stats onterapi-api
```

### Inspecionar container

```bash
docker inspect onterapi-api
```

### Ver processos rodando

```bash
docker compose exec app ps aux
```

## 🔒 Segurança

- Container roda com usuário não-root (`nestjs`)
- Sinais do sistema tratados corretamente com `dumb-init`
- Apenas porta necessária exposta (3000)
- SSL habilitado para conexão com Supabase

## 🎯 Comparação com Produção

| Aspecto | Docker Local | Vercel Production |
|---------|--------------|-------------------|
| Runtime | Node.js 20 Alpine | Node.js 20 Serverless |
| Process Manager | dumb-init | Vercel Runtime |
| Database | Supabase (mesma) | Supabase (mesma) |
| SSL | Sim (DB) | Sim (HTTPS) |
| Scaling | Manual | Automático |
| Logs | Docker logs | Vercel Dashboard |

## 📝 Notas Importantes

1. **Não use em produção real** - Este setup é para desenvolvimento/testes
2. **Credenciais** - As credenciais no `.env.docker` são de desenvolvimento
3. **Performance** - Container local pode ter performance diferente da Vercel
4. **Serverless vs Container** - Vercel usa funções serverless, não containers persistentes

## 🆘 Comandos Úteis

```bash
# Rebuild apenas o app (preserva cache de dependências)
docker compose build app

# Ver tamanho da imagem
docker images | grep onterapi

# Executar comando no container
docker compose exec app npm run migration:run

# Copiar arquivos do container
docker cp onterapi-api:/app/dist ./dist-from-container

# Ver variáveis de ambiente
docker compose exec app env

# Testar conexão com DB
docker compose exec app node -e "console.log('DB_HOST:', process.env.DB_HOST)"
```
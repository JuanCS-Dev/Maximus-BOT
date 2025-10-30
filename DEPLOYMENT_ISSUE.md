# Discord Bot Deployment Issue - Cloud Run + Cloud SQL

## Status: ❌ BLOQUEADO

**Última revisão:** vertice-discord-bot-00022-q4g
**Data:** 2025-10-30 16:10

---

## Problema Identificado

O bot **não consegue conectar ao Cloud SQL** porque o **Cloud SQL Auth Proxy** não consegue acessar a API `sqladmin.googleapis.com`.

### Erro Principal

```
dial tcp 192.168.255.254:443: i/o timeout
Get "https://sqladmin.googleapis.com/sql/v1beta4/projects/projeto-vertice/instances/vertice-bot-db/connectSettings?alt=json&prettyPrint=false"
```

### Causa Raiz

**Cloud Run com Direct VPC Egress + Private Service Connect NÃO FUNCIONA.**

Private Service Connect (PSC) só é suportado por:
- Google Compute Engine (GCE)
- Google Kubernetes Engine (GKE)
- Cloud Functions (algumas regiões)

**Cloud Run NÃO suporta Private Service Connect** mesmo com Direct VPC Egress.

---

## Tentativas Realizadas (Todas Falharam)

### 1. VPC Egress: private-ranges-only
❌ **Falhou:** Bloqueou acesso a IPs públicos incluindo sqladmin.googleapis.com

### 2. VPC Egress: all-traffic
❌ **Falhou:** Ainda dá timeout mesmo com all-traffic

### 3. Private Service Connect
❌ **Falhou:** Cloud Run não suporta PSC. O DNS resolve para 192.168.255.254 mas não roteia

Configuração criada:
```bash
# PSC Address
gcloud compute addresses create google-apis-psc --global \
  --purpose=PRIVATE_SERVICE_CONNECT --addresses=192.168.255.254 \
  --network=default

# PSC Forwarding Rule
gcloud compute forwarding-rules create googleapispsc --global \
  --network=default --address=google-apis-psc \
  --target-google-apis-bundle=all-apis

# Private DNS Zone
gcloud dns managed-zones create googleapis-psc \
  --dns-name="googleapis.com." --networks=default --visibility=private

# DNS Records
gcloud dns record-sets create sqladmin.googleapis.com. --zone=googleapis-psc --type=A --rrdatas=192.168.255.254
gcloud dns record-sets create "*.googleapis.com." --zone=googleapis-psc --type=A --rrdatas=192.168.255.254
```

**Resultado:** Cloud Run consegue resolver o DNS mas não consegue rotear pacotes via PSC.

---

## Configuração Atual

### Cloud Run Service: vertice-discord-bot
- **Região:** us-central1
- **Imagem:** us-central1-docker.pkg.dev/projeto-vertice/vertice-discord-bot/bot:latest
- **Networking:**
  - `--network=default`
  - `--subnet=default`
  - `--vpc-egress=all-traffic`
  - `--add-cloudsql-instances=projeto-vertice:us-central1:vertice-bot-db`
- **Resources:**
  - Memory: 2Gi
  - CPU: 1
  - Min instances: 1
  - Max instances: 1

### Cloud SQL Instance: vertice-bot-db
- **Tipo:** PostgreSQL 16
- **Tier:** db-f1-micro
- **Região:** us-central1
- **Network:** default VPC
- **Status:** ✅ RUNNING

### Redis Instance: vertice-bot-cache
- **Tipo:** Memorystore Redis
- **Tier:** BASIC (1GB)
- **Região:** us-central1
- **Network:** default VPC
- **IP:** 10.55.151.91
- **Status:** ✅ READY

### Secrets Manager
- ✅ DISCORD_TOKEN (72 chars, sem newline)
- ✅ DATABASE_URL (postgresql://vertice:PASSWORD@localhost/vertice_bot?host=/cloudsql/...)
- ✅ REDIS_URL (redis://10.55.151.91:6379)
- ✅ VIRUSTOTAL_API_KEY

### IAM Permissions
- ✅ Service Account: 172846394274-compute@developer.gserviceaccount.com
- ✅ Roles: cloudsql.client, secretmanager.secretAccessor, editor

### APIs Enabled
- ✅ sqladmin.googleapis.com
- ✅ run.googleapis.com
- ✅ compute.googleapis.com
- ✅ redis.googleapis.com
- ✅ secretmanager.googleapis.com

---

## Soluções Possíveis

### Opção 1: Deploy em GKE (Google Kubernetes Engine) ⭐ RECOMENDADO
**Por quê:**
- GKE suporta Private Service Connect
- Suporta Direct VPC connectivity com Cloud SQL
- Maior controle sobre networking
- Melhor para aplicações long-running como Discord bots

**Passos:**
1. Criar cluster GKE na mesma região (us-central1)
2. Habilitar Workload Identity
3. Configurar PSC para Google APIs
4. Deploy via Kubernetes Deployment
5. Conectar via Cloud SQL Auth Proxy sidecar

**Custo:** ~$50-75/mês (cluster pequeno)

### Opção 2: Deploy em GCE (Compute Engine)
**Por quê:**
- Suporta PSC
- Networking completo
- Simples de configurar

**Passos:**
1. Criar VM e2-micro na mesma região
2. Configurar Systemd service para o bot
3. Cloud SQL Auth Proxy como serviço local
4. Conectar via VPC nativo

**Custo:** ~$7-10/mês

### Opção 3: Cloud Run com Cloud SQL PROXY PÚBLICO (WORKAROUND)
**⚠️ NÃO RECOMENDADO - Menos seguro**

Habilitar IP público no Cloud SQL e conectar via proxy público:
- Cloud SQL com IP público + SSL obrigatório
- Conectar sem Unix socket
- Usar `DATABASE_URL` com host IP público

**Custo:** Same Cloud Run cost

### Opção 4: Cloud Run com VPC Access Connector (Já tentado - FALHOU)
❌ VPC Access Connector tem problemas de quota e stability

---

## Recomendação Final

**DEPLOY NO GKE** com a seguinte arquitetura:

```
Discord Bot Container
  ├─ Cloud SQL Auth Proxy (sidecar)
  │   └─ Conecta via Private Service Connect
  ├─ Redis (VPC internal IP)
  └─ Discord API (internet)
```

**Por quê GKE em vez de Cloud Run:**
1. ✅ Suporte nativo a PSC
2. ✅ Melhor para workloads long-running
3. ✅ Discord bots precisam de conexões persistentes
4. ✅ Melhor controle de networking
5. ✅ Suporta sidecars (Cloud SQL Proxy)

---

## Arquivos de Configuração

### cloudbuild.yaml (atual)
- ✅ Build Docker image
- ✅ Push to Artifact Registry
- ✅ Deploy to Cloud Run com all-traffic egress

### Dockerfile
- ✅ Node 22 Debian slim
- ✅ OpenSSL instalado (Prisma)
- ✅ Multi-stage build otimizado

### DATABASE_URL Format
```
postgresql://vertice:VerticeBot2025!Strong@localhost/vertice_bot?host=/cloudsql/projeto-vertice:us-central1:vertice-bot-db&connection_limit=2
```

---

## Próximos Passos

Juan decidirá:
1. **Migrar para GKE** (recomendado) - Eu posso fazer o setup completo
2. **Usar GCE** (simples) - Setup rápido
3. **Aceitar workaround Cloud Run + Public SQL** (não recomendado)

---

## Logs de Referência

**Última tentativa:** 2025-10-30 16:10:00
```
2025/10/30 16:10:00 Cloud SQL connection failed:
failed to get instance metadata:
Get "https://sqladmin.googleapis.com/sql/v1beta4/projects/projeto-vertice/instances/vertice-bot-db/connectSettings":
dial tcp 192.168.255.254:443: i/o timeout
```

**Container crash:** exit(1) após 30s de timeout no Cloud SQL Auth Proxy

---

## Conclusão

**Cloud Run é inadequado para Discord bots que precisam de:**
- Conexões de longa duração (WebSocket Discord)
- Cloud SQL via VPC privada
- Networking complexo

**GKE é a plataforma correta para este workload.**

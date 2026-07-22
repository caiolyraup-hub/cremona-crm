# Deploy na Vercel — Cremona

## Primeiro deploy

### 1. Criar projeto na Vercel

1. Acessar vercel.com → New Project
2. Importar o repositório do GitHub/GitLab
3. Framework Preset: Next.js (detecta automático)
4. Build Command: `npm run build` (padrão)
5. Output Directory: `.next` (padrão)

### 2. Configurar variáveis de ambiente

Em Project Settings → Environment Variables, adicionar TODAS as variáveis abaixo com os valores de **produção**:

```
NEXT_PUBLIC_SUPABASE_URL=       # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Chave anon (pública)
SUPABASE_SERVICE_ROLE_KEY=      # Chave service role (secreta)
WHATSAPP_VERIFY_TOKEN=          # Token que você escolheu para o webhook
WHATSAPP_APP_SECRET=            # App Secret do Meta for Developers
STRIPE_SECRET_KEY=              # sk_live_... em produção
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # pk_live_...
STRIPE_WEBHOOK_SECRET=          # Preenchido após o passo 5
STRIPE_PRICE_STARTER=           # Price ID do plano Starter (Stripe Dashboard)
STRIPE_PRICE_PROFESSIONAL=      # Price ID do plano Profissional (Stripe Dashboard)
NEXT_PUBLIC_APP_URL=            # https://seu-dominio.com
```

> **Atenção:** usar as chaves **live** do Stripe em produção (`sk_live_`, `pk_live_`), não test.

### 3. Fazer o primeiro deploy

Clicar em Deploy. Aguardar o build.
Se falhar, verificar os logs de build — normalmente é variável de ambiente faltando.

### 4. Executar as migrations no Supabase

No Supabase SQL Editor, executar na ordem:

1. `001_initial_schema.sql`
2. `002_soft_delete.sql`
3. `003_search_indexes.sql`
4. `004_dashboard_indexes.sql`
5. `005_onboarding.sql`
6. `006_whatsapp_config.sql`
7. `007_stripe.sql`

O conteúdo de cada arquivo está em `supabase/migrations/`.

### 5. Configurar webhook do Stripe

1. Acessar Stripe Dashboard → Developers → Webhooks
2. Clicar em "Add endpoint"
3. URL: `https://[seu-dominio]/api/stripe/webhook`
4. Selecionar os eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copiar o **Signing secret** (começa com `whsec_...`)
6. Voltar na Vercel → Environment Variables
7. Adicionar `STRIPE_WEBHOOK_SECRET=whsec_...`
8. **Fazer redeploy** para aplicar a variável

### 6. Configurar webhook do WhatsApp

1. Copiar o domínio do deploy: `https://[seu-app].vercel.app` (ou domínio customizado)
2. No Meta for Developers: App → WhatsApp → Configuration → Webhooks
   - Callback URL: `https://[seu-dominio]/api/whatsapp/webhook`
   - Verify Token: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
   - Clicar em "Verify and Save"
3. Selecionar os campos a assinar: `messages`
4. Testar a verificação:
   ```bash
   curl "https://[seu-dominio]/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=[SEU_TOKEN]&hub.challenge=123"
   # Resposta esperada: 123
   ```

### 7. Configurar credenciais WhatsApp por workspace

No produto: Settings → WhatsApp:
- Phone Number ID (do Meta for Developers)
- Business Account ID
- Access Token (token permanente, não temporário)
- Número com DDD

Clicar em "Testar conexão" para validar.

### 8. Verificar o produto

- [ ] Landing page carrega em `https://[seu-dominio]`
- [ ] Criar uma conta nova em `/register`
- [ ] Completar o onboarding
- [ ] Configurar WhatsApp nas Settings
- [ ] Assinar um plano no Stripe (modo live)
- [ ] Verificar se o status do plano atualiza após o webhook

---

## Domínio customizado

Em Vercel → Settings → Domains:
Adicionar o domínio e seguir as instruções de DNS.
A Vercel configura HTTPS automaticamente.

Atualizar `NEXT_PUBLIC_APP_URL` com o domínio real e fazer redeploy.

---

## Redeploy após mudanças

Push para a branch `main` no GitHub/GitLab dispara deploy automático na Vercel.

Para forçar redeploy sem code change:
Vercel Dashboard → Deployments → Redeploy.

---

## Diagnóstico de problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Build falha | Variável env faltando | Verificar logs do build; adicionar a var no painel da Vercel |
| Webhook WhatsApp recusa verificação | `WHATSAPP_VERIFY_TOKEN` diferente do cadastrado na Meta | Confirmar que os dois são idênticos |
| Checkout Stripe retorna erro | `STRIPE_PRICE_STARTER` ou `STRIPE_PRICE_PROFESSIONAL` inválidos | Criar os produtos no Stripe e copiar os Price IDs |
| Plano não atualiza após pagamento | Webhook Stripe não configurado ou `STRIPE_WEBHOOK_SECRET` errado | Refazer o passo 5; verificar logs no Stripe Dashboard |
| Dashboard não carrega | Migration não aplicada | Verificar se todas as 7 migrations foram executadas no Supabase |
| Supabase retorna erro de RLS | Row Level Security bloqueando | Verificar políticas no Supabase Dashboard → Auth → Policies |

---

## Variáveis de ambiente — resumo completo

Ver `.env.local.example` na raiz do projeto para a lista completa com comentários.

Para validar o ambiente antes do deploy:
```bash
npm run pre-deploy
npm run check:whatsapp-env
npm run check:stripe-env
```

## Sprint WhatsApp MVP

### Variaveis adicionais (Sprint WhatsApp)

```bash
CRON_SECRET=[openssl rand -hex 32]
# Protege o endpoint do Vercel Cron
```

### Configurar o Vercel Cron

O arquivo `vercel.json` ja esta configurado. Apos o deploy, verificar em:
Vercel Dashboard -> Project -> Settings -> Cron Jobs.

O cron `process-automation-queue` deve aparecer.

### Testar o cron manualmente

```bash
curl -X GET \
  -H "Authorization: Bearer [CRON_SECRET]" \
  https://[seu-dominio]/api/cron/process-automation-queue
```

Resposta esperada:

```json
{ "processed": 0, "succeeded": 0, "failed": 0, "retrying": 0 }
```

### Executar seed de templates padrao

Apos o deploy e com o workspace configurado:

```bash
npm run seed:templates [WORKSPACE_ID]
```

Isso cria os 3 templates padrao com status `pending`. Marcar como `approved` apos aprovacao no Meta Business Manager.

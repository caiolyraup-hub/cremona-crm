# Spec — Semana 04 Dia 01 — Deploy em Produção

## Objetivo

Deploy real na Vercel e ativação do produto em produção.

---

## Passo a passo do deploy

### 1. Preparar o repositório

```bash
npm run pre-deploy           # checklist completo
npm run build                # confirmar build limpo
npm run check:whatsapp-env   # verificar vars WhatsApp
npm run check:stripe-env     # verificar vars Stripe
git push origin main         # push para o repositório remoto
```

### 2. Criar projeto na Vercel

1. Acessar vercel.com → New Project
2. Importar o repositório
3. Framework: Next.js (auto-detecta)
4. Não alterar Build Command nem Output Directory

### 3. Configurar variáveis de ambiente na Vercel

Em Project Settings → Environment Variables, adicionar todas as vars de `docs/vercel-deploy.md`.
As vars `NEXT_PUBLIC_*` devem ser marcadas para todos os ambientes (Production + Preview + Development).
As demais (secrets) podem ser só Production.

### 4. Primeiro deploy

Aguardar o build na Vercel.
Se falhar, verificar os logs — normalmente é variável env faltando.

### 5. Executar migrations no Supabase

No SQL Editor do Supabase (projeto de produção), executar em ordem:
`001_initial_schema.sql` → `002` → `003` → `004` → `005` → `006` → `007_stripe.sql`

### 6. Configurar webhook do Stripe (live)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://[dominio]/api/stripe/webhook`
3. Eventos: `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copiar Signing Secret → adicionar `STRIPE_WEBHOOK_SECRET` na Vercel → redeploy

### 7. Configurar webhook do WhatsApp

1. Copiar URL do deploy
2. Meta for Developers → App → WhatsApp → Webhooks
3. Callback URL: `https://[dominio]/api/whatsapp/webhook`
4. Verify Token: mesmo valor de `WHATSAPP_VERIFY_TOKEN`
5. Verificar e salvar
6. Testar com:
   ```bash
   curl "https://[dominio]/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=[TOKEN]&hub.challenge=123"
   # Resposta esperada: 123
   ```

### 8. Configurar credenciais WhatsApp por workspace

Entrar no CRM → Settings → WhatsApp:
- Phone Number ID
- Business Account ID
- Access Token (token de sistema permanente)
- Número com DDD

Clicar em "Testar conexão".

### 9. Criar conta de teste

1. Acessar a URL de produção
2. Criar conta nova em `/register`
3. Completar onboarding
4. Assinar um plano (modo live)
5. Verificar se o webhook Stripe atualiza o status do plano

---

## Problemas comuns e diagnóstico

### Build falha na Vercel

**Sintoma:** Build termina com erro
**Causa mais comum:** Variável de ambiente faltando
**Verificar:** Logs do build → procurar por `Error: Variavel de ambiente obrigatoria`
**Solução:** Adicionar a var no painel da Vercel → redeploy

### Webhook WhatsApp rejeita verificação

**Sintoma:** Meta retorna erro ao salvar webhook
**Causa:** `WHATSAPP_VERIFY_TOKEN` diferente entre Vercel e Meta
**Verificar:**
```bash
curl "https://[dominio]/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=[TOKEN]&hub.challenge=abc"
```
**Solução:** Confirmar que os dois valores são idênticos (cuidado com espaços/trailing newline)

### Checkout Stripe retorna 400

**Sintoma:** Erro ao clicar em assinar
**Causa:** `STRIPE_PRICE_STARTER` ou `STRIPE_PRICE_PROFESSIONAL` inválidos
**Verificar:** Abrir o Stripe Dashboard → Products → copiar o Price ID
**Solução:** Atualizar as vars na Vercel → redeploy

### Plano não atualiza após pagamento

**Sintoma:** Pagamento aprovado mas status permanece `trial`
**Causa:** Webhook Stripe não configurado ou `STRIPE_WEBHOOK_SECRET` errado
**Verificar:** Stripe Dashboard → Webhooks → ver eventos recentes
**Solução:** Refazer o passo 6; verificar o Signing Secret

### Supabase RLS bloqueando

**Sintoma:** Queries retornam vazio sem erro aparente
**Verificar:** Supabase Dashboard → Auth → Policies
**Solução:** Verificar se as políticas de RLS estão corretas para o usuário autenticado

---

## Critério de conclusão

- [ ] URL pública acessível e landing page carregando
- [ ] Registro e login funcionando
- [ ] Onboarding completo sem erro
- [ ] Webhook WhatsApp configurado e respondendo
- [ ] Webhook Stripe configurado e respondendo
- [ ] Pelo menos 1 conta criada e 1 plano assinado (modo live)

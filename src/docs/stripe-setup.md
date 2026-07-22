# Setup do Stripe

## Ambiente de teste

### 1. Criar produtos no Stripe Dashboard

1. Acessar dashboard.stripe.com (modo Test ativado)
2. Ir em **Products → Add product**
3. Criar produto **Cremona Starter**:
   - Name: `Cremona Starter`
   - Pricing model: Standard pricing
   - Price: R$ 97,00/mês (recorrente)
   - Currency: BRL
   - Billing period: Monthly
   - Copiar o **Price ID** gerado (`price_xxx`)
   - Colar como valor de `STRIPE_PRICE_STARTER` no `.env.local`
4. Criar produto **Cremona Profissional**:
   - Name: `Cremona Profissional`
   - Price: R$ 147,00/mês
   - Currency: BRL
   - Billing period: Monthly
   - Copiar o Price ID e colocar em `STRIPE_PRICE_PROFESSIONAL`

### 2. Obter as chaves de API

Em **Developers → API keys**:
- Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Secret key → `STRIPE_SECRET_KEY`

### 3. Configurar o webhook local (desenvolvimento)

1. Instalar o Stripe CLI:
   ```
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows (baixar em stripe.com/docs/stripe-cli)
   ```

2. Fazer login:
   ```
   stripe login
   ```

3. Redirecionar eventos para o Next.js local:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copiar o **webhook signing secret** exibido (`whsec_...`) e colocar em:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 4. Variáveis de ambiente completas

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Webhook em produção (Vercel)

1. **Stripe Dashboard → Developers → Webhooks**
2. Clique em **Add endpoint**:
   - URL: `https://[seu-dominio].vercel.app/api/stripe/webhook`
   - Events para escutar:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Clique em **Add endpoint**
4. Copiar o **Signing secret** (whsec_...) e adicionar na Vercel como `STRIPE_WEBHOOK_SECRET`

---

## Cartões de teste

| Número                | Resultado         |
|-----------------------|-------------------|
| 4242 4242 4242 4242   | Pagamento OK      |
| 4000 0000 0000 0002   | Cartão recusado   |
| 4000 0025 0000 3155   | Requer autenticação 3DS |

Data de validade: qualquer data futura  
CVV: qualquer 3 dígitos  
CEP: qualquer 5 dígitos

---

## Fluxo de teste completo

1. Configurar todas as variáveis de ambiente
2. Rodar `npm run check:stripe-env` para verificar
3. Iniciar o Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Rodar `npm run dev`
5. Acessar `/dashboard/settings?tab=plan`
6. Clicar em **Assinar por R$ 147/mês**
7. Usar cartão `4242 4242 4242 4242`
8. Completar o checkout
9. Verificar redirecionamento para `/dashboard?checkout=success`
10. Verificar toast de confirmação
11. Verificar em Supabase: `workspaces.subscription_status = 'active'`

---

## Estados de assinatura

| subscription_status | Significado                     |
|---------------------|---------------------------------|
| trial               | Trial ativo ou não assinado     |
| active              | Assinatura paga e ativa         |
| past_due            | Pagamento falhou, aguardando    |
| canceled            | Assinatura cancelada            |
| unpaid              | Não pago após múltiplas tentativas |

---

## Decisões pendentes

- [ ] Definir quando bloquear acesso após trial expirado
- [ ] Configurar e-mails automáticos do Stripe (invoices, lembretes)
- [ ] Configurar portal de cobrança no Stripe Dashboard
  (Customer Portal → Settings → Enable portal)

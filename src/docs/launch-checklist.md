# Launch Checklist

Última atualização: 2026-05-21

## Infraestrutura

- [x] Domínio configurado e DNS apontando para Vercel — **2026-05-13**
- [x] `NEXT_PUBLIC_APP_URL` definido com URL de produção (sem barra final) — **2026-05-13**
- [x] Variáveis de ambiente configuradas no painel de deploy (ver `.env.local.example`) — **2026-05-13**

## Supabase

- [x] Migration `007_stripe.sql` executada em produção (`supabase db push`) — **2026-05-13**
- [x] Row Level Security revisada para tabelas novas — **2026-05-13**
- [ ] Backup automático ativado
- [ ] Realtime ativado para `messages`, `tasks`, `sales` no Supabase Dashboard

## Stripe

- [ ] Conta Stripe em modo **live** (não test)
- [ ] `STRIPE_SECRET_KEY` atualizada para chave live (`sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` atualizada para chave live (`pk_live_...`)
- [ ] Price IDs de produção criados no Stripe Dashboard
  - [ ] `STRIPE_PRICE_STARTER` — Price ID do plano Starter (live)
  - [ ] `STRIPE_PRICE_PROFESSIONAL` — Price ID do plano Profissional (live)
- [x] Webhook registrado no Stripe Dashboard apontando para `https://<dominio>/api/stripe/webhook` — **2026-05-13**
  - Eventos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [x] `STRIPE_WEBHOOK_SECRET` atualizado com o signing secret do webhook live — **2026-05-13**
- [ ] Teste com `stripe listen` em staging concluído
- [ ] Portal de cobrança configurado (Stripe Dashboard → Billing → Customer portal)

## WhatsApp

- [x] Webhook registrado no Meta → Graph API Explorer — **2026-05-13**
- [x] `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` configurados — **2026-05-13**
- [ ] Número de telefone comercial verificado no Business Manager

## Fluxo de pagamento — validação

- [ ] Checkout completo de ponta a ponta (criar conta → trial → checkout → webhook → status `active`)
- [ ] Portal de cobrança abre e fecha corretamente
- [ ] `past_due` dispara alerta na tela de configurações
- [ ] Cancelamento atualiza status para `canceled`
- [ ] Trial expirado bloqueia acesso e exibe tela de upgrade

## SEO / Landing

- [x] `NEXT_PUBLIC_APP_URL` com URL real para metadata e sitemap — **2026-05-13**
- [x] `app/robots.ts` — `Disallow` cobre `/dashboard/`, `/onboarding/`, `/api/` — **2026-05-13**
- [x] `app/sitemap.ts` — URLs corretas de produção — **2026-05-13**
- [ ] Open Graph testado com [opengraph.xyz](https://opengraph.xyz)
- [ ] Google Search Console — sitemap submetido

## PWA / Favicon

- [x] `app/icon.tsx` — favicon 32×32 gerado via `next/og` — **2026-05-21**
- [x] `app/apple-icon.tsx` — apple touch icon 180×180 — **2026-05-21**
- [x] `app/manifest.ts` — PWA manifest com `display: standalone` — **2026-05-21**

## Qualidade

- [x] `npm run build` sem erros em produção — **2026-05-13**
- [x] TypeScript sem erros (`npx tsc --noEmit`) — **2026-05-13**
- [ ] Responsividade testada em mobile (375 px) e tablet (768 px)
- [x] Fluxo de onboarding testado do zero (conta nova) — **2026-05-13**
- [x] Error boundaries adicionados (`app/(dashboard)/error.tsx`) — **2026-05-21**
- [x] Middleware timeout defensivo (3000ms) adicionado — **2026-05-21**

## Monitoramento

- [x] `docs/monitoring.md` criado com checklist semanal — **2026-05-13**
- [ ] Logs de erro configurados (Sentry, Vercel Logs, ou similar)
- [ ] Alertas de webhook failure no Stripe ativados
- [ ] Uptime monitor configurado

## Vendas

- [x] `docs/demo-script.md` — roteiro de demo (3 min, Loom) — **2026-05-21**
- [x] `scripts/seed-demo-account.ts` — seed de dados demo — **2026-05-21**
- [x] `specs/semana04-plano.md` — plano primeiros 3 clientes pagantes — **2026-05-21**

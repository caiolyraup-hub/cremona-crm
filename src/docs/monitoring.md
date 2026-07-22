# Monitoramento do Cremona

## Vercel

### Onde ver erros
Vercel Dashboard → Functions → Logs
- Filtrar por `/api/whatsapp/webhook`
- Filtrar por `/api/stripe/webhook`
- Qualquer status 4xx/5xx é um problema

### Alertas de build
A Vercel envia e-mail automaticamente se o deploy falhar.
Manter o e-mail da conta monitorado.

---

## Supabase

### Onde ver logs
Supabase Dashboard → Logs → API
- Queries lentas (> 1s)
- Erros de RLS (`42501`)
- Conexões recusadas

### Métricas de banco
Supabase → Reports → Database
- Tamanho do banco (free tier: 500 MB)
- Connections ativas
- Queries por segundo

---

## Stripe

### Onde ver problemas
Stripe Dashboard → Developers → Logs
- Eventos com status `failed`
- Webhooks com retry (indica 5xx na rota)

### Alertas Stripe
Stripe → Settings → Alerts:
- Ativar alerta de **pagamento falho**
- Ativar alerta de **disputa**

---

## WhatsApp / Meta

### Onde ver problemas
Meta for Developers → App → WhatsApp → Webhook Logs

### Sinais de problema
- Usuário reporta que mensagem não chegou na Inbox
- Inbox não atualiza em tempo real
- Badge de não lidas não aparece na sidebar

### Como testar o webhook manualmente
```bash
curl "https://[dominio]/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=[TOKEN]&hub.challenge=123"
# Resposta esperada: 123
```

---

## Checklist semanal

- [ ] Verificar erros na Vercel → Functions → Logs
- [ ] Verificar tamanho do banco no Supabase → Reports
- [ ] Verificar eventos `failed` no Stripe → Developers → Logs
- [ ] Testar envio de mensagem WhatsApp pela Inbox
- [ ] Confirmar que nenhum webhook está em retry

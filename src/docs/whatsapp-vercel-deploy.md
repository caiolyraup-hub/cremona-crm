# Deploy Vercel - WhatsApp Webhook

## Variaveis obrigatorias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

Ver `docs/vercel-deploy.md` para o guia completo de deploy incluindo Stripe e
todas as demais variáveis.

## Passo a passo

1. Fazer deploy na Vercel.
2. Configurar as env vars no projeto.
3. Fazer redeploy depois de configurar as env vars.
4. Executar as migrations no Supabase em ordem (001 a 007).
5. Testar o GET do webhook no domínio Vercel:
   ```bash
   curl "https://[dominio]/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=[TOKEN]&hub.challenge=123"
   # Deve retornar: 123
   ```
6. Configurar o webhook no painel da Meta:
   - Callback URL: `https://[dominio]/api/whatsapp/webhook`
   - Verify Token: mesmo valor de `WHATSAPP_VERIFY_TOKEN`
   - Campos: `messages`
7. Salvar as credenciais do número em `Settings > WhatsApp`.
8. Enviar mensagem de teste pelo sandbox da Meta.
9. Verificar a Inbox no CRM.
10. Conferir os logs na Vercel (Functions → Logs).

## Diagnóstico rápido

- Env var não aplicada → faltou fazer redeploy após configurar
- Middleware bloqueando `/api/whatsapp/webhook` → não deve acontecer (bypass explícito no middleware)
- `WHATSAPP_VERIFY_TOKEN` diferente → confirmar os dois são idênticos
- `WHATSAPP_APP_SECRET` errado → verificar no Meta for Developers → App Settings → Basic
- `whatsapp_phone_number_id` diferente do salvo no workspace → atualizar nas Settings
- Token temporário expirado → trocar por token de sistema permanente
- Supabase Realtime não habilitado → habilitar para a tabela `messages` no Supabase Dashboard

## Scripts de validação local

```bash
npm run check:whatsapp-env    # verifica vars do WhatsApp
npm run check:stripe-env      # verifica vars do Stripe
npm run pre-deploy            # checklist completo pré-deploy
npm run test:webhook          # testa webhook localmente
```

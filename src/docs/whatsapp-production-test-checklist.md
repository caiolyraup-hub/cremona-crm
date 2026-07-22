# Checklist de Teste Real - WhatsApp Meta Cloud API

## Antes do teste

- Vercel deploy realizado
- dominio HTTPS funcionando
- `WHATSAPP_VERIFY_TOKEN` configurado na Vercel
- `WHATSAPP_APP_SECRET` configurado na Vercel
- Supabase conectado
- migrations aplicadas
- Realtime habilitado na tabela `messages`
- workspace com `whatsapp_phone_number_id`
- workspace com `whatsapp_token`
- workspace com `whatsapp_phone`

## Teste de verificacao do webhook

```txt
GET https://SEU-DOMINIO.vercel.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123
```

Resultado esperado:

```txt
123
```

## Teste com script

```bash
WEBHOOK_BASE_URL=https://SEU-DOMINIO.vercel.app npm run test:webhook
```

## Na Meta

- webhook configurado para:
  - `https://SEU-DOMINIO.vercel.app/api/whatsapp/webhook`
- verify token igual ao ambiente
- eventos inscritos:
  - `messages`
  - `message_deliveries`
  - `message_reads`

## Teste no painel Meta

- configurar webhook
- clicar em verificar
- assinar eventos
- enviar mensagem de teste

## Teste de recebimento

- enviar mensagem do numero de teste para o numero sandbox
- confirmar status `200` nos logs
- confirmar contato criado
- confirmar mensagem criada
- confirmar conversa na Inbox
- confirmar realtime em duas abas

## Teste de leitura

- abrir conversa
- confirmar mensagens marcadas como `read`
- confirmar badge reduzindo ou sumindo

## Teste de envio

- enviar mensagem pela Inbox
- confirmar retorno da Meta
- confirmar mensagem outbound salva
- confirmar status inicial `sent`
- confirmar status callback atualizando para `delivered` ou `read`, se disponivel

## Criterio de sucesso

- Meta aceita o webhook
- logs mostram POST recebido
- contato aparece no Supabase
- mensagem aparece na tabela `messages`
- conversa aparece na Inbox

## Problemas comuns

- token expirado
- `phone_number_id` errado
- webhook nao verifica
- assinatura HMAC invalida
- numero fora do sandbox
- janela de 24h
- Realtime nao habilitado
- workspace nao encontrado por `phone_number_id`

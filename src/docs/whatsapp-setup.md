# WhatsApp Cloud API - Setup no Cremona

Este documento descreve como configurar a Meta Cloud API e como preencher os dados dentro do Cremona.

## Pre-requisitos

- Conta no Facebook Business Manager
- App criado em `developers.facebook.com`
- Produto WhatsApp adicionado ao app
- Numero de telefone exclusivo para o negocio
- Dominio com HTTPS publico, de preferencia Vercel
- Variaveis de ambiente configuradas no projeto

## Passo a passo na Meta

1. Criar um app em `developers.facebook.com`.
2. Escolher o tipo `Business`.
3. Adicionar o produto `WhatsApp` ao app.
4. Usar o numero de teste da Meta para sandbox inicial.
5. Gerar um token temporario para teste no painel da Meta.
6. Configurar o webhook:
   - URL: `https://SEU-DOMINIO.vercel.app/api/whatsapp/webhook`
   - Verify Token: valor de `WHATSAPP_VERIFY_TOKEN`
7. Inscrever os eventos:
   - `messages`
   - `message_deliveries`
   - `message_reads`
8. Para producao:
   - verificar a empresa no Business Manager
   - adicionar um numero real
   - gerar um `System User Token` permanente
   - salvar o token por workspace, nunca em variavel publica

## Configuracao no Cremona

Depois de criar o app da Meta, abra `Settings > WhatsApp` no Cremona e preencha:

- `Phone Number ID`
- `WhatsApp Business Account ID`, se estiver disponivel
- `Numero WhatsApp`
- `Token de acesso`

Como o Cremona salva esses dados:

- `workspaces.whatsapp_phone_number_id`
- `workspaces.whatsapp_business_account_id`
- `workspaces.whatsapp_phone`
- `workspaces.whatsapp_token`

O token e salvo por workspace e nunca deve ser enviado para o frontend.

## Como testar conexao

Na aba `Settings > WhatsApp`, use o botao `Salvar e testar conexao`.

Esse fluxo:

1. salva os campos do workspace;
2. chama a Meta Graph API em `GET /v18.0/[PHONE_NUMBER_ID]`;
3. valida se o token e o `Phone Number ID` respondem com sucesso;
4. mostra erro amigavel se houver problema.

## Webhook

Endpoint:

- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`

Comportamento:

- o `GET` confirma a verificacao inicial da Meta usando `hub.challenge`
- o `POST` recebe payloads da Meta
- a assinatura `x-hub-signature-256` e validada quando `WHATSAPP_APP_SECRET` estiver configurado
- o workspace e procurado primeiro por `whatsapp_phone_number_id`
- se nao houver match, o codigo tenta fallback por `whatsapp_phone`

Configuracao recomendada na Meta:

- URL em producao:
  - `https://SEU-DOMINIO.vercel.app/api/whatsapp/webhook`
- Verify Token:
  - `WHATSAPP_VERIFY_TOKEN`
- Eventos:
  - `messages`
  - `message_deliveries`
  - `message_reads`

## Teste local

Opcionalmente configure:

```bash
WEBHOOK_BASE_URL=http://localhost:3000
```

Para simular uma mensagem inbound:

```bash
npm run test:webhook
```

O script:

- testa o `GET /api/whatsapp/webhook` com `hub.challenge`
- monta um payload fake da Meta
- gera a assinatura HMAC SHA256
- envia `POST` para `/api/whatsapp/webhook`
- imprime status e body da resposta

Para validar apenas o ambiente local:

```bash
npm run check:whatsapp-env
```

## Seguranca

- a Meta exige HTTPS publico para o webhook real
- `localhost` nao serve para webhook real da Meta
- nunca commite token real no repositorio
- nunca exponha `whatsapp_token` no frontend
- use `System User Token` permanente em producao
- o webhook deve responder rapido, idealmente em menos de 5 segundos

## Guias complementares

- `docs/whatsapp-vercel-deploy.md`
- `docs/whatsapp-production-test-checklist.md`
- `docs/whatsapp-troubleshooting.md`

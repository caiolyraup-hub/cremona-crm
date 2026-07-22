# Troubleshooting - WhatsApp Meta Cloud API no Cremona

## Webhook nao verifica

Possiveis causas:

- `WHATSAPP_VERIFY_TOKEN` diferente do token configurado na Meta
- rota errada
- deploy sem HTTPS
- variavel de ambiente nao configurada na Vercel
- middleware bloqueando `/api/whatsapp/webhook`

## POST retorna 403

Possiveis causas:

- `WHATSAPP_APP_SECRET` incorreto
- assinatura `x-hub-signature-256` invalida
- body alterado antes da validacao HMAC

## Mensagem chega na Meta mas nao aparece na Inbox

Possiveis causas:

- workspace nao encontrado pelo `phone_number_id`
- `whatsapp_phone_number_id` nao salvo no workspace
- erro de RLS
- contato nao criado
- mensagem duplicada
- Realtime nao habilitado

## Contato nao e criado

Possiveis causas:

- telefone vindo em formato diferente
- normalizacao inconsistente
- constraints no banco
- `workspace_id` ausente

## Envio falha

Possiveis causas:

- token expirado
- `phone_number_id` errado
- numero fora do sandbox
- contato sem telefone
- janela de 24h expirada
- falta de permissao no app Meta

## Badge nao atualiza

Possiveis causas:

- mensagens ja estao como `read`
- `revalidatePath` nao chamado
- layout nao busca count atualizado
- realtime local nao refaz query

## Realtime nao funciona

Possiveis causas:

- tabela `messages` sem Realtime habilitado
- filtro por workspace errado
- subscription nao esta sendo limpa
- Supabase client nao inicializado corretamente

## Checklist rapido

- conferir variaveis
- conferir `Settings > WhatsApp`
- rodar script local
- conferir tabela `messages`
- conferir tabela `contacts`
- conferir logs do webhook
- abrir `/dashboard/inbox`
- testar em duas abas

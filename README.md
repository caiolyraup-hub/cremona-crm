# Cremona

CRM via WhatsApp para micro e pequenos empresarios brasileiros.

## Stack

- Next.js 14 + App Router + TypeScript
- TailwindCSS + shadcn/ui + Base UI
- Supabase: banco, auth, storage e realtime
- framer-motion
- Recharts
- @dnd-kit
- sonner
- Meta Cloud API para WhatsApp

## Setup local

```bash
git clone <repo-url>
cd cremona
npm install
cp .env.local.example .env.local
```

Preencha no `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WEBHOOK_BASE_URL`, opcional para os scripts locais

Observacoes:

- `WHATSAPP_VERIFY_TOKEN` valida o `GET /api/whatsapp/webhook`
- `WHATSAPP_APP_SECRET` valida a assinatura `x-hub-signature-256` no `POST`
- o token de acesso da Meta nao e global
- o token da Meta fica salvo por workspace em `workspaces.whatsapp_token`
- depois de alterar env vars na Vercel, faca redeploy

## Migrations

Execute no Supabase SQL Editor, nesta ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_soft_delete.sql`
3. `supabase/migrations/003_search_indexes.sql`
4. `supabase/migrations/004_dashboard_indexes.sql`
5. `supabase/migrations/005_onboarding.sql`
6. `supabase/migrations/006_whatsapp_config.sql`

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run check:whatsapp-env
npm run test:webhook
npm run test:whatsapp-window
npm run test:automation-migration
npm run test:automation-queue
npm run test:automation-concurrency
```

## Automacoes - fila duravel

Todas as automacoes disparadas por `contact_created`, `stage_enter` e `stage_exit`
sao registradas em `automation_queue`. O motor `lib/automations/engine.ts`
nao executa mais chamadas externas diretamente.

Regras atuais:

- `delay_minutes = 0` tambem cria job `pending`, com `scheduled_for` no momento atual.
- `delay_minutes > 0` cria job `pending`, com `scheduled_for = agora + delay`.
- cada job recebe uma `event_key` deterministica:
  `contact_created:{contact_id}:{automation_id}`,
  `stage_enter:{contact_id}:{stage_id}:{automation_id}` ou
  `stage_exit:{contact_id}:{stage_id}:{automation_id}`.
- `automation_queue_event_key_unique` impede duplicidade quando `event_key` nao e nula; duplicatas sao ignoradas como resultado idempotente.
- o cron existente em `/api/cron/process-automation-queue` e o unico responsavel por executar a acao.
- o worker adquire um job com `UPDATE ... WHERE status = pending AND scheduled_for <= now AND attempts < max_attempts RETURNING *`; ele so executa WhatsApp/tarefas quando a linha adquirida e retornada.
- cada execucao do cron gera um `workerId` unico e grava `locked_at`, `locked_by` e `last_attempt_at` ao fazer claim.
- sucesso, falha definitiva e retry so atualizam jobs ainda em `status = processing` e `locked_by = workerId`.
- antes de executar, o worker valida que job, automacao e contato pertencem ao mesmo `workspace_id`.
- falhas transitorias voltam para `pending` com exponential backoff em `scheduled_for`; falhas permanentes encerram o job como `failed`.
- backoff padrao: `min(baseSeconds * 2 ** max(0, attempt - 1), maxSeconds)`, com defaults `60s` e `1800s`.
- o lease padrao e `300s`; jobs `processing` com `locked_at` expirado sao recuperados antes de novos claims.
- jobs antigos em `processing` sem `locked_at` so sao recuperados por regra conservadora de antiguidade, para evitar tocar jobs recentes.
- `max_attempts` do proprio job e a unica fonte de verdade; nao ha limite hardcoded de 3 no worker.
- nenhuma automacao ativa e resultado valido: nenhum job e criado e a operacao principal continua.
- erro ao buscar automacoes ou inserir jobs na fila e tratado como falha de registro duravel; a Server Action retorna erro ao usuario e registra contexto seguro (`event_type`, `workspace_id`, `contact_id`, `stage_id`, ids de automacao quando houver).

Classificacao de erros:

- `skipped = true` e tratado como nao retryable.
- erros de validacao/configuracao, contato sem telefone, telefone invalido, workspace sem provedor, template ausente, automacao inexistente, acao desconhecida, conflito de workspace e janela de 24h fechada encerram o job sem retry.
- timeouts, falha de conexao, HTTP 429 e HTTP 500/502/503/504 podem ser reagendados ate `max_attempts`.
- quando a acao nao informa `retryable`, erros inesperados sao tratados como retryable ate esgotar `max_attempts`.

Limitacoes conhecidas:

- rollback da idempotencia: `DROP INDEX IF EXISTS automation_queue_event_key_unique;` e `ALTER TABLE automation_queue DROP COLUMN IF EXISTS event_key;`.
- nao ha garantia exactly-once apos chamar APIs externas: se o provedor aceitar a mensagem e a funcao cair antes de persistir a resposta, um retry pode gerar duplicidade externa.
- `task_overdue` existe em tipos/UI, mas ainda nao possui produtor de evento.
- proximo passo: adaptador Twilio e webhooks Twilio sem misturar com a fila.

Variaveis server-side da fila:

```env
AUTOMATION_RETRY_BASE_SECONDS=60
AUTOMATION_RETRY_MAX_SECONDS=1800
AUTOMATION_JOB_LEASE_SECONDS=300
```

Comandos Vercel para o proprietario executar manualmente:

```bash
npx vercel link
npx vercel env add AUTOMATION_RETRY_BASE_SECONDS production
npx vercel env add AUTOMATION_RETRY_MAX_SECONDS production
npx vercel env add AUTOMATION_JOB_LEASE_SECONDS production
```

## WhatsApp - arquitetura

Fluxo atual:

1. A Meta envia eventos para `GET/POST /api/whatsapp/webhook`.
2. O `GET` valida `hub.verify_token` e retorna `hub.challenge` em texto puro.
3. O `POST` le o body bruto e valida HMAC com `WHATSAPP_APP_SECRET`.
4. Em desenvolvimento, o `POST` aceita teste sem app secret; em producao, nao.
5. O workspace e resolvido primeiro por `whatsapp_phone_number_id` e depois por fallback em `whatsapp_phone`.
6. O contato e encontrado ou criado por telefone.
7. A mensagem inbound e salva em `messages`.
8. Uma activity do tipo `whatsapp` e criada.
9. A Inbox em `/dashboard/inbox` le `messages`.
10. Realtime atualiza lista, historico e badge.
11. O envio basico usa a Meta Cloud API e persiste outbound no CRM via Server Action.
12. O envio livre agora respeita a janela de atendimento de 24 horas da Meta.

## WhatsApp - variaveis

```env
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WEBHOOK_BASE_URL=http://localhost:3000
```

Regras:

- `WHATSAPP_VERIFY_TOKEN` e obrigatorio para a verificacao do webhook
- `WHATSAPP_APP_SECRET` e obrigatorio para producao
- `WEBHOOK_BASE_URL` e usado apenas pelos scripts de teste
- o token de acesso da Meta fica em `Settings > WhatsApp`, por workspace, e nao no frontend

## WhatsApp - teste local e producao

### Check de ambiente

```bash
npm run check:whatsapp-env
```

### Teste manual do GET local

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123"
```

Resposta esperada:

```txt
123
```

### Teste por script local

```bash
WEBHOOK_BASE_URL=http://localhost:3000 npm run test:webhook
```

O script testa:

- GET de verificacao com `hub.challenge`
- POST fake de texto
- POST fake de midia
- POST fake de status callback
- resumo `OK` ou `FAIL` no terminal
- status e body apenas quando algum teste falha

### Teste por script em producao

```bash
WEBHOOK_BASE_URL=https://SEU-DOMINIO.vercel.app npm run test:webhook
```

### Onde olhar os resultados

- no terminal do script, para ver `OK` ou `FAIL`
- nos logs do servidor Next.js
- na tabela `messages`
- na Inbox em `/dashboard/inbox`

## WhatsApp - Vercel

Para o primeiro teste real:

1. Fazer deploy em ambiente HTTPS.
2. Configurar `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` na Vercel.
3. Fazer redeploy.
4. Preencher credenciais reais em `Settings > WhatsApp`.
5. Testar o `GET /api/whatsapp/webhook` no dominio publicado.
6. Configurar o webhook no painel da Meta.
7. Seguir o checklist de producao.

Teste manual do GET:

```bash
curl "https://SEU-DOMINIO.vercel.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123"
```

Teste por script:

```bash
WEBHOOK_BASE_URL=https://SEU-DOMINIO.vercel.app npm run test:webhook
```

Guias:

- `docs/whatsapp-vercel-deploy.md`
- `docs/whatsapp-production-test-checklist.md`
- `docs/whatsapp-troubleshooting.md`
- `docs/whatsapp-setup.md`
- `docs/whatsapp-test-report-template.md`

## WhatsApp - configuracao por workspace

Campos salvos em `workspaces`:

- `whatsapp_phone_number_id`
- `whatsapp_business_account_id`
- `whatsapp_phone`
- `whatsapp_token`

Fluxo:

1. Abrir `Settings > WhatsApp`.
2. Preencher `Phone Number ID`.
3. Preencher `Numero WhatsApp`.
4. Opcionalmente preencher `WhatsApp Business Account ID`.
5. Informar token apenas se ainda nao existir um salvo.
6. Usar `Salvar configuracoes` ou `Salvar e testar conexao`.

Regras importantes:

- o token nunca e exposto para client components
- o client recebe apenas `has_whatsapp_token`
- quando o token ja existe, a interface mostra apenas mascara
- use System User Token permanente em producao

## WhatsApp - diagnostico

O diagnostico tecnico fica em `Settings > WhatsApp`.

Ele mostra:

- `WHATSAPP_VERIFY_TOKEN`: configurado ou ausente
- `WHATSAPP_APP_SECRET`: configurado ou ausente
- `Phone Number ID`: configurado ou ausente
- `Numero WhatsApp`: configurado ou ausente
- `Token de acesso`: configurado ou ausente
- webhook sugerido para copiar na Meta
- ultimo resultado local de teste de conexao, quando existir

Regras:

- tokens e app secret nunca sao exibidos
- o diagnostico mostra apenas status booleano

## WhatsApp - janela de 24 horas

A Meta permite mensagens livres por ate 24 horas apos a ultima mensagem inbound do cliente.

No Cremona:

- cada conversa usa a ultima mensagem inbound como referencia da janela;
- a Inbox mostra `Janela 24h aberta`, `Janela 24h fechada` ou `Sem janela ativa`;
- quando restam 60 minutos ou menos, a Inbox sinaliza a expiracao de forma discreta;
- quando a janela fecha, o envio livre e bloqueado antes da chamada para a Meta;
- o usuario recebe orientacao de que templates serao necessarios.

Detalhes tecnicos:

- `lib/whatsapp/conversation-window.ts`
- `docs/whatsapp-24h-window-and-templates.md`
- `scripts/test-whatsapp-window.ts`

## WhatsApp - Inbox

Rota:

- `/dashboard/inbox`

Recursos atuais:

- lista de conversas por contato
- historico ordenado por `created_at`
- agrupamento visual por dia
- estilos distintos para inbound e outbound
- placeholders visuais para `image`, `audio`, `document`, `video` e `location`
- Realtime em `messages`
- marcacao como lida ao abrir conversa
- badge verde de nao lidas na sidebar
- status visual da janela de 24h na conversa selecionada
- envio basico de texto quando o workspace estiver configurado e a janela estiver aberta
- mock visual de `Enviar template` apenas quando a janela estiver fechada ou inexistente

## WhatsApp - envio

Requisitos:

- `whatsapp_phone_number_id` configurado
- `whatsapp_token` configurado
- contato com telefone valido

Escopo atual:

- envia mensagens de texto simples
- salva outbound em `messages`
- cria activity do tipo `whatsapp`
- atualiza status quando a Meta envia `statuses`
- bloqueia envio livre quando a janela de 24h estiver fechada
- ainda nao cobre templates
- ainda nao cobre download completo de midia

## WhatsApp - templates

Templates ainda nao estao implementados.

Eles serao necessarios para mensagens fora da janela de 24 horas e para fluxos ativos do CRM.

Na Inbox, o botao `Enviar template` aparece apenas como mock visual desabilitado quando a janela estiver fechada ou inexistente.

Roadmap atual:

- `docs/whatsapp-24h-window-and-templates.md`
- `docs/whatsapp-templates-roadmap.md`

## WhatsApp - midia

O Cremona reconhece tipos de midia recebidos no webhook e exibe placeholders na Inbox.

Estado atual:

- `image`: placeholder com caption quando existir;
- `audio`: placeholder com aviso de reproducao futura;
- `document`: placeholder com nome do arquivo quando existir;
- `video`: placeholder com aviso de preview futuro;
- `location`: placeholder com nome/endereco quando existir.

Download e preview real ainda ficarao para uma sprint futura.

## WhatsApp - historico do contato

Mensagens e eventos relevantes do WhatsApp tambem geram `activities` no contato.

Isso mantem o historico comercial centralizado e deixa claro quando houve:

- mensagem recebida;
- mensagem enviada;
- recebimento de imagem, audio, documento, video ou localizacao;
- falha de entrega relevante.

## Tarefas - prazos personalizados

O modulo de Tarefas agora aceita prazos personalizados via calendario no quick add e no modal completo.

Regras atuais:

- o prazo e salvo em `tasks.due_date` como data local no formato `YYYY-MM-DD`;
- tarefas podem continuar sem prazo quando o fluxo permitir;
- criar e editar tarefas com datas futuras funciona no quick add, no modal completo e na edicao;
- filtros como `Hoje`, `Esta semana` e `Vencidas` continuam funcionando;
- a normalizacao foi ajustada para evitar mudanca de dia por timezone.

## Arquivos importantes

- `app/api/whatsapp/webhook/route.ts`
- `middleware.ts`
- `lib/whatsapp/env.ts`
- `lib/whatsapp/meta-api.ts`
- `lib/whatsapp/errors.ts`
- `lib/whatsapp/format.ts`
- `lib/whatsapp/logger.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `lib/whatsapp/conversation-window.ts`
- `lib/whatsapp/queries.ts`
- `app/(dashboard)/dashboard/inbox/page.tsx`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `app/(dashboard)/dashboard/settings/actions.ts`
- `components/inbox/*`
- `components/settings/whatsapp-settings.tsx`
- `scripts/check-whatsapp-env.ts`
- `scripts/test-webhook.ts`

## Documentacao

- `docs/whatsapp-setup.md`
- `docs/whatsapp-vercel-deploy.md`
- `docs/whatsapp-production-test-checklist.md`
- `docs/whatsapp-troubleshooting.md`
- `docs/whatsapp-test-report-template.md`
- `docs/whatsapp-24h-window-and-templates.md`
- `docs/whatsapp-templates-roadmap.md`

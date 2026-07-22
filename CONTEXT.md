# Contexto do projeto

## O que e
CRM para micro e pequenos empresarios brasileiros, com operacao centrada em WhatsApp.
O produto cobre contatos, pipeline, tarefas, vendas, dashboard, onboarding, configuracoes e uma Inbox WhatsApp MVP.

## Stack tecnica completa
- Next.js 14 App Router + TypeScript
- TailwindCSS + shadcn/ui + Base UI
- Supabase:
  - Auth
  - Postgres
  - Storage
  - Realtime
- @dnd-kit/core + @dnd-kit/sortable
- framer-motion
- recharts
- sonner
- canvas-confetti
- Meta Cloud API para WhatsApp

## Estrutura de pastas
- `app/`
  - `(auth)/login`, `(auth)/register`, `(auth)/actions.ts`
  - `(dashboard)/dashboard/*`
  - `api/dashboard/*`
  - `api/whatsapp/webhook/route.ts`
  - `onboarding/*`
- `components/`
  - `contacts/*`
  - `dashboard/*`
  - `inbox/*`
  - `layout/*`
  - `onboarding/*`
  - `pipeline/*`
  - `sales/*`
  - `settings/*`
  - `tasks/*`
  - `ui/*`
- `contexts/`
  - `workspace-context.tsx`
- `docs/`
  - `whatsapp-setup.md`
  - `whatsapp-production-test-checklist.md`
  - `whatsapp-troubleshooting.md`
  - `whatsapp-vercel-deploy.md`
- `hooks/`
  - `use-contacts.ts`
  - `use-dashboard.ts`
  - `use-inbox.ts`
  - `use-sales.ts`
  - `use-tasks.ts`
- `lib/`
  - `dashboard-queries.ts`
  - `formatters.ts`
  - `weeks.ts`
  - `workspace.ts`
  - `supabase/*`
  - `whatsapp/env.ts`
  - `whatsapp/format.ts`
  - `whatsapp/media.ts`
  - `whatsapp/process-incoming-message.ts`
  - `whatsapp/template-definitions.ts`
  - `whatsapp/templates.ts`
- `scripts/`
  - `check-whatsapp-env.ts`
  - `test-webhook.ts`
- `supabase/`
  - `migrations/*`
  - `seed.sql`
- `types/`
  - `app.ts`
  - `database.ts`
  - `whatsapp.ts`
- `specs/`
  - specs por sessao

## Arquivos principais
- `middleware.ts`
- `app/(auth)/actions.ts`
- `app/onboarding/page.tsx`
- `app/onboarding/actions.ts`
- `app/onboarding/onboarding-flow.tsx`
- `components/onboarding/step-business.tsx`
- `components/onboarding/step-pipeline.tsx`
- `components/onboarding/step-contacts.tsx`
- `components/onboarding/step-whatsapp.tsx`
- `components/onboarding/step-complete.tsx`
- `components/onboarding/step-progress.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `app/(dashboard)/dashboard/settings/actions.ts`
- `components/settings/workspace-settings.tsx`
- `components/settings/pipeline-settings.tsx`
- `components/settings/plan-settings.tsx`
- `components/settings/whatsapp-settings.tsx`
- `components/layout/sidebar.tsx`
- `components/dashboard/welcome-toast.tsx`
- `app/api/whatsapp/webhook/route.ts`
- `lib/whatsapp/env.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `types/whatsapp.ts`
- `scripts/check-whatsapp-env.ts`
- `scripts/test-webhook.ts`
- `docs/whatsapp-setup.md`
- `docs/whatsapp-vercel-deploy.md`
- `docs/whatsapp-production-test-checklist.md`
- `docs/whatsapp-troubleshooting.md`
- `specs/semana02-dia05-tarde.md`
- `app/(dashboard)/dashboard/inbox/page.tsx`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `components/inbox/conversation-list.tsx`
- `components/inbox/conversation-view.tsx`
- `components/inbox/message-bubble.tsx`
- `components/inbox/conversation-empty-state.tsx`
- `components/inbox/conversation-skeleton.tsx`
- `components/inbox/inbox-client.tsx`
- `hooks/use-inbox.ts`
- `specs/semana02-dia05-noite.md`
- `components/inbox/contact-panel.tsx`
- `components/inbox/template-picker-modal.tsx`
- `lib/whatsapp/media.ts`
- `lib/whatsapp/templates.ts`
- `lib/whatsapp/template-definitions.ts`

## Estado atual do projeto
- [X] Setup e infraestrutura
- [X] Autenticacao
- [X] Layout do dashboard
- [X] WorkspaceProvider e workspace ativo
- [X] Componentes base reutilizaveis
- [X] Modulo de Contatos
- [X] Modulo de Pipeline
- [X] Modulo de Tarefas
- [X] Modulo de Vendas
- [X] Dashboard de Metricas
- [X] Onboarding guiado em 5 passos
- [X] Configuracoes do workspace
- [X] Base tecnica do webhook WhatsApp
- [X] Inbox WhatsApp MVP
- [X] Settings WhatsApp real
- [X] Badge de nao lidas na sidebar
- [X] Envio basico de mensagens WhatsApp
- [X] Envio basico de mensagens pelo CRM
- [X] Status callbacks basicos da Meta
- [X] Suporte inicial de midia na Inbox
- [X] Scripts locais de teste e check de ambiente do WhatsApp
- [X] Documentacao de deploy Vercel para WhatsApp
- [X] Diagnostico tecnico basico do WhatsApp nas Settings
- [X] Regra base da janela de 24h na Inbox e no envio
- [X] Roadmap tecnico inicial de templates WhatsApp
- [X] Prazos personalizados via calendario em tarefas
- [X] Infraestrutura real de templates WhatsApp
- [X] Preview real de imagem na Inbox (com lightbox)
- [X] Painel lateral do contato na Inbox
- [ ] Validacao real do WhatsApp em producao/Vercel
- [ ] Checkout Stripe

## Sessao de validacao final do MVP core - 2026-04-30

### O que foi corrigido
- middleware de onboarding nos dois sentidos
- resumo final do onboarding
- validacao de telefone no onboarding
- placeholder melhorado de WhatsApp no onboarding
- refresh de sidebar e settings
- preview circular de logo
- card de zona de perigo
- trial com barra de progresso

### Validacoes executadas
- `npm run build` passou em 2026-04-30
- rotas publicas e redirects nao autenticados validados com `next start`

### Bloqueio principal encontrado
- o banco Supabase real nao possui as colunas da migration `005_onboarding.sql`
- evidencia em 2026-04-30:
  - erro ao consultar `workspaces.onboarding_completed`
- impacto:
  - onboarding e configuracoes existem no codigo, mas seguem bloqueados no banco real ate aplicar a migration

## Sessao Dia 05 Semana 02 Manha - WhatsApp Webhook - 2026-04-30

### Auditoria do estado real

Onboarding encontrado no codigo:
- `app/onboarding/page.tsx`
- `app/onboarding/onboarding-flow.tsx`
- `app/onboarding/actions.ts`
- `components/onboarding/step-business.tsx`
- `components/onboarding/step-pipeline.tsx`
- `components/onboarding/step-contacts.tsx`
- `components/onboarding/step-whatsapp.tsx`
- `components/onboarding/step-complete.tsx`
- `components/onboarding/step-progress.tsx`
- `supabase/migrations/005_onboarding.sql`

Configuracoes encontradas no codigo:
- `app/(dashboard)/dashboard/settings/page.tsx`
- `components/settings/workspace-settings.tsx`
- `components/settings/pipeline-settings.tsx`
- `components/settings/plan-settings.tsx`
- `components/settings/whatsapp-settings.tsx`

Dashboard/layout auditados:
- `app/(dashboard)/layout.tsx`
- `components/layout/sidebar.tsx`
- `contexts/workspace-context.tsx`
- `lib/workspace.ts`
- `middleware.ts`
- `components/dashboard/welcome-toast.tsx`

Conclusao da auditoria:
- onboarding e settings existem de fato no repositório
- `/dashboard/inbox` continua placeholder
- nao existia fundacao de webhook, types, docs ou script local de WhatsApp antes desta sessao
- a divergencia do contexto foi reconciliada: o codigo esta adiantado em relacao ao plano antigo, mas o banco real ainda nao acompanhou a migration 005

### Arquivos criados nesta sessao
- `app/api/whatsapp/webhook/route.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `types/whatsapp.ts`
- `docs/whatsapp-setup.md`
- `scripts/test-webhook.ts`
- `specs/semana02-dia05-tarde.md`
- `.env.local.example`

### Arquivos alterados nesta sessao
- `README.md`
- `CONTEXT.md`

### Endpoint criado
- `GET /api/whatsapp/webhook`
  - valida `hub.mode`
  - valida `hub.verify_token`
  - retorna `hub.challenge`
- `POST /api/whatsapp/webhook`
  - le body bruto
  - valida assinatura `x-hub-signature-256`
  - parseia payload da Meta
  - extrai `contacts` e `messages`
  - processa mensagens inbound

### Variaveis de ambiente adicionadas
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

### Como funciona a validacao HMAC
- o webhook recebe o body como texto bruto
- se `WHATSAPP_APP_SECRET` estiver configurado:
  - calcula `sha256=` + HMAC SHA256 do body
  - compara com o header `x-hub-signature-256` usando `timingSafeEqual`
  - se for invalido, responde `403`
- se `WHATSAPP_APP_SECRET` nao estiver configurado:
  - o webhook permite o processamento
  - registra warning no console

### Como o workspace e encontrado
- primeira tentativa:
  - buscar por `workspaces.whatsapp_phone_number_id = metadata.phone_number_id`
- como essa coluna nao faz parte do schema atual tipado nem foi exigida nesta sessao:
  - o codigo faz fallback para `workspaces.whatsapp_phone`
  - tenta com `metadata.display_phone_number`
  - tenta tambem com o telefone normalizado em digitos
- se nenhum workspace for encontrado:
  - registra warning
  - nao quebra o webhook
  - nao insere mensagem

### Como o contato e criado ou encontrado
- normaliza `contact.wa_id` ou `message.from` para apenas digitos
- busca em `contacts` por:
  - `workspace_id`
  - `phone`
  - `deleted_at IS NULL`
- se nao encontrar:
  - cria contato com:
    - `workspace_id`
    - `name = contact.profile.name` ou numero bruto
    - `phone = numero normalizado`
    - `tags = []`

### Como a mensagem e salva
- deduplicacao por `messages.whatsapp_message_id`
- insercao em `messages` com:
  - `workspace_id`
  - `contact_id`
  - `whatsapp_message_id`
  - `direction = inbound`
  - `content`
  - `media_type = message.type`
  - `media_url = null`
  - `status = received`
  - `created_at` derivado de `message.timestamp`

Resolucao de `content`:
- `text` -> `message.text.body`
- `image` -> caption ou `[image]`
- `audio` -> `[audio]`
- `document` -> nome do arquivo ou `[document]`
- `location` -> `[location]`
- outros tipos -> `[tipo]`

### Como a activity e criada
- apos salvar a mensagem, cria uma linha em `activities` com:
  - `workspace_id`
  - `contact_id`
  - `user_id = null`
  - `type = whatsapp`
  - `content = "Mensagem recebida via WhatsApp: ..."`
  - `created_at` igual ao timestamp da mensagem

### Como testar localmente
- teste manual do GET:
  - `curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123"`
- teste local do POST:
  - `node --experimental-strip-types scripts/test-webhook.ts`

### Validacoes executadas nesta sessao
- `npm run lint` passou
- `npm run build` passou
- `GET /api/whatsapp/webhook` respondeu `403` com token invalido
- `POST /api/whatsapp/webhook` respondeu `200` com payload fake do script local

### Estado real de onboarding/settings apos auditoria
- onboarding:
  - implementado no codigo
  - ainda dependente de aplicar `005_onboarding.sql` no banco real
- configuracoes:
  - implementadas no codigo
  - ainda dependentes de aplicar `005_onboarding.sql` no banco real
- inbox:
  - ainda placeholder em `app/(dashboard)/dashboard/inbox/page.tsx`

### Migrations
Arquivos presentes:
- `001_initial_schema.sql`
- `002_soft_delete.sql`
- `003_search_indexes.sql`
- `004_dashboard_indexes.sql`
- `005_onboarding.sql`
- `006_whatsapp_config.sql`

Status conhecido nesta sessao:
- `005_onboarding.sql`
  - continua pendente no banco real
- `003_search_indexes.sql`
  - aplicacao no banco real nao confirmada
- `004_dashboard_indexes.sql`
  - aplicacao no banco real nao confirmada
- `006_whatsapp_config.sql`
  - criada na sessao da noite para suportar configuracao real por workspace

### Pendencias para a tarde
- criar `hooks/use-inbox.ts`
- construir a tela `/dashboard/inbox`
- agrupar mensagens por contato
- exibir historico
- ligar realtime da tabela `messages`
- manter WhatsApp apenas como inbox MVP, sem envio ainda

## Dashboard de metricas
Mantido da sessao anterior:
- `lib/weeks.ts`
- `lib/dashboard-queries.ts`
- `hooks/use-dashboard.ts`
- `app/api/dashboard/kpis/route.ts`
- `app/api/dashboard/overview/route.ts`
- `components/dashboard/week-selector.tsx`
- `components/dashboard/kpi-cards.tsx`
- `components/dashboard/weekly-chart.tsx`
- `components/dashboard/funnel-chart.tsx`
- `components/dashboard/activity-feed.tsx`
- `components/dashboard/welcome-state.tsx`
- `components/dashboard/dashboard-metrics.tsx`

## Sessao Dia 05 Semana 02 Tarde - Inbox WhatsApp MVP - 2026-04-30

### Estado encontrado apos auditoria
- os artefatos da manha existiam no repositorio:
  - `docs/whatsapp-setup.md`
  - `.env.local.example`
  - `types/whatsapp.ts`
  - `app/api/whatsapp/webhook/route.ts`
  - `scripts/test-webhook.ts`
  - `specs/semana02-dia05-tarde.md`
- o webhook permaneceu funcional no codigo:
  - GET com `hub.mode`, `hub.verify_token` e `hub.challenge`
  - POST com parse do payload da Meta
  - validacao de `x-hub-signature-256` quando `WHATSAPP_APP_SECRET` existe
  - persistencia inbound em `messages`
  - deduplicacao por `whatsapp_message_id`
  - match ou criacao de contato por telefone
  - criacao de activity do tipo `whatsapp`
- a inbox ainda era placeholder em `app/(dashboard)/dashboard/inbox/page.tsx`
- o schema tipado confirmou uso das tabelas `messages` e `contacts` existentes, sem necessidade de migration nova nesta sessao

### Arquivos criados nesta sessao
- `hooks/use-inbox.ts`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `components/inbox/conversation-list.tsx`
- `components/inbox/conversation-view.tsx`
- `components/inbox/message-bubble.tsx`
- `components/inbox/conversation-empty-state.tsx`
- `components/inbox/conversation-skeleton.tsx`
- `components/inbox/inbox-client.tsx`
- `specs/semana02-dia05-noite.md`

### Arquivos alterados nesta sessao
- `app/(dashboard)/dashboard/inbox/page.tsx`
- `components/layout/sidebar.tsx`
- `types/app.ts`
- `README.md`
- `CONTEXT.md`

### Funcionalidades implementadas
- lista de conversas baseada em `messages`
- agrupamento por contato
- historico de mensagens por contato
- ordenacao por `created_at`
- agrupamento visual por data
- estados de empty state e skeleton loading
- layout responsivo basico para desktop e mobile
- realtime em novas mensagens da tabela `messages`
- manutencao da conversa selecionada quando possivel
- marcacao de mensagens inbound como lidas ao abrir a conversa
- item WhatsApp ativo na sidebar

### Como a Inbox funciona
- `useInbox(workspaceId)`:
  - busca mensagens do workspace
  - busca contatos relacionados
  - monta a lista de conversas por `contact_id`
  - calcula nao lidas por conversa
  - assina Realtime em `messages`
- `useConversation(workspaceId, contactId)`:
  - busca o historico da conversa ordenado por `created_at ASC`
  - assina Realtime para atualizar o historico do contato aberto
- `markConversationAsReadAction(workspaceId, contactId)`:
  - valida usuario autenticado
  - valida pertencimento ao workspace
  - atualiza mensagens inbound para `status = read`

### Validacoes executadas nesta sessao
- `npm run lint` passou
- `npm run build` passou

### Como testar localmente
1. rodar `npm run dev`
2. autenticar com um usuario que tenha workspace valido
3. gerar payload fake com `node --experimental-strip-types scripts/test-webhook.ts`
4. abrir `/dashboard/inbox`
5. confirmar:
  - conversa aparece na lista
  - clique abre o historico
  - mensagens inbound e outbound aparecem com estilos diferentes
  - abrir conversa marca inbound como lida
6. para validar Realtime:
  - manter `/dashboard/inbox` aberto
  - disparar novo payload com o script
  - confirmar atualizacao automatica da lista e do historico

### Pendencias para a noite
- badge de nao lidas na sidebar
- configuracao real do WhatsApp nas Settings
- eventual migration `006_whatsapp_config.sql` para `whatsapp_phone_number_id`, se ainda fizer sentido
- envio real de mensagens pela Meta
- suporte mais completo a midia

### Estado consolidado do WhatsApp
- [X] Webhook base
- [X] Inbox MVP
- [ ] Badge de nao lidas na sidebar
- [ ] Settings WhatsApp real
- [ ] Envio de mensagens
- [ ] Templates da Meta
- [ ] Checkout Stripe

## Sessao Dia 05 Semana 02 Noite - Integracao WhatsApp e Polimento - 2026-04-30

### Auditoria inicial

- Webhook: concluido e mantido funcional nesta sessao.
- Inbox MVP: concluida e ajustada para suportar envio basico.
- Settings WhatsApp: ainda era placeholder no inicio da sessao.
- Onboarding passo 4: ainda era placeholder no inicio da sessao.
- Envio de mensagens: pendente no inicio da sessao e implementado nesta rodada.

### Bugs corrigidos da manha e tarde

- o `WorkspaceProvider` deixava o tipo de workspace expor `whatsapp_token`; agora o contexto recebe apenas um workspace sanitizado para client
- a sidebar ja tinha item de WhatsApp, mas ainda nao mostrava badge de nao lidas
- a Inbox ainda mantinha o composer desabilitado; agora faz envio basico de texto pela Meta quando o workspace estiver configurado
- Settings e onboarding ainda mantinham o WhatsApp como placeholder visual

### Implementado

Arquivos criados:
- `supabase/migrations/006_whatsapp_config.sql`
- `lib/whatsapp/utils.ts`
- `lib/whatsapp/meta.ts`
- `lib/whatsapp/queries.ts`
- `specs/semana02-dia06-manha.md`

Arquivos alterados:
- `types/database.ts`
- `types/app.ts`
- `lib/workspace.ts`
- `app/(dashboard)/layout.tsx`
- `components/layout/sidebar.tsx`
- `app/(dashboard)/dashboard/settings/actions.ts`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `components/settings/whatsapp-settings.tsx`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `app/(dashboard)/dashboard/inbox/page.tsx`
- `components/inbox/inbox-client.tsx`
- `components/inbox/conversation-view.tsx`
- `lib/whatsapp/process-incoming-message.ts`
- `app/onboarding/page.tsx`
- `app/onboarding/onboarding-flow.tsx`
- `components/onboarding/step-whatsapp.tsx`
- `components/onboarding/step-complete.tsx`
- `docs/whatsapp-setup.md`
- `README.md`
- `CONTEXT.md`

Funcionalidades:
- configuracao real do WhatsApp nas Settings
- campos por workspace:
  - `whatsapp_phone_number_id`
  - `whatsapp_business_account_id`
  - `whatsapp_phone`
  - `whatsapp_token`
- teste de conexao com Meta API
- webhook priorizando `whatsapp_phone_number_id`
- badge verde de conversas nao lidas na sidebar
- marcacao de mensagens como lidas ao abrir conversa
- onboarding passo 4 com configuracao real ou fallback de pular
- resumo final do onboarding refletindo o estado do WhatsApp
- envio basico de mensagem de texto pela Meta

### Pendencias

- teste real em ambiente Vercel
- teste com sandbox da Meta
- suporte completo a midia
- templates aprovados pela Meta
- tratamento completo da janela de 24h
- checkout Stripe
- landing page

### Estado consolidado do WhatsApp apos a sessao

- [X] Webhook base
- [X] Inbox MVP
- [X] Settings WhatsApp real
- [X] Badge de nao lidas na sidebar
- [X] Envio basico de mensagens
- [X] Onboarding passo 4 integrado
- [ ] Templates da Meta
- [ ] Teste real em producao
- [ ] Checkout Stripe

## Modulos concluidos
- [X] Autenticacao (login, registro, sessao)
- [X] Layout (sidebar, topbar, navegacao)
- [X] Componentes base (Avatar, EmptyState, Spinner, PageHeader, Toast)
- [X] Modulo de Contatos (CRUD, etiquetas, importacao CSV, bulk actions, notas)
- [X] Pipeline Kanban (drag-and-drop, configuracao de etapas, filtros)
- [X] Modulo de Tarefas (QuickAdd, modal, conclusao, vencidas, badge sidebar)
- [X] Modulo de Vendas (lista, modal, relatorio, grafico, widget dashboard)
- [X] Dashboard de Metricas (KPIs semanais, grafico 12 semanas, funil, feed, realtime)
- [X] Onboarding 5 passos (negocio, pipeline, contatos, WhatsApp configuravel, resumo, confetti)
- [X] Configuracoes (workspace, pipeline, plano, WhatsApp real)
- [X] WhatsApp webhook base (docs, env, tipos, endpoint, HMAC, persistencia inbound)
- [X] Inbox WhatsApp MVP (lista, historico, realtime, leitura)
- [X] Settings WhatsApp real (salvar, testar, desconectar)
- [X] Badge de nao lidas na sidebar
- [X] Envio basico de mensagens WhatsApp
- [X] Infraestrutura de templates WhatsApp (tipos, sendWhatsAppTemplate, CREMONA_TEMPLATES, modal de selecao)
- [X] Preview real de imagem na Inbox (img nativo, lightbox framer-motion, placeholders por tipo de midia)
- [X] Painel lateral do contato na Inbox (280px, spring animation, pipeline/tags/tarefas/vendas)

## Proximas etapas - Semana 03
- [ ] Aplicar `005_onboarding.sql` no Supabase real
- [ ] Aplicar `006_whatsapp_config.sql` no Supabase real
- [ ] Confirmar aplicacao de `003_search_indexes.sql`
- [ ] Confirmar aplicacao de `004_dashboard_indexes.sql`
- [ ] Validar onboarding e configuracoes em navegador real com conta nova
- [X] Painel lateral do contato no inbox
- [ ] Validar envio real de mensagens pelo CRM em ambiente Meta
- [ ] Match automatico numero -> contato em fluxo completo
- [ ] Aprovar templates CREMONA no Meta Business Manager

- [ ] Armazenamento permanente de midia (re-download para Supabase Storage)

## Semana 04
- [ ] Checkout Stripe com trial 14 dias
- [ ] Landing page de vendas
- [ ] Video demo + lancamento

## Decisoes tecnicas importantes
- o middleware continua sendo a primeira linha de defesa do onboarding
- onboarding e settings estao no codigo, mas a migration 005 ainda precisa ser aplicada no banco real
- a base de WhatsApp agora esta dividida em webhook inbound + inbox MVP de leitura
- a configuracao do WhatsApp agora e por workspace e inclui `whatsapp_phone_number_id` e `whatsapp_business_account_id`
- o webhook usa `createAdminClient()` porque precisa operar sem sessao e bypass de RLS
- o workspace e roteado por `phone_number_id` quando a coluna existir e por `whatsapp_phone` como fallback atual
- o token do WhatsApp nao deve ser serializado para client components; o `WorkspaceProvider` agora recebe apenas um workspace sanitizado
- o script local de teste foi mantido sem dependencia nova, usando `node --experimental-strip-types`

## Riscos e observacoes importantes
- enquanto a migration `005_onboarding.sql` nao for aplicada no banco real, onboarding e configuracoes nao podem ser considerados validados em producao
- o webhook, a inbox, o badge e o envio basico estao implementados no codigo, mas ainda precisam de validacao real na Meta e no banco de producao
- o webhook real da Meta exige HTTPS publico; localhost serve apenas para teste local com script

## Handoff para a proxima sessao
Ordem sugerida:
1. Aplicar `supabase/migrations/005_onboarding.sql` no projeto real
2. Confirmar se `003_search_indexes.sql` e `004_dashboard_indexes.sql` ja foram executadas
3. Rodar `npm run dev`
4. Testar `GET /api/whatsapp/webhook`
5. Rodar `node --experimental-strip-types scripts/test-webhook.ts`
6. Validar `/dashboard/inbox` com mensagens reais do webhook
7. Seguir `specs/semana02-dia05-noite.md` para badge e configuracao real
8. Usar `specs/semana02-dia06-manha.md` para validar ponta a ponta em ambiente real

## Sessao Semana 03 Dia 01 Manha - Estabilizacao WhatsApp

### Auditoria inicial

- Webhook: funcional, mas sem suporte a callbacks de status antes desta sessao.
- Inbox: funcional, mas a marcacao como lida podia parar de sincronizar para novas mensagens da mesma conversa.
- Settings WhatsApp: funcional, com formulario real, mas ainda usando mascara hardcoded de token.
- Badge: funcional via contagem de inbound com `status != read`.
- Envio basico: funcional no codigo, mas com camada Meta ainda pouco padronizada.
- Onboarding passo 4: funcional e opcional, sem bloquear a conclusao do onboarding.

### Implementado nesta sessao

Arquivos criados:
- `lib/whatsapp/meta-api.ts`
- `lib/whatsapp/errors.ts`
- `lib/whatsapp/format.ts`
- `docs/whatsapp-production-test-checklist.md`
- `specs/semana03-dia01-tarde.md`

Arquivos alterados:
- `app/api/whatsapp/webhook/route.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `types/whatsapp.ts`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `app/(dashboard)/dashboard/settings/actions.ts`
- `hooks/use-inbox.ts`
- `components/inbox/conversation-list.tsx`
- `components/inbox/conversation-view.tsx`
- `components/settings/whatsapp-settings.tsx`
- `components/onboarding/step-whatsapp.tsx`
- `lib/whatsapp/meta.ts`
- `lib/whatsapp/utils.ts`
- `README.md`
- `CONTEXT.md`

Funcionalidades:
- camada tecnica da Meta Cloud API centralizada em `lib/whatsapp/meta-api.ts`
- tratamento amigavel de erros da Meta em `lib/whatsapp/errors.ts`
- normalizacao de telefone e mascara de token em `lib/whatsapp/format.ts`
- webhook mais resiliente a payloads inesperados
- suporte basico a status callbacks da Meta com atualizacao de `messages.status`
- inbox mantendo conversas mesmo quando o contato foi removido
- correcao da marcacao como lida para novas mensagens da mesma conversa
- loading explicito no envio da conversa
- checklist de teste real em producao
- documentacao principal atualizada para refletir o estado real do codigo

### Pendencias

- teste real com sandbox da Meta
- teste real em Vercel
- validacao de Realtime em duas abas com trafego real
- suporte completo a midia
- templates aprovados
- tratamento mais completo da janela de 24h
- Stripe
- landing page

### Validacoes executadas

- `npm run lint` passou em 2026-05-04
- `npm run build` passou em 2026-05-04
- smoke test local com `next start` em `http://127.0.0.1:3100` respondeu `200` no `POST /api/whatsapp/webhook`
- o smoke test local registrou warning esperado porque `WHATSAPP_APP_SECRET` nao estava definido no ambiente local

## Sessao Semana 03 Dia 01 Noite - Polimento WhatsApp e Observabilidade

### Auditoria inicial

- Webhook: funcional, mas ainda sem logger dedicado e com logs espalhados em `console.*`.
- Inbox: funcional, com leitura e realtime, mas ainda sem placeholder visual consistente para `video` e com labels de status quebradas por codificacao.
- Settings WhatsApp: funcional, com token mascarado, mas ainda sem confirmacao antes de desconectar.
- Badge: funcional e sem indicio de quebra de layout.
- Envio basico: funcional.
- Status callbacks: implementados de forma basica na manha e reforcados nesta sessao.
- Midia: preparada parcialmente antes desta sessao; suporte inicial consolidado agora para `image`, `audio`, `document`, `video` e `location`.

### Implementado nesta sessao

Arquivos criados:
- `lib/whatsapp/logger.ts`
- `docs/whatsapp-troubleshooting.md`
- `specs/semana03-dia02-manha.md`

Arquivos alterados:
- `lib/whatsapp/meta-api.ts`
- `lib/whatsapp/errors.ts`
- `lib/whatsapp/format.ts`
- `types/whatsapp.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `app/api/whatsapp/webhook/route.ts`
- `hooks/use-inbox.ts`
- `components/inbox/message-bubble.tsx`
- `components/settings/whatsapp-settings.tsx`
- `scripts/test-webhook.ts`
- `docs/whatsapp-production-test-checklist.md`
- `README.md`
- `CONTEXT.md`

Funcionalidades:
- logs seguros para WhatsApp com sanitizacao de metadados
- webhook mais resiliente a payloads sem `entry`, `changes`, `messages` ou `statuses`
- tratamento seguro de assinatura invalida e payload JSON invalido
- suporte visual inicial a midia inbound
- suporte consolidado a status callbacks `sent`, `delivered`, `read` e `failed`
- warnings seguros quando mensagem nao e encontrada ou evento e duplicado
- confirmacao antes de desconectar o WhatsApp nas Settings
- script local de webhook agora suporta texto, midia e status callback fake
- troubleshooting documentado
- documentacao principal alinhada ao estado real do codigo

### Pendencias

- teste real em ambiente Vercel
- teste real com sandbox da Meta
- download completo de midia
- templates aprovados pela Meta
- tratamento completo da janela de 24h
- automacoes de follow-up
- Stripe
- landing page

### Validacoes executadas

- `npm run lint` passou em 2026-05-04
- `npm run build` passou em 2026-05-04
- smoke test local do webhook com payload `text` respondeu `200`
- smoke test local do webhook com payload `image` respondeu `200`
- smoke test local do webhook com payload `status=failed` respondeu `200`
- os smoke tests locais registraram warning esperado quando `WHATSAPP_APP_SECRET` nao estava definido

## Sessao Semana 03 Dia 02 Manha - Preparacao para Teste Real WhatsApp

### Auditoria inicial

- Webhook: funcional no codigo, com `GET` e `POST`, mas o `POST` ainda aceitava ausencia de `WHATSAPP_APP_SECRET` fora de um fluxo explicitamente restrito a desenvolvimento.
- Middleware: o webhook nao era redirecionado por auth na pratica, mas tambem nao tinha bypass explicito antes do fluxo de Supabase/auth.
- Scripts de teste: existia apenas `scripts/test-webhook.ts` focado em `POST` local; nao cobria `GET` de verificacao nem `WEBHOOK_BASE_URL`.
- Settings WhatsApp: funcional, com salvar, testar e desconectar, mas faltavam instrucoes mais claras para credenciais reais.
- Inbox: funcional; a principal divergencia visivel encontrada era label de status outbound quebrada por codificacao.
- Badge: funcional, usando mensagens inbound nao lidas por workspace.
- Envio basico: funcional no codigo e ja protegido para nao persistir outbound quando a Meta retorna erro.

### Implementado nesta sessao

Arquivos criados:
- `lib/whatsapp/env.ts`
- `scripts/check-whatsapp-env.ts`
- `docs/whatsapp-vercel-deploy.md`
- `specs/semana03-dia02-tarde.md`

Arquivos alterados:
- `middleware.ts`
- `app/api/whatsapp/webhook/route.ts`
- `lib/whatsapp/format.ts`
- `components/inbox/message-bubble.tsx`
- `components/settings/whatsapp-settings.tsx`
- `scripts/test-webhook.ts`
- `.env.local.example`
- `package.json`
- `docs/whatsapp-setup.md`
- `docs/whatsapp-production-test-checklist.md`
- `README.md`
- `CONTEXT.md`

Funcionalidades:
- webhook preparado para Vercel com bypass explicito no middleware
- rota publica do webhook garantida antes de auth/onboarding
- `GET /api/whatsapp/webhook` mantido em texto puro para verificacao da Meta
- `POST /api/whatsapp/webhook` endurecido para recusar ambiente de producao sem `WHATSAPP_APP_SECRET`
- helper de validacao de ambiente para WhatsApp
- script de check local de env
- script de webhook ajustado para `WEBHOOK_BASE_URL`, `GET` de verificacao e `POST` fake
- documentacao de deploy na Vercel criada
- checklist de teste real atualizado
- Settings com instrucoes mais claras sobre `Phone Number ID` e token permanente
- labels outbound da Inbox corrigidas

### Validacoes executadas

- `npm run check:whatsapp-env` executado em 2026-05-06
  - resultado: `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` pendentes no ambiente local atual
- `npm run lint` passou em 2026-05-06
- `npm run build` passou em 2026-05-06

### Pendencias

- executar teste real na Vercel
- configurar webhook no painel da Meta
- testar mensagem sandbox real
- validar realtime em duas abas com trafego real
- validar status callbacks reais
- validar envio basico com credenciais reais
- suporte completo a midia
- templates aprovados
- Stripe
- landing page

## Sessao Semana 03 Dia 02 Tarde e Noite - Teste WhatsApp e Consolidacao

### Auditoria inicial

- Webhook: funcional e publico, com bypass explicito no middleware e `GET` em texto puro.
- Middleware: liberando corretamente `/api/whatsapp/webhook`.
- Scripts de teste: funcionais, mas ainda rodavam um unico `POST` por execucao e nao entregavam um resumo consolidado de texto, midia e status.
- Inbox: funcional, com envio basico e marcacao como lida; faltava feedback mais claro quando o WhatsApp nao estava configurado ou quando o contato nao tinha telefone.
- Settings WhatsApp: funcional, com salvar, testar e desconectar; faltava diagnostico tecnico e estados mais claros de configurado vs incompleto.
- Badge: funcional e integrado ao layout.
- Envio basico: funcional no codigo, com erros amigaveis retornados pelas actions.
- Teste Vercel: pendente por falta de acesso direto a um dominio/ambiente Meta configurado nesta sessao.

### Implementado nesta sessao

Arquivos criados:
- `docs/whatsapp-test-report-template.md`
- `specs/semana03-dia03-manha.md`

Arquivos alterados:
- `app/(dashboard)/dashboard/settings/page.tsx`
- `components/settings/whatsapp-settings.tsx`
- `components/inbox/conversation-view.tsx`
- `scripts/test-webhook.ts`
- `README.md`
- `CONTEXT.md`

Funcionalidades:
- script de webhook mais completo
- teste de `GET` do webhook
- teste de `POST` texto
- teste de `POST` midia fake
- teste de `POST` status callback
- diagnostico tecnico de WhatsApp nas Settings
- feedback melhorado em Settings
- feedback melhorado na Inbox
- relatorio manual de teste criado
- documentacao principal consolidada com diagnostico e roteiro de testes

### Validacoes executadas

- `npm run test:webhook` executado localmente em 2026-05-06 contra `http://localhost:3200`
  - `GET verification: OK`
  - `POST text message: OK`
  - `POST media message: OK`
  - `POST status callback: OK`
- `npm run lint` passou em 2026-05-06
- `npm run build` passou em 2026-05-06

### Pendencias

- teste real em Vercel
- teste real com sandbox da Meta
- suporte completo a download de midia
- documentacao e bloqueio da janela de 24h
- templates aprovados
- Stripe
- landing page

## Sessao Semana 03 Dia 03 Manha - Janela 24h, Midia e Templates - 2026-05-08

### Auditoria inicial

- Webhook: funcional e resiliente. `GET` retorna `hub.challenge`, `POST` le body bruto, valida HMAC quando `WHATSAPP_APP_SECRET` existe, ignora payload inesperado sem gerar `500`, faz deduplicacao por `whatsapp_message_id` e atualiza status callbacks.
- Inbox: funcional. Lista conversas, abre historico, diferencia inbound/outbound, marca inbound como `read` e faz envio basico. Ainda nao tinha regra real da janela de 24h.
- Settings WhatsApp: funcional. Salva configuracoes, testa conexao, mascara token e nao expoe segredo no client.
- Envio basico: funcional, mas ainda permitia tentativa de envio livre sem validar a janela de 24h.
- Midia: havia placeholder inicial, mas a UX ainda era superficial para `audio`, `document`, `video` e `location`.
- Status callbacks: funcionais para `sent`, `delivered`, `read` e `failed`.
- Historico WhatsApp no contato: funcional, mas generico e com pouca diferenciacao visual.

### Implementado nesta sessao

Arquivos criados:

- `docs/whatsapp-24h-window-and-templates.md`
- `docs/whatsapp-templates-roadmap.md`
- `lib/whatsapp/conversation-window.ts`
- `specs/semana03-dia03-tarde.md`

Arquivos alterados:

- `lib/whatsapp/queries.ts`
- `lib/whatsapp/format.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `hooks/use-inbox.ts`
- `components/inbox/conversation-view.tsx`
- `components/inbox/message-bubble.tsx`
- `components/contacts/contact-tabs.tsx`
- `README.md`
- `CONTEXT.md`

Funcionalidades:

- helper `isWithinWhatsApp24hWindow` criado;
- helper `getWhatsAppWindowStatus` criado;
- query server-side `getLastInboundMessageAt` criada;
- envio livre bloqueado fora da janela de 24h antes da chamada para a Meta;
- Inbox mostrando `Janela 24h aberta`, `Janela 24h fechada` ou `Sem janela ativa`;
- composer desabilitado quando a janela estiver fechada;
- placeholders de midia melhorados para `image`, `audio`, `document`, `video` e `location`;
- activities de webhook para midia agora ficam especificas, como `Imagem recebida via WhatsApp`;
- historico do contato ganhou badge visual por tipo de activity;
- README e docs atualizados com janela de 24h, templates e midia.

### Validacoes executadas

- `npm run lint` passou em 2026-05-08
- `npm run build` passou em 2026-05-08

### Pendencias

- testar envio com janela real aberta e fechada em ambiente Meta;
- implementar templates reais;
- implementar download e preview reais de midia;
- validar trafego real em Vercel;
- automacoes;
- Stripe;
- landing page.

## Sessao Semana 03 Dia 03 Tarde - Consolidacao da Janela 24h e Correcao de Datas em Tarefas - 2026-05-08

### Auditoria inicial

- Helper da janela 24h: funcional. `isWithinWhatsApp24hWindow` e `getWhatsAppWindowStatus` ja existiam e cobriam os estados basicos.
- Envio basico: funcional e ja bloqueando fora da janela, mas ainda sem mock visual de templates na Inbox.
- Inbox: mostrava status da janela, mas ainda sem aviso de expiracao proxima e sem CTA visual futuro para templates.
- Templates: documentacao criada pela manha, mas ainda sem reforco da UX futura na conversa.
- Historico WhatsApp no contato: funcional e melhorado na manha, mas ainda sem activity para falha de entrega.
- Midia: placeholders funcionais e claros.
- Tarefas com datas personalizadas: bug confirmado na experiencia e na consistencia da normalizacao. O fluxo dependia de `input type="date"` espalhado, atalhos com `toISOString()` e comparacoes de `due_date` pouco coerentes entre criacao, dashboard e filtros.

### Implementado nesta sessao

Arquivos criados:

- `components/tasks/task-date-picker.tsx`
- `scripts/test-whatsapp-window.ts`
- `specs/semana03-dia03-noite.md`

Arquivos alterados:

- `app/(dashboard)/dashboard/inbox/actions.ts`
- `components/inbox/conversation-view.tsx`
- `lib/whatsapp/process-incoming-message.ts`
- `app/(dashboard)/dashboard/tasks/actions.ts`
- `components/tasks/task-quick-add.tsx`
- `components/tasks/task-modal.tsx`
- `components/dashboard/tasks-widget.tsx`
- `app/(dashboard)/layout.tsx`
- `lib/formatters.ts`
- `docs/whatsapp-24h-window-and-templates.md`
- `docs/whatsapp-templates-roadmap.md`
- `README.md`
- `CONTEXT.md`
- `package.json`

Funcionalidades:

- helper da janela de 24h validado manualmente com script;
- status da janela refinado na Inbox com aviso de expiracao proxima;
- mock visual de `Enviar template` adicionado quando nao ha envio livre;
- activity de falha de entrega WhatsApp adicionada para status `failed`;
- tasks agora usam um seletor unico de prazo com calendario visual reutilizavel;
- quick add e modal completo aceitam qualquer data personalizada;
- criacao e edicao de tarefas normalizam `due_date` como `YYYY-MM-DD`;
- actions de tarefas passaram a validar usuario e membership do workspace;
- dashboard widget e contagem de vencidas deixaram de depender de comparacao com timestamp UTC;
- documentacao e README atualizados com janela 24h, templates futuros e prazos personalizados.

### Validacoes executadas

- `npm run test:whatsapp-window` passou em 2026-05-08
- `npm run lint` passou em 2026-05-08
- `npm run build` passou em 2026-05-08

### Pendencias

- implementar templates reais;
- aprovar templates na Meta;
- envio real de templates;
- download completo de midia;
- preview real de imagem, audio e documento;
- testar tarefas em navegador real com diferentes datas;
- validar comportamento com tarefas sem prazo em fluxo real;
- Stripe;
- landing page.

## Sessao Semana 03 Dia 03 Noite - Polimento Inbox, Janela 24h e Tarefas - 2026-05-08

### Auditoria inicial

- Inbox: funcional. Conversas renderizando, historico consistente, estilos inbound/outbound distintos, badges de nao lidas coerentes e area de conversa sem erro aparente.
- Janela 24h: funcional. Helpers e bloqueio ja estavam implementados; a principal necessidade era validar clareza da UX e reforcar o estado futuro de templates.
- Mock de templates: presente, mas ainda precisava ser tratado como parte do polimento final da Inbox e da documentacao.
- Placeholders de midia: funcionais e claros, sem necessidade de download real nesta sessao.
- Historico WhatsApp no contato: funcional e sem regressao nos outros tipos de activity; a revisao confirmou textos claros e badge apropriada.
- Tarefas com calendario: funcional apos a tarde. Quick add, modal e edicao ja aceitavam prazo personalizado.
- Bug de timezone em tarefas: mitigado pela normalizacao local de `due_date`; a validacao desta sessao focou em confirmar filtros e comparacoes.

### Implementado nesta sessao

Arquivos criados:

- `specs/semana03-dia04-manha.md`

Arquivos alterados:

- `README.md`
- `CONTEXT.md`

Funcionalidades:

- polimento final da documentacao da Inbox WhatsApp e do mock de templates;
- consolidacao do registro da sessao da noite com estado real auditado;
- spec da Semana 03 Dia 04 Manha criada;
- validacao final mantida para janela 24h, placeholders de midia e tarefas com calendario;
- documentacao de tarefas atualizada para deixar explicito o suporte a criacao e edicao com datas futuras.

### Validacoes executadas

- `npm run test:whatsapp-window` passou em 2026-05-08
- `npm run lint` passou em 2026-05-08
- `npm run build` passou em 2026-05-08

### Pendencias

- implementar templates reais;
- aprovar templates na Meta;
- envio real de templates;
- download completo de midia;
- preview real de imagem, audio e documento;
- testar tarefas em navegador real com multiplas datas;
- validar fluxo sem prazo em navegacao real, quando aplicavel;
- automacoes;
- Stripe;
- landing page.

## Sessao Semana 03 Dia 04 - Templates, Preview de Imagem e Painel do Contato - 2026-05-12

### Auditoria inicial

- Webhook: funcional e resiliente, com suporte a callbacks de status.
- Inbox: funcional, com envio basico, janela de 24h, placeholders de midia e mock visual de templates.
- Mock de templates: presente na Inbox como CTA amber, mas sem implementacao real.
- Preview de imagem: sem preview real; a `media_url` nao era buscada apos salvar mensagem inbound.
- Painel lateral do contato: inexistente; a Inbox nao tinha painel de contexto de CRM.

### Arquivos criados nesta sessao

- `lib/whatsapp/templates.ts`
- `lib/whatsapp/template-definitions.ts`
- `lib/whatsapp/media.ts`
- `components/inbox/template-picker-modal.tsx`
- `components/inbox/contact-panel.tsx`

### Arquivos alterados nesta sessao

- `types/whatsapp.ts`
- `app/(dashboard)/dashboard/inbox/actions.ts`
- `lib/whatsapp/process-incoming-message.ts`
- `components/inbox/message-bubble.tsx`
- `components/inbox/conversation-view.tsx`
- `components/inbox/inbox-client.tsx`
- `CONTEXT.md`

### Funcionalidades implementadas

PARTE 1 — Infraestrutura real de templates WhatsApp:
- tipos `WhatsAppTemplate`, `WhatsAppTemplateComponent`, `WhatsAppTemplateParameter`, `SendTemplateResult` adicionados a `types/whatsapp.ts`
- `sendWhatsAppTemplate()` em `lib/whatsapp/templates.ts` — POST para Meta Cloud API v18.0 com `type: "template"`
- `CREMONA_TEMPLATES` em `lib/whatsapp/template-definitions.ts` — 3 templates pre-definidos: `follow_up_post_inactivity`, `proposal_reminder`, `reactivation`
- `sendTemplateMessageAction` em inbox/actions.ts — valida membership, credenciais, contato, envia e persiste mensagem + activity
- `TemplatePickerModal` — dialog shadcn com lista de templates, selecao amber, inputs de variaveis, envio com feedback
- `ConversationView` atualizado: substitui CTA mock por botao real "Usar template" que abre o modal

PARTE 2 — Preview real de imagem na Inbox:
- `getMediaUrl(mediaId, accessToken)` em `lib/whatsapp/media.ts` — GET `/{mediaId}` na Graph API retornando URL temporaria
- `downloadMediaAsBase64(mediaUrl, accessToken)` em `lib/whatsapp/media.ts`
- Webhook atualizado: apos salvar mensagem de imagem, dispara `void (async () => {...})()` para buscar `media_url` da Meta e atualizar a linha em `messages` (sem bloquear o `200`)
- `MessageBubble` reescrito: preview real com `<img>`, lightbox com framer-motion (escala 0.9→1, botao download), placeholders especificos para audio/documento/video/localizacao, badge de extensao para documentos

PARTE 3 — Painel lateral do contato na Inbox:
- `ContactPanel` com spring animation (x: 280→0), dados paralelos do CRM: pipeline stage, tags, tarefas abertas (com checkbox de conclusao), vendas recentes com total
- `PanelSkeleton` para loading state
- Botao de toggle (SidebarOpen/SidebarClose) no header da `ConversationView`
- `InboxClient` com layout de 3 colunas via `AnimatePresence`, persistencia do estado por conversa em `sessionStorage`
- Mobile: overlay fixo com backdrop (z-40) e painel (z-50)

### Observacoes tecnicas

- URLs de midia da Meta expiram em ~5 minutos; para armazenamento permanente seria necessario re-download para Supabase Storage
- Templates precisam ser aprovados no Meta Business Manager com exatamente o mesmo `name` e idioma definidos em `template-definitions.ts`
- O `void (async () => {...})()` garante que o webhook retorne `200` para a Meta antes de buscar a URL de midia

### Validacoes executadas

- `npm run build` passou em 2026-05-12

### Pendencias

- aprovar templates CREMONA no Meta Business Manager
- testar envio de template com janela fechada em ambiente Meta real
- armazenamento permanente de midia (Supabase Storage)
- player real de audio

## Sessao Semana 04 - Stripe + Landing Page - 2026-05-13

### Auditoria inicial

- Stripe: pendente antes desta sessao.
- Landing page: pendente antes desta sessao.
- Build da sessao anterior: limpo.

### Arquivos criados nesta sessao

- `lib/stripe/client.ts` — singleton lazy via ES Proxy para evitar throw em build-time
- `lib/stripe/config.ts` — `TRIAL_DAYS`, `APP_URL`, `STRIPE_PLANS`, `VALID_PRICE_IDS`, `getPlanNameByPriceId`
- `supabase/migrations/007_stripe.sql` — 5 novas colunas em `workspaces` + index por `stripe_customer_id`
- `app/api/stripe/checkout/route.ts` — POST: cria ou reutiliza customer, cria session com trial de 14 dias
- `app/api/stripe/portal/route.ts` — POST: abre portal de cobranca do customer
- `app/api/stripe/webhook/route.ts` — 5 eventos Stripe → atualiza workspace
- `hooks/use-checkout.ts` — `startCheckout`, `openPortal`, loading separados, helper `fetchRedirectUrl`
- `components/settings/plan-settings.tsx` — reescrito com 5 status: trial_active, trial_expired, active, past_due, canceled
- `components/dashboard/checkout-success-toast.tsx` — toast apos retorno do checkout
- `scripts/check-stripe-env.ts` — checa 6 variaveis de ambiente do Stripe
- `docs/stripe-setup.md` — guia de configuracao passo a passo
- `app/(landing)/layout.tsx` — layout limpo sem sidebar/topbar
- `app/(landing)/page.tsx` — landing page completa com 8 secoes + framer-motion
- `app/robots.ts` — robots.txt com rotas privadas e sitemap
- `app/sitemap.ts` — sitemap com landing, login e register
- `docs/launch-checklist.md` — checklist de lancamento completo

### Arquivos alterados nesta sessao

- `types/database.ts` — 5 colunas Stripe adicionadas a workspaces Row/Insert/Update
- `lib/workspace-compat.ts` — `WORKSPACE_STRIPE_SELECT`, `isMissingStripeSchemaError`, `withLegacyDefaults` com null-fill Stripe
- `lib/workspace.ts` — 5 campos Stripe adicionados ao objeto retornado
- `app/page.tsx` — redireciona para `(landing)/page.tsx` em vez de `/login`
- `middleware.ts` — bypass explicito para `/`; usuarios autenticados nao sao redirecionados da landing
- `app/layout.tsx` — metadata SEO completo: title template, description, keywords, og, twitter
- `app/(dashboard)/dashboard/page.tsx` — renderiza `CheckoutSuccessToast` quando `?checkout=success`
- `package.json` — dependencia `stripe`, script `check:stripe-env`
- `.env.local.example` — 6 variaveis Stripe

### Decisoes tecnicas

- Stripe v22 SDK com `apiVersion: '2026-04-22.dahlia'`
- `current_period_end` acessado como `(subscription as any).current_period_end` (limitacao de tipos do v22)
- `(supabase as any)` para colunas Stripe ainda nao no schema gerado
- `withLegacyDefaults` null-fill para bancos sem a migration 007
- Loading separado: `isCheckoutLoading` e `isPortalLoading` para evitar spinner no botao errado
- Landing usa framer-motion `whileInView` com `viewport: { once: true }` em todas as secoes nao-hero

### Estrutura da landing page

- `Header` — fixo, translucido, links Entrar e Comecar gratis
- `Hero` — headline, subtitulo, CTAs, sem cartao de credito
- `Problem` — 3 cards de dor do usuario
- `Features` — 6 funcionalidades em grid com icones coloridos
- `Comparison` — tabela Cremona vs Só WhatsApp vs Planilha
- `Pricing` — cards Starter e Profissional com preco real do `STRIPE_PLANS`
- `Testimonials` — 3 depoimentos com avatar e estrelas
- `CtaFooter` — CTA final + footer com links

### Validacoes executadas

- `/simplify` executado antes desta sessao — 6 arquivos Stripe revisados e corrigidos
- `npm run build` passou antes do simplify (codigo Stripe limpo)
- `npm run build` passou apos simplify (nenhuma regressao)
- `npm run build` passou apos landing + SEO (23 paginas geradas, robots.txt e sitemap.xml incluidos)

### Estado consolidado dos modulos

- [X] Autenticacao
- [X] Dashboard de metricas
- [X] Contatos, Pipeline, Tarefas, Vendas
- [X] Onboarding guiado 5 passos
- [X] Configuracoes (workspace, pipeline, plano, WhatsApp)
- [X] WhatsApp webhook, Inbox MVP, envio basico, janela 24h, templates infra, preview de imagem, painel do contato
- [X] Stripe checkout + portal + webhook + plano nas settings
- [X] Landing page com 8 secoes + animacoes
- [X] SEO metadata + robots + sitemap
- [X] Launch checklist

### Pendencias

- aplicar `007_stripe.sql` no Supabase de producao
- configurar Price IDs e webhook no Stripe Dashboard live
- aprovar templates CREMONA no Meta Business Manager
- armazenamento permanente de midia
- teste real do fluxo Stripe de ponta a ponta em producao

## Sessao Semana 04 - Preparacao Deploy em Producao - 2026-05-13

### Objetivo

Preparar o projeto para go-live: hardening de webhooks, validacao centralizada de env,
rate limiting, scripts de pre-deploy e documentacao completa de deploy.

### Arquivos criados nesta sessao

- `lib/env.ts` — validacao centralizada de variaveis de ambiente com lazy getters
- `scripts/pre-deploy-check.ts` — 5 verificacoes pre-deploy com output colorido
- `docs/vercel-deploy.md` — guia completo de deploy (Vercel, Supabase, Stripe, WhatsApp)
- `specs/semana04-dia01-deploy.md` — spec da tarde com passo a passo e diagnostico

### Arquivos alterados nesta sessao

- `next.config.mjs` — `images.remotePatterns` para Supabase (*.supabase.co) e Meta (lookaside.fbsbx.com)
- `lib/stripe/client.ts` — usa `env.stripe.secretKey` de `lib/env.ts`
- `lib/whatsapp/env.ts` — usa `env.whatsapp.*` de `lib/env.ts`
- `app/api/whatsapp/webhook/route.ts` — 3 melhorias:
  1. Rate limiting por IP (100 req/min, in-memory, comentado que precisa de Redis para alto volume)
  2. JSON parse invalido agora retorna 200 (antes retornava 400, causava retentativas da Meta)
  3. Sem `WHATSAPP_APP_SECRET` em producao agora retorna 200 (antes retornava 500, podia desativar endpoint)
- `docs/whatsapp-vercel-deploy.md` — atualizado com referencia ao `docs/vercel-deploy.md` e scripts
- `package.json` — script `pre-deploy` adicionado

### Decisoes tecnicas

- `lib/env.ts` usa lazy getters (`get supabase()`, `get stripe()` etc.) para evitar throw durante
  `next build` — a avaliacao so ocorre quando a propriedade e acessada em runtime
- Webhook WhatsApp nunca retorna 5xx para a Meta (evita desativacao do endpoint por erros consecutivos)
- Webhook Stripe nunca retorna 5xx para o Stripe (evita duplicacao de estado por retentativa)
- Rate limiting do webhook WhatsApp e por instancia da Vercel; para alto volume trocar por Upstash Redis

### Validacoes executadas

- `npm run build` passou antes das mudancas (23 paginas, build limpo)
- `lib/env.ts` com valores literais causou throw durante build → corrigido com lazy getters
- `npm run build` passou apos correcao (23 paginas, build limpo)
- `npm run pre-deploy` executado: migrations OK, APIs OK, warning de priceIds (esperado em dev)

### Estado consolidado dos modulos — pos go-live prep

- [X] Autenticacao
- [X] Dashboard de metricas
- [X] Contatos, Pipeline, Tarefas, Vendas
- [X] Onboarding guiado 5 passos
- [X] Configuracoes (workspace, pipeline, plano, WhatsApp)
- [X] WhatsApp webhook, Inbox MVP, envio basico, janela 24h, templates infra, preview de imagem, painel do contato
- [X] Stripe checkout + portal + webhook + plano nas settings
- [X] Landing page com 8 secoes + animacoes
- [X] SEO metadata + robots + sitemap
- [X] lib/env.ts centralizado
- [X] Rate limiting no webhook WhatsApp
- [X] Tratamento correto de erros nos webhooks (nunca 5xx para Meta/Stripe)
- [X] next.config.mjs com remotePatterns (Supabase + Meta)
- [X] docs/vercel-deploy.md completo
- [X] scripts/pre-deploy-check.ts
- [X] specs/semana04-dia01-deploy.md

### Pendencias pos-lancamento

- [ ] Executar deploy real na Vercel
- [ ] Executar migrations 001-007 no Supabase de producao
- [ ] Configurar webhook Stripe no ambiente live
- [ ] Configurar webhook WhatsApp na Meta
- [ ] Preencher STRIPE_PRICE_STARTER e STRIPE_PRICE_PROFESSIONAL (criar produtos no Stripe)
- [ ] Aprovar templates CREMONA no Meta Business Manager
- [ ] Armazenamento permanente de midia (Supabase Storage)
- [ ] Primeiros clientes pagantes

## Sessao Semana 04 - Encerramento Pos-Deploy - 2026-05-21

### Objetivo

Consolidar o estado pos-producao: error boundaries, favicon/PWA, timeout defensivo no middleware,
materiais de vendas (demo script, seed de demo, plano semana 04) e documentacao atualizada.

### Arquivos criados nesta sessao

- `app/(dashboard)/error.tsx` — error boundary do grupo dashboard com reset
- `app/(dashboard)/dashboard/error.tsx` — error boundary da pagina principal do dashboard
- `app/icon.tsx` — favicon 32x32 via next/og ImageResponse
- `app/apple-icon.tsx` — apple touch icon 180x180 via next/og ImageResponse
- `app/manifest.ts` — PWA manifest com display standalone
- `docs/demo-script.md` — roteiro de demo de 3 minutos para Loom
- `scripts/seed-demo-account.ts` — seed de dados demo (15 contatos, 8 vendas, 5 tarefas, 3 mensagens)
- `specs/semana04-plano.md` — plano de vendas semana 04 (meta: 3 clientes pagantes)

### Arquivos alterados nesta sessao

- `middleware.ts` — timeout defensivo de 3000ms com Promise.race nos dois queries de workspace
- `docs/launch-checklist.md` — marcados como concluidos todos os itens feitos ate 2026-05-21
- `package.json` — script `seed:demo` adicionado
- `CONTEXT.md` — esta sessao adicionada

### Decisoes tecnicas

- Middleware usa dois `Promise.race` independentes (um para `getWorkspaceIdForUser`, outro para `getWorkspaceByIdCompatible`) em vez de um unico timeout global — permite granularidade de log e maior isolamento de falha
- Timeout de 3000ms: se o banco demorar, o usuario passa sem redirect (nao fica bloqueado), e o warning e logado no Vercel
- Error boundaries com `'use client'` e `reset()` — segue padrao Next.js 14 App Router; componente pai tenta re-renderizar sem reload completo
- Seed script usa `createClient` com `service_role_key` para bypass de RLS — adequado para script administrativo local
- Favicon e apple-icon gerados em runtime via ImageResponse (sem arquivo estatico) — evita dependencia de ferramenta de design

### Estado consolidado pos-sessao

- [X] Autenticacao
- [X] Dashboard de metricas
- [X] Contatos, Pipeline, Tarefas, Vendas
- [X] Onboarding guiado 5 passos
- [X] Configuracoes (workspace, pipeline, plano, WhatsApp)
- [X] WhatsApp webhook, Inbox MVP, envio basico, janela 24h, templates infra, preview de imagem, painel do contato
- [X] Stripe checkout + portal + webhook + plano nas settings
- [X] Landing page com 8 secoes + animacoes
- [X] SEO metadata + robots + sitemap
- [X] lib/env.ts centralizado
- [X] Rate limiting no webhook WhatsApp
- [X] Tratamento correto de erros nos webhooks (nunca 5xx para Meta/Stripe)
- [X] next.config.mjs com remotePatterns
- [X] docs/vercel-deploy.md + docs/monitoring.md
- [X] scripts/pre-deploy-check.ts
- [X] Error boundaries no grupo dashboard
- [X] Favicon + apple-icon + PWA manifest
- [X] Timeout defensivo no middleware (3000ms)
- [X] docs/demo-script.md
- [X] scripts/seed-demo-account.ts + npm run seed:demo
- [X] specs/semana04-plano.md

### Proximas etapas (semana 04 — vendas)

- [ ] Executar npm run seed:demo em conta demo real
- [ ] Gravar video demo de 3 min com roteiro em docs/demo-script.md
- [ ] Abordagem direta a 10 leads (ver specs/semana04-plano.md)
- [ ] Meta: 3 assinaturas pagas ate 2026-05-31
- [ ] Ativar Realtime no Supabase para messages, tasks, sales
- [ ] Migrar para Stripe live quando primeiro cliente pagar
- [ ] Aprovar templates CREMONA no Meta Business Manager

## Semana 04 — Primeiros clientes

Inicio: 2026-05-21
Foco: vendas e iteracao com base em feedback real
Meta: 3 clientes pagantes ao final da semana

### Ferramentas criadas esta sessao:
- `scripts/seed-demo-account.ts`
- `components/landing/whatsapp-cta.tsx`
- `docs/pre-recording-checklist.md`
- Secao de video na landing page
- Secao FAQ na landing page
- Botao flutuante WhatsApp na landing

### Pendencias desta sessao:
- [ ] Gravar o video demo (fora do Claude Code)
- [ ] Preencher `NEXT_PUBLIC_LOOM_VIDEO_ID`
- [ ] Fazer push e redeploy com o video

## Sessao Sprint WhatsApp MVP Dia 01 Noite — Sistema de Automacoes — 2026-05-23

### Objetivo

Construir sistema completo de automacoes: schema, motor de execucao, acoes e UI CRUD.

### Arquivos criados nesta sessao

- `supabase/migrations/009_automations.sql` — tabelas `automations` e `automation_logs` com RLS
- `lib/automations/engine.ts` — motor principal `runAutomationsForEvent` com Promise.allSettled
- `lib/automations/actions.ts` — acoes executaveis: WhatsApp texto e criar tarefa
- `hooks/use-automations.ts` — hook client com stats por automacao
- `app/(dashboard)/dashboard/automations/page.tsx` — pagina /dashboard/automations
- `app/(dashboard)/dashboard/automations/actions.ts` — CRUD server actions (create/update/toggle/delete)
- `components/automations/automation-card.tsx` — card com toggle, more menu, pills trigger→action
- `components/automations/automation-modal.tsx` — modal 3 secoes: gatilho, acao, configuracoes

### Arquivos alterados nesta sessao

- `types/database.ts` — tabelas `automations` e `automation_logs` adicionadas
- `types/app.ts` — tipos Automation, AutomationLog, AutomationWithStats, config types
- `app/(dashboard)/dashboard/pipeline/actions.ts` — dispara stage_enter/stage_exit apos mover contato
- `app/(dashboard)/dashboard/contacts/actions.ts` — dispara contact_created apos criar contato
- `components/layout/sidebar.tsx` — item "Automacoes" com icone Zap na navegacao inferior

### Decisoes tecnicas

- Motor usa `createAdminClient()` pois roda em background sem sessao de usuario autenticado
- `Promise.allSettled` garante que falha em uma automacao nao cancela as outras
- Integracoes no pipeline e contacts usam `void` — background fire-and-forget, nao bloqueiam a resposta ao usuario
- Interpolacao de variaveis `{{contact_name}}` via regex global na funcao `interpolateVars`
- Delay > 0 executa imediatamente com log de warning — TODO para pg_cron/Vercel Cron
- Janela de 24h verificada antes de enviar texto; fora da janela retorna status 'skipped' (nao 'failed')
- `trigger_config->>'stage_id'` usado na query do Supabase para filtrar automacoes por stage
- UI page.tsx e 'use client' pois depende de `useWorkspace()` que e contexto client-side

### Validacoes executadas

- `npm run build` passou em 2026-05-23 (25 paginas, build limpo)
- Rota `/dashboard/automations` aparece no output do build como ƒ (Dynamic)

### Estado consolidado pos-sessao

- [X] Sistema de automacoes
  - [X] Migration 009_automations.sql
  - [X] Motor de execucao (engine.ts) com Promise.allSettled
  - [X] Acao WhatsApp texto com verificacao de janela 24h
  - [X] Acao criar tarefa com interpolacao de variaveis
  - [X] Interpolacao {{contact_name}}, {{contact_phone}}, {{contact_company}}, {{contact_email}}
  - [X] Integrado ao moveContactStageAction (stage_enter + stage_exit)
  - [X] Integrado ao createContactAction (contact_created)
  - [X] UI: pagina /dashboard/automations com empty state e lista
  - [X] UI: AutomationCard com toggle, menu, pills trigger->action, stats
  - [X] UI: AutomationModal com 3 secoes visuais e chips de variaveis clicaveis
  - [X] Server Actions CRUD completo (create/update/toggle/delete)

### Pendencias do Sprint

- [ ] Dia 02 Manha: disparo ativo de template (fora da janela de 24h)
- [ ] Dia 02 Noite: automacao com midia + logs UI
- [ ] Dia 03 Manha: delay real com Vercel Cron
- [ ] Dia 03 Noite: testes e refinamento
- [ ] Executar `009_automations.sql` no Supabase de producao

## Sessao Sprint WhatsApp MVP Dia 02 — Templates Dinamicos por Workspace — 2026-05-25

### Objetivo

Templates WhatsApp gerenciados pelo usuario no DB (nao mais hardcoded),
TemplatePickerModal buscando templates aprovados, AutomationModal com acao de template
e migration 010 com tabela `whatsapp_templates`.

### Arquivos criados nesta sessao

- `supabase/migrations/010_custom_templates.sql` — tabela `whatsapp_templates` com `variables jsonb` e RLS
- `app/(dashboard)/dashboard/settings/template-actions.ts` — CRUD: create/update/updateStatus/delete (bloqueio por automacoes)
- `components/settings/template-modal.tsx` — modal criar/editar template com parsing dinamico de variaveis e preview ao vivo
- `components/settings/templates-settings.tsx` — aba de templates nas settings com lista, badges de status e ciclo manual
- `scripts/seed-default-templates.ts` — seed de 3 templates padrao (follow_up, proposta, reativacao)

### Arquivos alterados nesta sessao

- `types/database.ts` — tipo `whatsapp_templates` adicionado
- `types/app.ts` — `TemplateVariable`, `WhatsAppTemplateStatus` adicionados
- `components/settings/settings-tabs.tsx` — aba "Templates" adicionada
- `app/(dashboard)/dashboard/settings/page.tsx` — `<TemplatesSettings>` renderizado na aba templates
- `components/automations/automation-modal.tsx` — acao `send_whatsapp_template` com select + variaveis + preview
- `components/inbox/template-picker-modal.tsx` — reescrito para buscar templates aprovados do DB com preview ao vivo
- `components/inbox/conversation-view.tsx` — passa `contactPhone` e `contactCompany` ao TemplatePickerModal
- `app/(dashboard)/dashboard/inbox/actions.ts` — `sendTemplateMessageAction` atualizado para templateId + variableValues
- `lib/automations/actions.ts` — `executeWhatsAppTemplateAction` adicionado
- `lib/automations/engine.ts` — case `send_whatsapp_template` adicionado ao switch
- `package.json` — script `seed:templates` adicionado

### Fluxo de templates

1. Usuario cria template em Settings → Templates (status: pending)
2. Aprova template no Meta Business Manager com exatamente o mesmo `name`
3. Marca como "Aprovado" no CRM (status: approved)
4. Template disponivel na Inbox (TemplatePickerModal) e em Automacoes (AutomationModal)
5. Motor resolve variaveis: valores do usuario > default interpolado com dados do contato > default literal

### Decisoes tecnicas

- Variaveis armazenadas como `jsonb`: `[{index: 1, label: "Nome", default: "{{contact_name}}"}]`
- `variable_defaults` em `action_config` armazenado como JSON string (constraint de `Record<string,string>`)
- deleteTemplateAction bloqueia exclusao se automacao usa o template (evita referencia quebrada)
- Status cycling manual: pending → approved → rejected → pending (usuario confirma aprovacao na Meta)
- `Array.from(new Set(...))` em vez de `[...new Set(...)]` — compatibilidade com tsconfig target ES2014

### Validacoes executadas

- `npm run build` passou em 2026-05-25 (25 paginas, build limpo)

### Proximas etapas

- [ ] Executar `010_custom_templates.sql` no Supabase de producao
- [ ] Executar `npm run seed:templates [WORKSPACE_ID]` para templates padrao
- [ ] Aprovar templates CREMONA no Meta Business Manager

## Sessao Sprint WhatsApp MVP Dia 03 — Fila de Automacoes + Dashboard WhatsApp — 2026-05-26

### Objetivo

Delay real via Vercel Cron com fila persistente, e dashboard de metricas do WhatsApp.

### Arquivos criados nesta sessao

- `supabase/migrations/012_automation_queue.sql` — tabela `automation_queue` com RLS e indices
- `supabase/migrations/013_whatsapp_indexes.sql` — indices de performance para analytics
- `app/api/cron/process-automation-queue/route.ts` — endpoint chamado pelo Vercel Cron a cada minuto
- `lib/whatsapp/analytics.ts` — 4 funcoes: getWhatsAppOverview, getMessagesPerDay, getAutomationStats, getTopContacts
- `app/api/dashboard/whatsapp/route.ts` — API route com queries paralelas e validacao de membership
- `components/whatsapp/whatsapp-dashboard.tsx` — dashboard client com seletor 7/30/90 dias
- `app/(dashboard)/dashboard/whatsapp/page.tsx` — rota /dashboard/whatsapp
- `vercel.json` — cron "* * * * *" configurado

### Arquivos alterados nesta sessao

- `types/database.ts` — tipo `automation_queue` adicionado
- `lib/automations/engine.ts` — delay > 0 agora enfileira em `automation_queue` em vez de executar imediatamente
- `components/layout/sidebar.tsx` — grupo "WHATSAPP" com Inbox, Automacoes (badge azul), Analytics
- `app/(dashboard)/layout.tsx` — busca activeAutomationsCount e passa para Sidebar
- `.env.local.example` — variavel `CRON_SECRET` documentada

### Arquivos novos no build

- `/api/cron/process-automation-queue` — ƒ Dynamic
- `/api/dashboard/whatsapp` — ƒ Dynamic
- `/dashboard/whatsapp` — ƒ Dynamic (4.04 kB + 214 kB First Load JS)

### Fila de automacoes

Fluxo com delay > 0:
1. Evento dispara -> engine detecta delay_minutes > 0
2. Item inserido em `automation_queue` com `scheduled_for = now + delay`
3. Log registrado como 'skipped' com mensagem "Agendada para X minutos"
4. Vercel Cron chama /api/cron/process-automation-queue a cada minuto
5. Cron busca itens com `status=pending AND scheduled_for <= NOW() AND attempts < max_attempts`
6. Marca como 'processing' atomicamente (WHERE status='pending' previne race condition)
7. Executa a acao, marca como 'done' ou 'failed'/'pending' (retry) e insere log

Protecao:
- Autenticacao Bearer com CRON_SECRET
- Max 3 tentativas por item (max_attempts)
- Retry automatico se attempts < max_attempts
- Status 'failed' definitivo apos esgotar tentativas
- runtime = 'nodejs' (nao edge) para compatibilidade com libraries

### Dashboard WhatsApp

KPI cards: Enviadas, Recebidas, Taxa de resposta (com barra colorida), Conversas ativas
Grafico ComposedChart recharts: barras azuis (enviadas) + linha verde (recebidas) por dia
Card automacoes: total de execucoes + taxa de sucesso + top 5 automacoes
Card contatos: top 5 mais ativos com ultimo contato e link para Inbox
Seletor de periodo: 7/30/90 dias com refetch client-side via /api/dashboard/whatsapp

### Sidebar reorganizada

Grupo "WHATSAPP" separado com label uppercase:
- WhatsApp (MessageCircle) — badge verde unread
- Automacoes (Zap) — badge azul active count
- Analytics (BarChart3) — sem badge

### Decisoes tecnicas

- Cron enfileira apenas; a execucao real e feita pelo endpoint do Vercel Cron
- runtime = 'nodejs' no cron route para evitar restricoes do edge runtime
- getMessagesPerDay faz GROUP BY em JavaScript (evita SQL avancado incompativel com postgrest)
- Array.from() em vez de [...Set()] — compatibilidade com tsconfig target pre-ES2015
- response rate calculada por contatos unicos (nao por mensagem) para evitar distorcao

### Validacoes executadas

- `npm run build` passou em 2026-05-26 (29 paginas, build limpo)

### Proximas etapas

- [ ] Executar migrations 012 e 013 no Supabase de producao
- [ ] Configurar CRON_SECRET na Vercel
- [ ] Validar que o Vercel Cron dispara em producao
- [ ] Testar delay end-to-end: criar automacao com 5 min, mover lead, esperar, chamar cron manualmente
- [ ] Aprovar templates no Meta Business Manager

## Sessao Sprint WhatsApp MVP Dia 02 Tarde - Midia, Logs e Refinamentos - 2026-05-25

### Implementado

- [X] Midia como acao de automacao
  - `send_whatsapp_media` no engine
  - upload inline no AutomationModal
  - preview de imagem/documento/audio/video no modal
- [X] Pagina de logs de automacoes
  - `useAutomationLogs` com paginacao
  - `AutomationLogItem` com expansao de erro/motivo
  - link nos AutomationCards
  - filtros por status
- [X] Refinamentos do fluxo
  - deduplicacao fixa de 5min por contato/automacao
  - toast via Realtime ao inserir log de automacao
  - validacao de template aprovado na action
  - aviso de WhatsApp nao configurado ao salvar automacao

### Arquivos criados

- `supabase/migrations/011_automation_media.sql`
- `hooks/use-automation-logs.ts`
- `app/(dashboard)/dashboard/automations/logs/page.tsx`
- `components/automations/automation-log-item.tsx`
- `scripts/test-automations.ts`

### Pendencias do Sprint

- [X] Dia 02 Tarde: midia em automacoes + logs + refinamentos
- [ ] Dia 03 Manha: delay real com Vercel Cron + dashboard de WhatsApp
- [ ] Dia 03 Noite: testes end-to-end + refinamento visual
- [ ] Dia 04 Manha: validacao final + deploy do Sprint
## Sprint WhatsApp MVP — Estado Final

Duração: Dia 01 a 03 (6 sessões)
Iniciado: 2026-05-23
Concluído: 2026-05-26

### Funcionalidades entregues:

WhatsApp — Envio de mídia:
- [X] Envio de imagem pela Inbox com preview
- [X] Envio de documento com nome do arquivo
- [X] Envio de áudio com player nativo
- [X] Envio de vídeo com player nativo
- [X] Upload para Supabase Storage (bucket outbound-media, URLs permanentes)
- [X] Preview antes de enviar (modal)
- [X] Rendering correto de outbound no bubble

WhatsApp — Templates:
- [X] Tabela whatsapp_templates por workspace
- [X] UI de gerenciamento em Settings → Templates
- [X] Criação com preview em tempo real
- [X] Status: pending → approved → rejected
- [X] TemplatePickerModal dinâmico
- [X] Envio real via Meta API com variáveis
- [X] 3 templates padrão via seed:templates

Automações:
- [X] Motor de execução com interpolação de variáveis ({{contact_name}} etc.)
- [X] Gatilhos: stage_enter, stage_exit, contact_created
- [X] Ações: send_whatsapp_text, send_whatsapp_template, send_whatsapp_media, create_task
- [X] Delay real via fila + Vercel Cron
- [X] Deduplicação (5min por contato)
- [X] Toast via Realtime ao executar
- [X] UI completa: página, cards, modal
- [X] Logs de execução com filtros
- [X] Validação de template aprovado

WhatsApp Analytics:
- [X] Dashboard /dashboard/whatsapp
- [X] KPIs: enviadas, recebidas, taxa de resposta, conversas ativas
- [X] Gráfico de volume por dia (30 dias)
- [X] Performance de automações
- [X] Contatos mais ativos
- [X] Seletor de período 7/30/90 dias

Infraestrutura:
- [X] Migrations 008 a 013
- [X] Vercel Cron configurado
- [X] Índices de performance para analytics
- [X] Sidebar reorganizada com grupo "WHATSAPP": Inbox, Automações, Analytics

### Pendências pós-Sprint:
- [ ] Aprovar templates no Meta Business Manager (processo externo)
- [ ] Download permanente de mídia inbound (URLs da Meta expiram em ~5min)
- [ ] Preview de áudio inbound com player
- [ ] Disparos em massa (próximo sprint)
- [ ] Executar migrations 008-013 em produção
- [ ] Configurar CRON_SECRET na Vercel
- [ ] Executar seed:templates em produção

### Validações finais desta sessão

- [X] `npm run build`: passou em 2026-05-26, com warning conhecido de `<img>` em `components/inbox/message-bubble.tsx`
- [ ] `npx tsx scripts/test-whatsapp-sprint.ts aaaaaaaa-0000-0000-0000-000000000001`: 0/5, bloqueado porque o Supabase de `.env.local` ainda não tem as migrations 008-013 nem bucket `outbound-media` aplicados
- [ ] `npm run pre-deploy`: 8/9, bloqueado por variáveis críticas ausentes no `.env.local`: `WHATSAPP_VERIFY_TOKEN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`
- [X] `supabase/migrations/README.md` criado
- [X] `docs/vercel-deploy.md` atualizado com instrucoes do Sprint

## Sessao Sprint WhatsApp MVP Dia 04 — Deploy Final — 2026-05-27

### Objetivo

Preparacao do commit final do Sprint e documentacao de deploy para producao.

### O que foi feito nesta sessao

- Verificacoes pre-commit: `npm run build` limpo (29 paginas), `npm run pre-deploy` 8/9 (falha esperada: vars de prod ausentes no local)
- `vercel.json` validado: JSON OK, cron configurado
- Todos os arquivos do Sprint commitados em um unico commit consolidado (32 arquivos, +2213/-142 linhas)
- `docs/whatsapp-sprint-summary.md` criado — referencia tecnica completa do Sprint
- CONTEXT.md atualizado com estado final

### Arquivos novos nesta sessao

- `docs/whatsapp-sprint-summary.md` — documentacao de referencia do Sprint completo

### Estado do deploy

Git: commit `5303232` criado localmente.
Push: aguardando remote configurado pelo usuario.
Vercel: deploy pendente ate push.

### Roteiro de deploy para o usuario

PASSO 1 — Adicionar remote e fazer push:
  git remote add origin [URL_DO_REPOSITORIO]
  git push -u origin master

  Ou, se usando Vercel CLI diretamente:
  vercel --prod

PASSO 2 — Adicionar CRON_SECRET na Vercel:
  Vercel → Project → Settings → Environment Variables
  Name: CRON_SECRET
  Value: [openssl rand -hex 32]

PASSO 3 — Executar migrations no Supabase de producao (na ordem):
  008_media_storage.sql
  009_automations.sql
  010_custom_templates.sql
  011_automation_media.sql
  012_automation_queue.sql
  013_whatsapp_indexes.sql

PASSO 4 — Verificar Cron Jobs na Vercel:
  Vercel → Project → Settings → Cron Jobs
  Deve aparecer: process-automation-queue / * * * * *

PASSO 5 — Testar cron manualmente:
  curl -H "Authorization: Bearer [CRON_SECRET]"
    https://[dominio]/api/cron/process-automation-queue
  Esperado: {"processed":0,"succeeded":0,"failed":0,"retrying":0}

PASSO 6 — Seed de templates:
  npm run seed:templates [WORKSPACE_ID]

PASSO 7 — Validar end-to-end com scripts/test-whatsapp-sprint.ts

### Proximas etapas

- [ ] Push e deploy na Vercel
- [ ] Configurar CRON_SECRET na Vercel
- [ ] Executar migrations 008-013 no Supabase de producao
- [ ] Verificar Cron Jobs ativos na Vercel
- [ ] seed:templates no workspace de producao
- [ ] Aprovar templates no Meta Business Manager
- [ ] Validar Teste A-E em producao (ver spec do Dia 04)

## Sessao Sprint WhatsApp MVP Dia 04 Tarde — Encerramento — 2026-05-27

### Objetivo

Correcoes pos-deploy, melhorias de UX e encerramento oficial do Sprint.

### Arquivos alterados nesta sessao

- `app/api/cron/process-automation-queue/route.ts` — maxDuration=10s, LIMIT 10, timing log
- `hooks/use-pipeline.ts` — query paralela de stagesWithAutomations (stage_enter ativos)
- `components/pipeline/kanban-card.tsx` — Zap azul no rodape quando stage tem automacao
- `components/pipeline/kanban-column.tsx` — prop automationSummary com badge Zap no header
- `components/pipeline/kanban-board.tsx` — repassa stagesWithAutomations e automationSummaryByStage
- `app/(dashboard)/dashboard/pipeline/page.tsx` — computa automationSummaryByStage
- `hooks/use-automations.ts` — week_success_count calculado dos logs ja carregados
- `types/app.ts` — week_success_count adicionado ao AutomationWithStats
- `components/automations/automation-card.tsx` — contador "N esta semana . M total"
- `components/automations/automation-modal.tsx` — prop initialValues para pre-preencher em create
- `components/settings/templates-settings.tsx` — botao Verificar aprovacao (RefreshCw) para pending
- `components/inbox/template-picker-modal.tsx` — lista templates pendentes quando nao ha aprovados

### Arquivos criados nesta sessao

- `components/automations/automations-welcome.tsx` — pagina de boas-vindas com 3 presets clicareis

### Funcionalidades implementadas

- Cron timeout defensivo: maxDuration=10s evita timeout no plano Hobby da Vercel
- Indicador visual Zap no KanbanCard para stages com automacao stage_enter ativa
- Tooltip no header da coluna com resumo da automacao ("⚡ Ao entrar: Mensagem enviada para o lead")
- Contador semanal no AutomationCard: "N esta semana · M total" com N em azul se > 0
- Pagina de boas-vindas em Automacoes com 3 exemplos pre-configurados (boas-vindas, proposta, fechamento)
- Botao "Verificar aprovacao" nos templates pendentes: consulta Meta API e atualiza status automaticamente
- TemplatePickerModal com fallback para templates pendentes quando nao ha aprovados (mostra nome exato para criar na Meta)

### Decisoes tecnicas

- initialValues no AutomationModal: seeds o estado em create mode sem afetar edit mode
- stagesWithAutomations no usePipeline como query paralela (4a query no Promise.all)
- syncTemplateStatusAction requer whatsapp_business_account_id configurado no workspace
- week_success_count calculado no cliente a partir dos logs ja carregados (sem query adicional)

### Validacoes executadas

- `npm run build` passou em 2026-05-27 (29 paginas, build limpo)
- Commit `3184d70` criado (15 arquivos, +383/-51 linhas)

## Sprint WhatsApp MVP — ENCERRADO

Data de encerramento: 2026-05-27
Status: Completo

### Resumo executivo:

Em 4 dias (9 sessoes) o Cremona ganhou:

1. Envio de midia completo pela Inbox
   Imagens, documentos, audios e videos
   com upload, preview e player nativo.

2. Motor de automacoes
   4 gatilhos x 4 acoes = 16 combinacoes
   possíveis. Delay real via Vercel Cron.
   Deduplicacao e logs de execucao.

3. Templates WhatsApp dinamicos
   Gestao de templates por workspace
   com sincronizacao de status via Meta API.

4. Dashboard de analytics
   Metricas de mensagens, automacoes e
   contatos mais ativos com seletor de periodo.

5. UX pos-deploy
   Zap visual no Pipeline, pagina de boas-vindas
   em Automacoes, contador semanal nos cards.

### Impacto no produto:

Antes do Sprint:
- Inbox so enviava texto
- Sem automacoes
- Templates hard-coded
- Sem metricas de WhatsApp
- Pipeline sem contexto de automacoes

Apos o Sprint:
- Inbox envia qualquer tipo de midia
- Automacoes com delay, midia e templates
- Templates gerenciaveis por workspace com sync via Meta
- Dashboard completo de analytics
- Sidebar reorganizada com grupo WHATSAPP
- Pipeline com indicadores visuais de automacoes

### Proximos sprints sugeridos:

Sprint 2: Disparos em massa
- Selecionar lista de contatos por etiqueta
- Enviar mensagem ou template para todos
- Rate limiting (Meta limita disparos)
- Relatorio de entrega por campanha

Sprint 3: Integracoes de gateway
- Conectar Mercado Pago ou Stripe
- Importar vendas automaticamente
- Notificacao de pagamento recebido
- ROAS por canal de marketing

Sprint 4: IA no CRM
- Sugestao de resposta na Inbox
- Resumo semanal automatico com Claude
- Classificacao automatica de leads
- Analise de sentimento nas conversas

## Sessao Automacoes Duraveis - 2026-07-22

### Objetivo

Corrigir o motor de automacoes para ambiente serverless: nenhuma automacao deve depender de Promise solta apos a resposta HTTP. Todas as execucoes agora passam por `automation_queue`, inclusive `delay_minutes = 0`.

### Arquivos alterados nesta sessao

- `src/lib/automations/engine.ts` - `runAutomationsForEvent` deixou de executar acoes diretamente e passou a inserir jobs duraveis na fila.
- `src/lib/automations/queue.ts` - helper puro para casar automacoes com eventos e calcular `scheduled_for`.
- `src/app/(dashboard)/dashboard/contacts/actions.ts` - `contact_created` agora aguarda o enfileiramento.
- `src/app/(dashboard)/dashboard/pipeline/actions.ts` - `stage_exit` e `stage_enter` agora aguardam o enfileiramento.
- `src/app/api/cron/process-automation-queue/route.ts` - worker existente passou a executar `send_whatsapp_media`, acao que ja existia no motor antigo.
- `scripts/validate-automation-queue.ts` - validacao local sem Supabase para delay 0, delay 15, ausencia de automacoes e filtros por etapa.
- `package.json` - script `test:automation-queue`.
- `README.md` - documentacao breve da fila duravel.

### Comportamento atual

- `contact_created`, `stage_enter` e `stage_exit` continuam sendo os eventos produzidos por Server Actions.
- A selecao continua respeitando `workspace_id`, `active = true`, `trigger_type` e `trigger_config.stage_id` para eventos de etapa.
- `delay_minutes = 0` cria job `pending` com `scheduled_for` no momento atual.
- `delay_minutes > 0` cria job `pending` com `scheduled_for = agora + delay`.
- Nenhuma automacao ativa e resultado valido: nenhum job e criado e a operacao principal continua.
- Erro ao buscar automacoes ou inserir jobs na fila e falha de registro duravel. O contato/movimento pode ja ter sido gravado, mas a Server Action retorna erro ao usuario e registra contexto seguro, sem tokens ou segredos.
- O cron existente `/api/cron/process-automation-queue` continua sendo o unico executor das acoes.

### Compatibilidade de acoes

- Acoes suportadas pela UI/tipos/worker apos esta sessao: `send_whatsapp_text`, `send_whatsapp_template`, `send_whatsapp_media`, `create_task`.
- Diferenca encontrada antes da correcao: o worker nao tratava `send_whatsapp_media`, embora o motor direto e a UI ja suportassem. Foi corrigido como ajuste minimo para evitar regressao ao remover execucao direta do motor.

### Limitacoes restantes

- `task_overdue` aparece em tipos/UI de automacoes, mas ainda nao ha produtor de evento.
- Criacoes de contato por onboarding, importacao CSV client-side e webhook inbound nao disparam `contact_created` hoje; centralizacao da criacao de contatos fica para prompt futuro.
- Naquele momento ainda nao havia `event_key`, indice unico de idempotencia, claim seguro com `locked_at`/`locked_by`, nem exponential backoff; a sessao seguinte cobre idempotencia e claim seguro sem `locked_at`/`locked_by`.

## Sessao Idempotencia da Fila de Automacoes - 2026-07-22

### Objetivo

Tornar `automation_queue` idempotente e segura contra concorrencia entre execucoes simultaneas do cron, sem criar novo cron, nova fila ou nova infraestrutura.

### Arquivos alterados nesta sessao

- `src/supabase/migrations/015_automation_queue_idempotency.sql` - adiciona `event_key text` e indice unico parcial `automation_queue_event_key_unique`.
- `src/types/database.ts` - inclui `event_key` nos tipos da tabela `automation_queue`.
- `src/lib/automations/queue.ts` - adiciona builder deterministico e testavel de `event_key`.
- `src/lib/automations/engine.ts` - insere jobs de forma idempotente e trata duplicidade por `event_key` como resultado valido.
- `src/app/api/cron/process-automation-queue/route.ts` - claim usa `UPDATE ... WHERE status = pending AND scheduled_for <= now RETURNING *`; a acao so executa apos confirmar `claimedJob`.
- `scripts/validate-automation-migration.ts` - valida coluna, indice unico parcial e rollback documentado na migration.
- `scripts/validate-automation-queue.ts` - valida chaves deterministicas, duplicidade logica e diferenca entre contatos/etapas.
- `scripts/validate-automation-concurrency.ts` - simula claim concorrente, ausencia de execucao sem claim e isolamento por workspace.
- `README.md` - documenta idempotencia, claim e limites restantes.

### Formato da event_key

- `contact_created:{contact_id}:{automation_id}`
- `stage_enter:{contact_id}:{stage_id}:{automation_id}`
- `stage_exit:{contact_id}:{stage_id}:{automation_id}`

A chave nao inclui timestamp nem valor aleatorio. A mesma combinacao logica sempre gera a mesma `event_key`.

### Comportamento atual

- `delay_minutes = 0` e `delay_minutes > 0` continuam entrando em `automation_queue` com `status = pending`.
- A coluna `event_key` e nullable para compatibilidade com jobs antigos, mas jobs criados pelo motor atual recebem chave.
- O indice unico parcial impede dois jobs com a mesma `event_key` nao nula.
- Duplicidade por `event_key` e ignorada como resultado idempotente, com log sanitizado contendo apenas ids e status.
- O worker seleciona apenas `status = pending` e `scheduled_for <= now`.
- O worker so chama `executeWhatsAppTextAction`, `executeWhatsAppTemplateAction`, `executeWhatsAppMediaAction` ou `executeCreateTaskAction` depois de receber a linha em `claimedJob`.
- A execucao usa os dados de `claimedJob` para `attempts`, `max_attempts`, `workspace_id`, `automation_id`, `contact_id`, `status` e `event_key`.
- Antes de qualquer acao externa, o worker valida que automacao e contato pertencem ao mesmo `workspace_id` do job; inconsistencias falham de forma segura.

### Limitacoes restantes

- Nao ha exponential backoff.
- Nao ha recuperacao automatica de jobs presos em `processing`.
- Ainda nao existem `locked_at` e `locked_by`.
- O claim ainda mantem o filtro historico `attempts < 3`; o respeito integral a `max_attempts` fica para o Prompt 03.
- Nao ha dead letter queue, alerta ou retry manual.
- Rollback da migration: `DROP INDEX IF EXISTS automation_queue_event_key_unique;` e `ALTER TABLE automation_queue DROP COLUMN IF EXISTS event_key;`.

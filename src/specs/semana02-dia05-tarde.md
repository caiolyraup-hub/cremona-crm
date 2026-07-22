# Semana 02 - Dia 05 - Tarde

## Objetivo

Construir o Inbox WhatsApp MVP com lista de conversas, historico de mensagens e Realtime, usando a tabela `messages` ja existente.

## Escopo

- `hooks/use-inbox.ts`
- `useInbox`
- `useConversation`
- `app/(dashboard)/inbox/page.tsx`
- `components/inbox/conversation-list.tsx`
- `components/inbox/conversation-view.tsx`
- `EmptyState`
- `Skeletons`
- Realtime com Supabase em `messages`
- agrupamento por `contact_id`
- selecao de conversa
- leitura das mensagens ordenadas por `created_at`

## Fora de escopo

- envio real de mensagens
- templates da Meta
- midia completa
- badge na sidebar
- painel lateral avancado
- configuracao real nas Settings
- Stripe

## Criterios de aceite

- `/dashboard/inbox` renderiza sem erro
- lista conversas a partir da tabela `messages`
- seleciona conversa
- mostra historico
- recebe atualizacao por Realtime
- mantem filtro por `workspace_id`
- build e lint passam

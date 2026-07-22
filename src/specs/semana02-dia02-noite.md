# Spec - Semana 02 Dia 02 Noite

## Contexto

Modulo de Vendas esta funcional e integrado. Esta sessao consolidou o polimento visual
e integracoes entre modulos. O proximo foco e qualidade de experiencia e inicio do
planejamento do modulo de Inbox / WhatsApp.

Entregues nesta tarde:
- `hooks/use-currency-input.ts` — mascaramento de centavos extraido do modal e reutilizavel
- `SaleModal` refatorado para usar o hook
- `KanbanContact.sales_count` — pipeline exibe contador de vendas por contato
- `KanbanCard` footer com indicador de vendas (ShoppingBag + count)
- `WeeklyChart` em `sales-report.tsx` com tooltip hover e animacao CSS
- Dashboard com 2 cards KPI (receita da semana + tarefas pendentes) + grid de widgets
- `CONTEXT.md` atualizado
- `npm run build` limpo

## Objetivo da noite

Explorar e planejar o modulo de Inbox antes de implementar. Nao codificar ainda.
Documentar decisoes de produto e arquitetura para a proxima sessao de implementacao.

## Tarefa 1 — Revisao de UX do modulo de Vendas

Validar os seguintes fluxos manualmente no navegador:

### Lista de lancamentos
- Criar venda com produto novo, contato vinculado, data de ontem
- Editar venda: alterar status de `pendente` para `pago`
- Excluir venda: confirmar que soma do rodape atualiza
- Filtrar por `Esta semana`: so lancamentos da semana aparecem
- Filtrar por `Pago`: so lancamentos pagos aparecem
- Buscar por produto: resultado filtra em tempo real

### Relatorio
- Trocar para aba Relatorio
- Verificar que KPIs refletem o filtro de periodo ativo
- Verificar que grafico de barras exibe semanas corretas
- Verificar que top produtos aparecem na ordem certa

### ContactCard
- Abrir detalhe de um contato com vendas
- Verificar secao Vendas: lista parcial + botao `Novo lancamento`
- Criar venda pela secao do contato: verificar que contato esta pre-preenchido

### Pipeline
- Verificar que cards com vendas exibem o icone e contagem no rodape
- Verificar que cards sem vendas nao exibem o indicador

### Dashboard
- Verificar que KPI de receita da semana reflete vendas pagas
- Verificar que KPI de tarefas pendentes e preciso

## Tarefa 2 — Bugs encontrados

Registrar qualquer bug encontrado na revisao acima.
Priorizar correos criticas antes de avancar.

Categorias esperadas:
- Calculo errado nos totalizadores
- Data de venda fora do intervalo do filtro
- Tooltip de hover posicionado fora da tela em colunas pequenas
- Animacao de altura da barra nao dispara na primeira renderizacao

## Tarefa 3 — Seed de Vendas

Verificar se o seed atual tem dados suficientes para validar os fluxos acima.

Minimo necessario:
- 5 vendas em datas distintas, cobrindo pelo menos 2 semanas
- Status mistos: pelo menos 1 `pago`, 1 `pendente`, 1 `cancelado`
- Produtos distintos (pelo menos 3 nomes diferentes)
- Pelo menos 1 venda sem contato vinculado
- Pelo menos 1 venda com valor acima de R$ 1.000

Se o seed estiver insuficiente, complementar `supabase/seed.sql` com os lancamentos necessarios.

## Tarefa 4 — Planejamento do Inbox

Levantar as decisoes de produto antes de implementar qualquer codigo.

### Perguntas que precisam de resposta

**Canal principal:**
- Inbox e um viewer/responder de mensagens do WhatsApp?
- Ou e uma caixa unificada que pode incluir outros canais no futuro?

**Fonte dos dados:**
- Meta Cloud API (webhook incoming) ou apenas leitura de historico?
- Mensagens sao salvas na tabela `messages` ja existente?
- Qual o shape atual da tabela `messages`?

**Escopo da primeira entrega:**
- Listar conversas por contato
- Abrir thread de mensagens
- Responder via API (exige token da Meta configurado)
- Ou apenas visualizar historico (sem envio)?

**Integracao com Contatos:**
- Inbox deve criar contato automaticamente ao receber mensagem de numero nao cadastrado?
- Ou apenas vincular se numero ja existir?

**Indicadores de status:**
- Nao lida / Lida / Respondida
- Badge de nao lidas na sidebar (semelhante ao badge de tarefas vencidas)

### Rascunho de escopo minimo

Para uma primeira entrega funcional sem integracao real da Meta API:

**Modo simulado (mock/seed):**
- Listar conversas do seed com timestamps e contato
- Abrir thread de mensagens do contato
- Campo de resposta (sem envio real, apenas registra no banco)

**Modo real (Meta Cloud API integrado):**
- Receber webhook com mensagem entrante
- Salvar em `messages`
- Exibir no inbox em tempo real (pode usar Supabase Realtime)
- Responder via API (exige token e numero de telefone verificado na Meta)

Recomendacao: implementar modo simulado primeiro, com estrutura compativel com o modo real.

### Shape esperado da tabela `messages`

```sql
messages (
  id          uuid primary key,
  workspace_id uuid not null references workspaces(id),
  contact_id  uuid references contacts(id),
  direction   text check (direction in ('inbound', 'outbound')),
  content     text not null,
  wa_id       text,           -- id da mensagem no WhatsApp
  status      text check (status in ('sent', 'delivered', 'read', 'failed')),
  created_at  timestamptz default now()
)
```

Se o schema atual divergir, adaptar o app ao schema existente.

### Decisoes de produto a confirmar com o usuario

1. Primeira entrega e modo simulado ou integrado?
2. Inbox cria contatos automaticamente?
3. Inbox fica em `/dashboard/inbox` ou em outra rota?
4. Layout da pagina: lista de conversas a esquerda + thread a direita (split view)?

## Tarefa 5 — Planejamento tecnico do Inbox (se decisao tomada)

Apos confirmar as respostas acima, documentar:

### Rota e layout

```
/dashboard/inbox
  — lista de conversas (sidebar esquerda)
  — thread de mensagens (painel direito)
  — estado de URL: /dashboard/inbox?contactId=...
```

### Componentes estimados

- `app/(dashboard)/dashboard/inbox/page.tsx` — Server Component inicial
- `components/inbox/inbox-client.tsx` — Client Component com Supabase Realtime
- `components/inbox/conversation-list.tsx` — lista de contatos com ultima mensagem
- `components/inbox/conversation-thread.tsx` — mensagens do contato selecionado
- `components/inbox/message-input.tsx` — campo de resposta
- `components/inbox/message-bubble.tsx` — bolha de mensagem inbound/outbound

### Hook

- `hooks/use-inbox.ts` — lista de conversas, mensagens por contato, envio, subscribe realtime

### Actions

- `app/(dashboard)/dashboard/inbox/actions.ts`
  - `sendMessageAction` — salva mensagem no banco, chama API da Meta se configurada
  - `markAsReadAction` — atualiza status das mensagens do contato

### Badge na sidebar

- Contar mensagens `direction = 'inbound'` com `status != 'read'`
- Mesmo padrao do badge de tarefas vencidas

## Criterio de conclusao desta sessao

- Fluxos de Vendas validados no navegador
- Bugs criticos corrigidos
- Seed de vendas completo
- Decisoes de produto do Inbox documentadas aqui ou confirmadas com o usuario
- `npm run build` limpo ao final

## Fora do escopo desta sessao

- Implementar o Inbox
- Integrar Meta Cloud API
- Comissoes ou metas de faturamento
- Relatorios exportaveis (PDF/CSV) para Vendas

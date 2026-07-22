# Spec — Semana 02 Dia 03 Manha

## Contexto

Todos os quatro modulos operacionais estao estaveis:
contatos, pipeline, tarefas e vendas.

O dashboard atual tem dois cards KPI (receita da semana + tarefas pendentes)
e dois widgets (tarefas e vendas). Mas e uma visao estatica.

Esta manha entregamos o Dashboard de Metricas completo:
uma visao temporal centrada em semanas que responde diretamente
ao problema central descrito no briefing — "cegueira na operacao".

O empresario abre o dashboard e ve exatamente como a semana esta indo,
como se compara com semanas anteriores, e onde estao os gargalos do funil.

---

## Objetivo da manha

Fazer upgrade completo da rota `/dashboard`.

A pagina resultante tem cinco secoes:

1. **Seletor de semana** — navegar entre semanas
2. **KPIs da semana selecionada** — 4 cards com variacao
3. **Grafico de evolucao** — 12 semanas, combinado linha + barra
4. **Funil de conversao** — barras horizontais por etapa
5. **Feed de atividades** — top 10 da semana selecionada

---

## Secao 1 — Seletor de semana

### Componente: `WeekSelector`

Arquivo: `components/dashboard/week-selector.tsx`

Props:
```ts
interface WeekSelectorProps {
  selectedWeek: string   // YYYY-MM-DD (segunda-feira da semana)
  onChange: (weekStart: string) => void
}
```

Layout:
```
[ ← Semana anterior ]  [ Semana 15 · 8 a 14 abr ]  [ Proxima semana → ]
                              [ Hoje ]
```

Comportamento:
- Calcular o label a partir de `selectedWeek`:
  `format(weekStart, "d MMM") + " a " + format(endOfWeek, "d MMM yyyy")`
- Numero da semana: `format(weekStart, "w", { locale: ptBR })`
- Botao "Hoje" aparece apenas quando a semana selecionada nao e a semana atual
- Navegar para frente maximo ate a semana atual (nao futuro)
- Navegar para tras sem limite (mas nao mostrar mais de 52 semanas no grafico)

Estado inicial: semana atual.

Implementacao sugerida:
- Componente Client (`'use client'`)
- `selectedWeek` e `onChange` vem do componente pai (dashboard)
- Usar `startOfWeek(new Date(), { weekStartsOn: 1 })` para semana atual
- Navegar: `addDays(selectedWeek, ±7)`

---

## Secao 2 — KPIs da semana

### Componente: `WeekKpis`

Arquivo: `components/dashboard/week-kpis.tsx`

Props:
```ts
interface WeekKpisProps {
  workspaceId: string
  weekStart: string    // YYYY-MM-DD
}
```

Quatro cards:

| Card | Metrica | Comparacao |
|------|---------|------------|
| Faturamento | sum(sales.value) WHERE status='paid' AND na semana | vs semana anterior |
| Novos leads | count(contacts) criados na semana | vs semana anterior |
| Conversoes | count(contacts) que avancaram para estagio "Fechado" na semana (via activities.type='stage_change') | vs semana anterior |
| Tarefas concluidas | count(tasks) completadas na semana (completed_at na semana) | vs semana anterior |

Cada card usa o `VariationBadge` ja existente em `sales-widget.tsx`.
Extrair `VariationBadge` para `components/ui/variation-badge.tsx` para reutilizar.

Queries necessarias (todas com workspace_id):

```sql
-- Faturamento da semana
SELECT SUM(value) FROM sales
WHERE workspace_id = $1
  AND status = 'paid'
  AND sale_date >= $weekStart AND sale_date <= $weekEnd

-- Novos leads
SELECT COUNT(*) FROM contacts
WHERE workspace_id = $1
  AND deleted_at IS NULL
  AND created_at >= $weekStartTs AND created_at < $weekEndTs

-- Conversoes para fechado
SELECT COUNT(DISTINCT contact_id) FROM activities
WHERE workspace_id = $1
  AND type = 'stage_change'
  AND content ILIKE '%Fechado%'
  AND created_at >= $weekStartTs AND created_at < $weekEndTs

-- Tarefas concluidas
SELECT COUNT(*) FROM tasks
WHERE workspace_id = $1
  AND completed_at >= $weekStartTs AND completed_at < $weekEndTs
```

Cada query e executada tanto para a semana selecionada quanto para a semana anterior
(mesmo offset -7 dias) para calcular a variacao.

Implementacao:
- Server Component que recebe `weekStart` como prop
- Calcular datas no servidor com `date-fns`
- Usar `Promise.all` para todas as queries em paralelo
- Envolver em `Suspense` com `WeekKpisSkeleton` no pai

---

## Secao 3 — Grafico de evolucao (12 semanas)

### Componente: `EvolutionChart`

Arquivo: `components/dashboard/evolution-chart.tsx`

Props:
```ts
interface EvolutionChartProps {
  data: Array<{
    weekLabel: string     // ex: "Sem 12"
    weekStart: string     // YYYY-MM-DD
    revenue: number
    leads: number
    isSelected: boolean
  }>
}
```

Tipo de grafico: CSS/HTML puro (sem biblioteca externa).

Layout:
- Barras verticais representando `revenue` (faturamento)
- Pontos conectados representando `leads` (novos contatos)
- A semana selecionada tem a barra em cor mais intensa
- Altura proporcional ao maior valor do periodo

Dados calculados pelo pai (`WeeklyEvolution` Server Component):
- Buscar as ultimas 12 semanas a partir da semana atual
- Para cada semana: somar faturamento pago e contar leads

Query:
```sql
-- Por semana: executar para cada uma das 12 semanas
-- Ou melhor: buscar todos os registros do periodo de 12 semanas
-- e agrupar no servidor em JS

SELECT id, created_at FROM contacts
WHERE workspace_id = $1
  AND deleted_at IS NULL
  AND created_at >= $twelveWeeksAgo

SELECT value, sale_date FROM sales
WHERE workspace_id = $1
  AND status = 'paid'
  AND sale_date >= $twelveWeeksAgoKey
```

Agrupar os resultados por semana em JavaScript:
```ts
function groupByWeek<T extends { date: string }>(
  items: T[],
  weeks: Date[],
  getDate: (item: T) => string
): Map<string, T[]>
```

Implementacao:
- `WeeklyEvolution` = Server Component que busca e agrupa os dados
- `EvolutionChart` = Client Component que renderiza o grafico
- Envolver em `Suspense` com skeleton de altura fixa (260px)

---

## Secao 4 — Funil de conversao

### Componente: `ConversionFunnel`

Arquivo: `components/dashboard/conversion-funnel.tsx`

Props:
```ts
interface ConversionFunnelProps {
  stages: Array<{
    name: string
    color: string
    count: number
    conversionRate: number | null  // % que veio da etapa anterior
  }>
}
```

Layout para cada etapa:
```
● Nome da etapa     ████████████████████░░░░░░░░░  32 contatos  ↓ 71%
```

Regras:
- Barra horizontal proporcional ao maior count
- Percentual de conversao: count_atual / count_anterior * 100
- Primeira etapa nao tem percentual de conversao
- Etapas com count = 0 mostram barra vazia mas permanecem visiveis

Query:
```sql
SELECT ps.name, ps.color, ps.position, COUNT(c.id) as contacts_count
FROM pipeline_stages ps
LEFT JOIN contacts c
  ON c.pipeline_stage_id = ps.id AND c.deleted_at IS NULL
WHERE ps.workspace_id = $1
GROUP BY ps.id, ps.name, ps.color, ps.position
ORDER BY ps.position ASC
```

Implementacao:
- `FunnelData` = Server Component que busca stages + counts
- `ConversionFunnel` = Client Component (para hover tooltips futuros)
- Calcular `conversionRate` no servidor antes de passar como prop
- Sem filtro de semana — sempre reflete o estado atual do pipeline

---

## Secao 5 — Feed de atividades

### Componente: `WeekActivities`

Arquivo: `components/dashboard/week-activities.tsx`

Props:
```ts
interface WeekActivitiesProps {
  workspaceId: string
  weekStart: string
}
```

Query:
```sql
SELECT a.type, a.content, a.created_at, c.name as contact_name
FROM activities a
LEFT JOIN contacts c ON c.id = a.contact_id
WHERE a.workspace_id = $1
  AND a.created_at >= $weekStartTs
  AND a.created_at < $weekEndTs
ORDER BY a.created_at DESC
LIMIT 10
```

Layout por atividade:
- Icone por tipo: `stage_change` → ArrowRight, `task` → CheckSquare, `sale` → DollarSign, `note` → FileText
- Nome do contato + descricao resumida da atividade
- Timestamp relativo (ex: "ha 3h")

Agrupar por tipo com contador no topo:
```
3 mudancas de etapa · 2 tarefas concluidas · 1 venda
```

Implementacao:
- Server Component
- Envolver em Suspense com skeleton de 10 linhas

---

## Estrutura completa da pagina renovada

```
/dashboard
├── PageHeader (titulo + data da semana selecionada)
├── WeekSelector (client — gerencia selectedWeek em state)
├── Suspense > WeekKpis (server — 4 cards com variacao)
├── grid cols-2:
│   ├── Suspense > WeeklyEvolution > EvolutionChart (grafico)
│   └── Suspense > FunnelData > ConversionFunnel (funil)
└── Suspense > WeekActivities (feed)
```

Como `WeekSelector` e client e os filhos sao server:
- Usar padrao de URL params: `selectedWeek` na query string
- `WeekSelector` faz `router.push('?week=YYYY-MM-DD')`
- `page.tsx` le `searchParams.week` e passa para os filhos
- Isso permite que cada Suspense recarregue ao mudar a semana

---

## Componentes a extrair antes de implementar

### `VariationBadge`
- Extrair de `components/dashboard/sales-widget.tsx`
- Mover para `components/ui/variation-badge.tsx`
- Exportar e importar nos dois locais

### `WeekKpisSkeleton`
- 4 cards skeleton no mesmo grid dos KPIs atuais

### `EvolutionChartSkeleton`
- Retangulo de 260px com animate-pulse

### `ConversionFunnelSkeleton`
- 4 linhas skeleton representando etapas

### `WeekActivitiesSkeleton`
- 5 linhas skeleton com icone + texto

---

## Queries a validar no Supabase antes de implementar

### Query 1 — Faturamento semanal agrupado
```sql
SELECT
  date_trunc('week', sale_date::timestamp) as week,
  SUM(value) as total,
  COUNT(*) as count
FROM sales
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND status = 'paid'
  AND sale_date >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1 ASC;
```

### Query 2 — Taxa de conversao do funil
```sql
SELECT
  ps.name as stage_name,
  ps.position,
  COUNT(c.id) as contacts_count
FROM pipeline_stages ps
LEFT JOIN contacts c
  ON c.pipeline_stage_id = ps.id
  AND c.deleted_at IS NULL
WHERE ps.workspace_id = 'SEU_WORKSPACE_ID'
GROUP BY ps.id, ps.name, ps.position
ORDER BY ps.position ASC;
```

### Query 3 — Atividade por semana
```sql
SELECT
  date_trunc('week', created_at) as week,
  type,
  COUNT(*) as count
FROM activities
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2
ORDER BY 1 ASC, 2;
```

Substituir `SEU_WORKSPACE_ID` pelo id do workspace do seed antes de executar.
Se qualquer query retornar erro: identificar e criar migration de correcao.

---

## Componentes necessarios — lista completa

| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `components/dashboard/week-selector.tsx` | Client | Navegacao entre semanas |
| `components/dashboard/week-kpis.tsx` | Server | 4 cards KPI da semana |
| `components/dashboard/weekly-evolution.tsx` | Server | Busca e agrupa dados das 12 semanas |
| `components/dashboard/evolution-chart.tsx` | Client | Renderiza grafico CSS |
| `components/dashboard/funnel-data.tsx` | Server | Busca stages e counts |
| `components/dashboard/conversion-funnel.tsx` | Client | Renderiza barras horizontais |
| `components/dashboard/week-activities.tsx` | Server | Feed de atividades da semana |
| `components/ui/variation-badge.tsx` | Client | Extraido do sales-widget |

---

## Ordem de implementacao recomendada

1. Extrair `VariationBadge` para `components/ui/variation-badge.tsx`
2. Criar `WeekSelector` — apenas UI, sem queries
3. Atualizar `page.tsx` para ler `searchParams.week` e renderizar esqueleto da nova estrutura
4. Implementar `WeekKpis` com as 4 queries + variacao
5. Implementar `WeeklyEvolution` + `EvolutionChart`
6. Implementar `FunnelData` + `ConversionFunnel`
7. Implementar `WeekActivities`
8. Criar todos os skeletons
9. Ajustar responsividade mobile
10. `npm run build`

---

## Criterio de conclusao da manha

- [ ] Seletor de semana funcional (navegar para frente e para tras)
- [ ] 4 KPIs carregando dados reais com variacao vs semana anterior
- [ ] Grafico de evolucao mostrando 12 semanas com semana atual destacada
- [ ] Funil de conversao com counts reais por etapa e percentuais
- [ ] Feed de atividades da semana selecionada
- [ ] Skeletons para todos os blocos
- [ ] Mudanca de semana recarrega apenas os blocos afetados (Suspense)
- [ ] `npm run build` limpo

---

## Fora do escopo desta manha

- Exportacao do dashboard em PDF ou imagem
- Metas de faturamento configuradas pelo usuario
- Comparativo entre usuarios do workspace
- Notificacoes baseadas em thresholds
- Grafico com biblioteca externa (Recharts ou Chart.js)
- Dashboard separado por etapa do funil
- Filtros por tag ou produto no dashboard

# Spec - Semana 02 Dia 02 Manha

## Contexto

Contatos, Pipeline e Tarefas estao estaveis e integrados.
O proximo modulo e Vendas, que passa a mostrar faturamento real do negocio
e melhora muito a demonstracao comercial do produto.

Objetivo da manha:
- Entregar a primeira versao funcional de `/dashboard/sales`
- Trabalhar com dados do seed
- Fechar CRUD basico e filtros de periodo
- Deixar totalizadores coerentes com os filtros ativos

## Objetivo do modulo

O modulo de Vendas responde:
- Quanto entrou no periodo
- Quantas vendas foram feitas
- Qual o ticket medio
- Quais produtos estao puxando resultado
- Qual o status financeiro dos lancamentos

Este modulo nao tenta fazer financeiro completo.
Ele organiza lancamentos de venda por workspace, com leitura clara de faturamento.

## Estrutura da rota

Rota: `/dashboard/sales`

Layout da pagina:
1. `PageHeader`
   - Titulo: `Vendas`
   - Descricao dinamica com resumo do periodo ativo
2. Controle de visualizacao
   - Tabs: `Lancamentos` e `Relatorio`
   - Visualizacao padrao: `Lancamentos`
3. Conteudo principal
   - `Lancamentos`: toolbar, lista, totalizador e modal
   - `Relatorio`: KPIs, grafico, ranking de produtos e tabela de evolucao

## Visao 1: Lancamentos

### SalesToolbar

Responsabilidades:
- filtro de periodo
- filtro de status
- busca por produto
- alternar range personalizado
- abrir modal de novo lancamento

Controles:
- Periodo:
  - `Esta semana`
  - `Este mes`
  - `Ultimos 3 meses`
  - `Personalizado`
- Status:
  - `Todos`
  - `Pago`
  - `Pendente`
  - `Cancelado`
- Busca:
  - input com debounce para nome do produto/servico
- CTA:
  - botao `Novo lancamento`

Comportamento:
- mudar qualquer filtro recalcula lista e totalizadores
- periodo personalizado abre dois campos `from` e `to`
- o estado dos filtros fica no client, dentro do hook `useSales`

### SalesList

Lista em tabela, ordenada por data da venda desc, depois `created_at` desc.

Colunas:
- Produto
- Contato
- Valor
- Data
- Status
- Acoes

Detalhes por coluna:
- Produto:
  - nome do produto/servico
  - opcionalmente observacao curta abaixo, se existir
- Contato:
  - nome do contato vinculado
  - se nao houver contato: `Sem contato`
- Valor:
  - sempre formatado em BRL
- Data:
  - formato curto brasileiro
- Status:
  - badge visual
  - `pago`: verde
  - `pendente`: amber
  - `cancelado`: cinza/vermelho suave
- Acoes:
  - `Editar`
  - `Excluir`

Estados:
- loading: skeleton de tabela
- vazio sem filtros: mensagem de vazio orientada a criar primeiro lancamento
- vazio com filtros: mensagem `Nenhum lancamento encontrado para os filtros atuais`

### Totalizador no rodape

Sempre visivel abaixo da lista filtrada.

Exibir:
- Total pago
- Total pendente
- Total cancelado
- Total geral filtrado

Regras:
- total geral pode incluir todos os status
- total por status respeita busca e periodo
- cancelado entra separado, sem misturar com faturamento pago

## Visao 2: Relatorio

### Cards de KPI

No topo da view:
- `Faturamento do periodo`
  - soma de vendas com status `pago`
- `Ticket medio`
  - media do valor de vendas do periodo
- `Total de vendas`
  - quantidade de registros filtrados
- `Melhor produto`
  - produto com maior soma ou maior contagem no periodo

### Grafico de faturamento por semana

Tipo:
- barras verticais

Eixo X:
- semanas do periodo filtrado

Eixo Y:
- soma de valor pago por semana

Se nao houver biblioteca de chart no projeto:
- implementar versao simples em HTML/CSS
- barras proporcionais a partir do maior valor

### Lista de produtos mais vendidos

Exibir:
- nome do produto
- quantidade
- valor total
- percentual sobre o faturamento pago do periodo

Ordenacao:
- maior faturamento primeiro

### Evolucao semana a semana

Tabela simples:
- Semana
- Total pago
- Quantidade de vendas
- Ticket medio

## Modal de venda

Arquivo sugerido:
- `components/sales/sale-modal.tsx`

Props:
- `mode: 'create' | 'edit'`
- `sale?: SaleWithContact`
- `workspaceId: string`
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `onSuccess?: () => void`

Campos:
- Produto/servico
  - input com autocomplete baseado em produtos ja usados no workspace
  - obrigatorio
- Valor
  - input numerico formatado em `R$`
  - obrigatorio
- Contato vinculado
  - select com busca
  - opcional
- Data da venda
  - date picker
  - padrao: hoje
- Forma de pagamento
  - select:
    - `PIX`
    - `Cartao`
    - `Boleto`
    - `Dinheiro`
    - `Transferencia`
- Status
  - select:
    - `pago`
    - `pendente`
    - `cancelado`
- Observacoes
  - textarea opcional

Validacoes:
- produto com minimo de 2 caracteres
- valor maior que zero
- status obrigatorio
- forma de pagamento obrigatoria
- data valida

Toasts:
- `Lancamento criado com sucesso`
- `Lancamento atualizado com sucesso`
- `Lancamento excluido com sucesso`
- erros sempre em portugues e descritivos

## Estrutura de dados

Tabela `sales` ja existe no schema e deve ser usada.
Adaptar os tipos atuais para a modelagem real do produto.

Shape esperado na app:

```ts
export type SaleWithContact = Tables<'sales'> & {
  contact: {
    id: string
    name: string
    company: string | null
  } | null
}
```

Entrada do form:

```ts
export interface CreateSaleInput {
  product: string
  amount: number
  contact_id?: string
  sold_at: string
  payment_method: 'pix' | 'card' | 'boleto' | 'cash' | 'transfer'
  status: 'paid' | 'pending' | 'cancelled'
  notes?: string
}
```

Observacao:
- se o schema atual usar nomes diferentes, alinhar o app ao schema existente
- evitar migration nova na manha, a menos que o schema esteja claramente insuficiente

## Server Actions necessarias

Arquivo:
- `app/(dashboard)/dashboard/sales/actions.ts`

### `createSaleAction`

Responsabilidades:
- validar input
- inserir `sale`
- revalidar:
  - `/dashboard/sales`
  - `/dashboard`

Resposta:

```ts
{ data: { id: string } | null; error: string | null }
```

### `updateSaleAction`

Responsabilidades:
- validar input parcial
- atualizar registro
- revalidar:
  - `/dashboard/sales`
  - `/dashboard`

### `deleteSaleAction`

Responsabilidades:
- excluir registro
- revalidar:
  - `/dashboard/sales`
  - `/dashboard`

### `getSalesSummaryAction`

Responsabilidades:
- receber filtros do periodo/status/busca
- devolver:
  - faturamento pago
  - total de vendas
  - ticket medio
  - melhor produto
  - agregacoes por semana
  - agregacoes por produto

Uso:
- alimentar a view `Relatorio`
- evitar duplicacao de calculo pesado em varios componentes

## Hook `useSales`

Arquivo:
- `hooks/use-sales.ts`

Responsabilidades:
- buscar vendas do workspace com join de contato
- manter filtros
- derivar lista filtrada
- derivar totalizadores
- expor `refetch`

Interface sugerida:

```ts
export interface UseSalesResult {
  sales: SaleWithContact[]
  filteredSales: SaleWithContact[]
  isLoading: boolean
  view: 'entries' | 'report'
  setView: (view: 'entries' | 'report') => void
  period: 'week' | 'month' | 'quarter' | 'custom'
  setPeriod: (period: 'week' | 'month' | 'quarter' | 'custom') => void
  status: 'all' | 'paid' | 'pending' | 'cancelled'
  setStatus: (status: 'all' | 'paid' | 'pending' | 'cancelled') => void
  search: string
  setSearch: (value: string) => void
  customFrom: string
  setCustomFrom: (value: string) => void
  customTo: string
  setCustomTo: (value: string) => void
  totals: {
    paid: number
    pending: number
    cancelled: number
    all: number
  }
  refetch: () => void
}
```

## Componentes sugeridos

- `components/sales/sales-client.tsx`
- `components/sales/sales-toolbar.tsx`
- `components/sales/sales-list.tsx`
- `components/sales/sales-list-row.tsx`
- `components/sales/sales-report.tsx`
- `components/sales/sales-kpis.tsx`
- `components/sales/sale-modal.tsx`

## Comportamentos importantes

### Filtros de periodo

Regras:
- `Esta semana`: inicio da semana atual ate hoje/fim da semana
- `Este mes`: primeiro ao ultimo dia do mes atual
- `Ultimos 3 meses`: janela movel de 90 dias ou 3 meses calendario, escolher uma regra e manter consistente
- `Personalizado`: usa `customFrom` e `customTo`

### Busca por produto

Busca simples por `ilike` no client fetched set ou no banco, conforme volume.
Para esta etapa, pode ser client-side se a lista ainda for pequena.

### Totalizadores

Sempre recalcular a partir de `filteredSales`.
Nao duplicar logica de soma em varios componentes.

### Contato vinculado

Se houver `contact_id`, manter link futuro para `/dashboard/contacts/[id]`.
Nao e necessario abrir modal do contato nessa entrega.

## Seed e dados iniciais

A entrega da manha deve funcionar com dados do seed atual.
Se o seed ja possuir vendas suficientes, usar esse conjunto.
Se nao possuir, complementar o seed depois da implementacao.

Minimo esperado para demo:
- varios produtos distintos
- status mistos
- datas em semanas diferentes
- pelo menos um lancamento sem contato vinculado

## Criterio de conclusao da manha

- Lista de vendas carregando dados do seed
- Filtro de periodo funcionando
- Criar lancamento funcionando
- Editar lancamento funcionando
- Excluir lancamento funcionando
- Totalizador do rodape atualizando conforme filtros

## Ordem de implementacao recomendada

1. Ler schema real de `sales` e ajustar tipos
2. Criar `actions.ts` do modulo
3. Criar `useSales`
4. Montar pagina `/dashboard/sales` com tabs
5. Implementar `SalesToolbar`
6. Implementar `SalesList`
7. Implementar `SaleModal`
8. Fechar totalizadores
9. Implementar `Relatorio`
10. Rodar `npm run build`

## Fora do escopo da manha

- Comissoes
- Parcelamento detalhado
- DRE
- Conciliacao bancaria
- Metas de faturamento
- Integracao com pagamentos
- Automacao de cobranca

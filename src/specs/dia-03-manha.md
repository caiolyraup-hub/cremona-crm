# Spec — Dia 03 Manhã: Lista de Contatos

## Objetivo
Construir a página de contatos com lista completa, busca em tempo real,
filtro por etiqueta e paginação por página. O dado vem do Supabase com
RLS — só os contatos do workspace ativo do usuário.

## Arquivos a criar ou modificar

| Arquivo | Ação |
|---|---|
| `app/(dashboard)/dashboard/contacts/page.tsx` | Modificar — adicionar busca + filtros |
| `app/(dashboard)/dashboard/contacts/loading.tsx` | Criar — skeleton de loading |
| `components/contacts/contacts-list.tsx` | Criar — componente client com busca e filtros |
| `components/contacts/contact-row.tsx` | Criar — linha individual da tabela |
| `lib/actions/contacts.ts` | Criar — Server Action para buscar contatos paginados |

---

## Arquitetura de dados

### Query base no Supabase
```ts
supabase
  .from('contacts')
  .select('id, name, phone, email, tags, pipeline_stage_id, created_at', { count: 'exact' })
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false })
```

### Filtros dinâmicos
- **Busca por texto**: `ilike` em `name` e `phone` (OR):
  ```ts
  .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
  ```
- **Filtro por etiqueta**: `contains` no array `tags`:
  ```ts
  .contains('tags', [tag])
  ```
- **Paginação**: range por offset/limit:
  ```ts
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  ```

### Por que paginação por página (não infinite scroll)?
- O RD Station (referência do produto) usa paginação clássica
- Mais simples de implementar corretamente com Server Actions
- Facilita o compartilhamento de links diretos para uma página específica
- Infinite scroll adiciona complexidade de ref/IntersectionObserver sem ganho real nesta fase

**PAGE_SIZE = 20**

---

## Server Action: `fetchContacts`

Arquivo: `lib/actions/contacts.ts`

```ts
'use server'

interface FetchContactsParams {
  workspaceId: string
  query?: string
  tag?: string
  page?: number
}

interface FetchContactsResult {
  contacts: ContactRow[]
  total: number
  error: string | null
}

export async function fetchContacts(params: FetchContactsParams): Promise<FetchContactsResult>
```

Passos internos:
1. Criar server client (`lib/supabase/server.ts`)
2. Montar query base com `workspace_id`
3. Aplicar filtro de busca se `query` não estiver vazio (trim, min 1 char)
4. Aplicar filtro de tag se `tag` não estiver vazio
5. Aplicar `.range()` baseado em `page`
6. Retornar `{ contacts, total, error }`

---

## Componente ContactsList

Arquivo: `components/contacts/contacts-list.tsx`

**Client Component** — gerencia o estado de busca, tag e página.

### Estado local
```ts
const [query, setQuery] = useState('')
const [debouncedQuery, setDebouncedQuery] = useState('')
const [selectedTag, setSelectedTag] = useState('')
const [page, setPage] = useState(0)
const [contacts, setContacts] = useState<ContactRow[]>([])
const [total, setTotal] = useState(0)
const [loading, setLoading] = useState(false)
```

### Debounce
- Usar `useEffect` com `setTimeout(300ms)` no `query`
- Limpar timeout no cleanup
- Resetar `page` para 0 quando query ou tag mudar

### Props
```ts
interface ContactsListProps {
  workspaceId: string
  availableTags: string[]  // etiquetas únicas do workspace para o filtro
}
```

### Layout visual

```
[ Busca... ] [ Filtro por etiqueta ▼ ]          [ + Novo contato ]
─────────────────────────────────────────────────────────────────
Nome          Telefone       E-mail           Etiquetas    Data
─────────────────────────────────────────────────────────────────
Maria Silva   (11) 99999-... maria@...        cliente vip  22/04
...
─────────────────────────────────────────────────────────────────
                  < Anterior  Página 1 de 3  Próxima >
```

### Busca
- Input com ícone de lupa (lucide Search)
- Placeholder: "Buscar por nome ou telefone"
- Debounce de 300ms antes de disparar a query
- Mínimo 0 caracteres (busca vazia retorna todos)

### Filtro de etiqueta
- `<select>` nativo com opção "Todas as etiquetas" como default
- Opções geradas a partir de `availableTags`
- Mudança reseta página para 0

---

## Componente ContactRow

Arquivo: `components/contacts/contact-row.tsx`

### Campos exibidos por coluna

| Coluna | Campo | Formato |
|---|---|---|
| Nome | `name` | Texto + avatar com iniciais (32px) |
| Telefone | `phone` | Formatado ou "—" se vazio |
| E-mail | `email` | Truncado ou "—" se vazio |
| Etiquetas | `tags` | Pills coloridas (max 2 visíveis + "+N") |
| Cadastro | `created_at` | dd/MM/yyyy |

### Comportamento
- Linha clicável (cursor-pointer) — futuramente abre modal de detalhe
- Hover: `bg-gray-50`
- Sem ação de clique por ora (preparar estrutura)

---

## Página de loading — `loading.tsx`

Exibir skeleton enquanto os dados chegam:
- 5 linhas de skeleton (rounded-md, bg-gray-100, animate-pulse)
- Mesmas colunas da tabela real (Nome / Telefone / Email / Tags / Data)

---

## Como buscar `availableTags` para o filtro

Na `page.tsx` (Server Component), antes de renderizar `ContactsList`:
```ts
const { data: contacts } = await supabase
  .from('contacts')
  .select('tags')
  .eq('workspace_id', workspaceId)

const allTags = [...new Set(contacts?.flatMap(c => c.tags ?? []) ?? [])]
```

Passa `availableTags={allTags}` como prop para `ContactsList`.

---

## Estado vazio

Usar `EmptyState` de `components/ui/empty-state.tsx`:
- icon: `Users` (lucide)
- title: "Nenhum contato encontrado"
- description: Se há query ativa → "Tente buscar por outro nome ou telefone"
           Sem query → "Adicione seu primeiro contato para começar"
- action: Sem query → botão "Adicionar contato" (onClick a definir depois)

---

## Critérios de conclusão

- [ ] Lista exibe os 8 contatos do seed corretamente
- [ ] Busca por "Maria" filtra em tempo real (debounce 300ms)
- [ ] Filtro por etiqueta funciona (ex: "cliente vip")
- [ ] Paginação navega entre páginas sem recarregar a página inteira
- [ ] Estado vazio aparece quando busca não retorna resultados
- [ ] Loading skeleton aparece enquanto os dados chegam
- [ ] Zero erros de TypeScript
- [ ] `npm run build` passa sem erros

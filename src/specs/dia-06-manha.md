# Spec — Dia 06 manhã: Módulo de Tarefas

## Contexto

Último dia da Semana 01. Pipeline está 100% completo.
O módulo de Tarefas conecta CRM e Pipeline:
um contato pode ter tarefas vinculadas, e o card no Kanban
já exibe `open_task_count` — agora implementamos o módulo completo.

---

## Visão geral do módulo

Página `/dashboard/tasks` com duas abas:

- **Hoje** — tarefas com `due_date = hoje` + tarefas vencidas sem data (`due_date < hoje`)
- **Todas** — todas as tarefas abertas, com paginação

Ordenação universal:
1. Vencidas (due_date < hoje) → vermelho
2. Vencendo hoje → laranja
3. Futuras → data asc
4. Sem data → por último

Cada tarefa exibe: checkbox de conclusão, título, contato vinculado (avatar + nome),
prioridade (badge: alta/média/baixa), data de vencimento formatada, ações (editar, deletar).

---

## Schema da tabela `tasks` (já existe)

```sql
tasks (
  id uuid PK,
  workspace_id uuid FK workspaces,
  contact_id uuid FK contacts nullable,
  title text,
  due_date date nullable,
  priority text default 'medium',  -- 'high' | 'medium' | 'low'
  completed_at timestamptz nullable,
  created_at timestamptz
)
```

Tarefa aberta = `completed_at IS NULL`
Tarefa concluída = `completed_at IS NOT NULL`

---

## Arquivos a criar

### 1. `app/(dashboard)/dashboard/tasks/actions.ts`

```ts
'use server'

createTaskAction(input: CreateTaskInput, workspaceId: string)
  → { error: string | null; task?: TaskRow }

updateTaskAction(id: string, input: Partial<CreateTaskInput>, workspaceId: string)
  → { error: string | null }

completeTaskAction(id: string, workspaceId: string)
  → { error: string | null }
  // SET completed_at = NOW() WHERE id AND workspace_id

reopenTaskAction(id: string, workspaceId: string)
  → { error: string | null }
  // SET completed_at = NULL WHERE id AND workspace_id

deleteTaskAction(id: string, workspaceId: string)
  → { error: string | null }
```

Todas as ações fazem `revalidatePath('/dashboard/tasks')`.
`completeTaskAction` também registra activity `task_completed` no contato (se houver).

### 2. `hooks/use-tasks.ts`

```ts
export interface UseTasksResult {
  todayTasks: TaskWithContact[]
  allTasks: TaskWithContact[]
  isLoading: boolean
  completeTask: (id: string) => void   // optimistic
  reopenTask: (id: string) => void     // optimistic
  deleteTask: (id: string) => void     // optimistic
  refetch: () => void
}
```

**Fetch**: Busca todas as tarefas abertas do workspace com join em contacts:
```ts
supabase
  .from('tasks')
  .select('*, contact:contacts(id, name, company, tags)')
  .eq('workspace_id', workspaceId)
  .is('completed_at', null)
  .order('due_date', { ascending: true, nullsFirst: false })
```

**Derivações**:
- `todayTasks` = tarefas com `due_date <= hoje` (incluindo vencidas)
- `allTasks` = todas

**`completeTask`** (optimistic):
- Remove da lista localmente
- Chama `completeTaskAction` em background
- Rollback se error

**`deleteTask`** (optimistic):
- Remove da lista localmente
- Chama `deleteTaskAction` em background
- Rollback se error

### 3. `types/app.ts` — adicionar `TaskWithContact`

```ts
export type TaskWithContact = Tables<'tasks'> & {
  contact: { id: string; name: string; company: string | null; tags: string[] } | null
}
```

Também adicionar interface:

```ts
export interface CreateTaskInput {
  title: string
  contact_id: string  // '' = sem contato
  due_date: string    // '' = sem data (ISO date)
  priority: 'high' | 'medium' | 'low'
}
```

### 4. `app/(dashboard)/dashboard/tasks/page.tsx`

```tsx
'use client'

// Tab state: 'today' | 'all'
// Cria nova tarefa via TaskQuickAdd (inline) ou TaskModal (completo)
// Mostra TaskList para a aba ativa
```

Estrutura da página:

```
[PageHeader title="Tarefas" description="X tarefas para hoje"]
[TaskQuickAdd]
[Tabs: Hoje (badge count) | Todas]
[TaskList]
```

### 5. `components/tasks/task-quick-add.tsx`

Input inline para criar tarefa rápida sem modal:

```tsx
interface TaskQuickAddProps {
  stages?: Tables<'pipeline_stages'>[]
  workspaceId: string
  onCreated: () => void
}
```

UI:
```
[ + | _____________título_____________ | Criar ]
```

- Pressionar Enter submete
- Cria com prioridade `medium`, sem data, sem contato vinculado
- Feedback: toast.success + limpa o input
- Para detalhes (contato, data, prioridade): botão "Detalhes" abre TaskModal

### 6. `components/tasks/task-item.tsx`

Um item da lista de tarefas:

```tsx
interface TaskItemProps {
  task: TaskWithContact
  onComplete: (id: string) => void
  onReopen: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: TaskWithContact) => void
}
```

Layout horizontal:
```
[checkbox] [título] [contato avatar+nome] [prioridade] [data] [⋯ menu]
```

Estados visuais:
- Vencida (due_date < hoje, não concluída): título em `text-red-600`, data em vermelho
- Vencendo hoje: data em `text-amber-600`
- Concluída: título com `line-through text-gray-400`, checkbox checked com animação

**Checkbox de conclusão**:
```tsx
<button onClick={() => onComplete(task.id)} className="...">
  <div className={`h-4 w-4 rounded border-2 transition-all ${
    isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-[#378ADD]'
  }`}>
    {isCompleted && <Check size={10} className="text-white" />}
  </div>
</button>
```

**Badge de prioridade**:
- `high` → `bg-red-50 text-red-600 border border-red-200` "Alta"
- `medium` → `bg-amber-50 text-amber-600 border border-amber-200` "Média"
- `low` → `bg-gray-100 text-gray-500 border border-gray-200` "Baixa"

**Menu de ações** (MoreVertical):
- "Editar" → abre TaskModal
- "Excluir" → confirmação inline com segundo clique

### 7. `components/tasks/task-list.tsx`

```tsx
interface TaskListProps {
  tasks: TaskWithContact[]
  emptyMessage: string
  onComplete: (id: string) => void
  onReopen: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: TaskWithContact) => void
}
```

Usa `AnimatePresence` + `motion.div` para animação de risco ao concluir:
- O item não some imediatamente
- Mostra `line-through` por 400ms, depois `exit` com `opacity: 0, height: 0`

Agrupa por seção:
- **Vencidas** (header vermelho) — se existirem vencidas
- **Hoje** — tarefas do dia
- **Esta semana** — due entre amanhã e próximo domingo
- **Mais tarde** — futuras além de 7 dias
- **Sem data** — no final

Cada seção mostra seu título + count.

### 8. `components/tasks/task-modal.tsx`

Modal completo para criar/editar tarefa:

```tsx
interface TaskModalProps {
  mode: 'create' | 'edit'
  task?: TaskWithContact
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialContactId?: string  // pré-seleciona contato (usado ao criar do card)
}
```

Campos:
- **Título** (required, autoFocus)
- **Contato** — Select com busca (lista de contatos do workspace) ou "Sem contato"
- **Data de vencimento** — input type="date" ou "Sem data"
- **Prioridade** — Toggle ou Select: Alta / Média / Baixa

Footer: Cancelar + Criar tarefa / Salvar

Dirty check no modo edição (AlertDialog confirmar descarte).

---

## Integração com o Pipeline

O card do Kanban já mostra `open_task_count`. Quando o usuário clica
"Criar tarefa" no context menu do card:
- Abrir TaskModal com `initialContactId = contact.id`
- Após criar, chamar `refetch()` no usePipeline para atualizar o contador

No contexto do detalhe do contato (`contact-card.tsx`):
- Seção "Tarefas" já existe — adicionar botão "+ Nova tarefa" que abre TaskModal
- Após criar, revalidar o contato

---

## Critérios de conclusão

- [ ] Lista de tarefas com agrupamento por urgência
- [ ] Criar tarefa rápida (inline) e completa (modal)
- [ ] Marcar como concluída com animação de risco + saída suave
- [ ] Tarefas vencidas em vermelho
- [ ] Filtro por prioridade na aba "Todas"
- [ ] `npm run build` sem erros

---

## Ordem de implementação

1. `types/app.ts` — adicionar TaskWithContact e CreateTaskInput
2. `app/(dashboard)/dashboard/tasks/actions.ts`
3. `hooks/use-tasks.ts`
4. `components/tasks/task-item.tsx`
5. `components/tasks/task-list.tsx`
6. `components/tasks/task-quick-add.tsx`
7. `components/tasks/task-modal.tsx`
8. `app/(dashboard)/dashboard/tasks/page.tsx`
9. Conectar "Criar tarefa" no context menu do KanbanCard
10. Build final

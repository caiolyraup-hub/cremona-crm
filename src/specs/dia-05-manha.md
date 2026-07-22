# Dia 05 — Manhã: Pipeline Kanban

## Objetivo
Construir o segundo módulo mais importante do produto: o Pipeline Kanban.
Permite ao usuário visualizar e mover contatos entre as etapas do funil de vendas
via drag-and-drop, com atualização otimista no banco.

---

## 1. Instalar dependências

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- `@dnd-kit/core` — DnD engine (mais estável que react-beautiful-dnd no React 18+)
- `@dnd-kit/sortable` — lista/coluna sortable (usado para arrastar cards entre colunas)
- `@dnd-kit/utilities` — helpers de CSS e transform

---

## 2. Rota e arquivos a criar

```
app/(dashboard)/dashboard/pipeline/
  page.tsx                          ← Server Component (busca dados)
  actions.ts                        ← Server Actions

components/pipeline/
  pipeline-client.tsx               ← Client Component: DnD coordinator
  pipeline-column.tsx               ← Coluna droppable
  pipeline-card.tsx                 ← Card draggable
  stage-config-modal.tsx            ← Modal de configuração de etapas
```

---

## 3. Sidebar — adicionar item de navegação

Em `components/layout/sidebar.tsx`, adicionar item:
```
{ href: '/dashboard/pipeline', icon: KanbanSquare, label: 'Pipeline' }
```
(antes de Tarefas, depois de Contatos)

---

## 4. Estrutura de dados

### Tipos em `types/app.ts` — adicionar:

```ts
export interface KanbanContact {
  id: string
  name: string
  company: string | null
  tags: string[]
  pipeline_stage_id: string | null
  deal_value: number | null  // valor do deal associado mais recente, se existir
  has_open_task: boolean     // se tem task com status != 'done'
}

export interface KanbanColumn {
  stage: {
    id: string
    name: string
    color: string
    position: number
  } | null  // null = coluna "Sem estágio"
  contacts: KanbanContact[]
}
```

### Query na page.tsx:

```ts
// Buscar stages do workspace
const { data: stages } = await supabase
  .from('pipeline_stages')
  .select('id, name, color, position')
  .eq('workspace_id', workspaceId)
  .order('position')

// Buscar contacts com deal mais recente e task aberta
// contacts com deleted_at IS NULL
const { data: contacts } = await supabase
  .from('contacts')
  .select(`
    id, name, company, tags, pipeline_stage_id,
    deals(value, status),
    tasks(id, status)
  `)
  .eq('workspace_id', workspaceId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

### Agrupamento client-side (em `pipeline-client.tsx`):

```ts
function groupByStage(contacts: KanbanContact[], stages: Stage[]): KanbanColumn[] {
  const columns: KanbanColumn[] = [
    // Primeira coluna: sem estágio
    {
      stage: null,
      contacts: contacts.filter(c => !c.pipeline_stage_id)
    },
    // Demais colunas: por stage
    ...stages.map(stage => ({
      stage,
      contacts: contacts.filter(c => c.pipeline_stage_id === stage.id)
    }))
  ]
  // Remover "Sem estágio" se vazia
  return columns.filter((col, i) => i > 0 || col.contacts.length > 0)
}
```

---

## 5. Server Action: mover contato

### `app/(dashboard)/dashboard/pipeline/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function moveContactAction(
  contactId: string,
  newStageId: string | null,  // null = sem estágio
  workspaceId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verificar que o contato pertence ao workspace
  const { data: contactsRaw } = await supabase
    .from('contacts')
    .select('id, pipeline_stage_id')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .limit(1)

  const contacts = (contactsRaw ?? []) as { id: string; pipeline_stage_id: string | null }[]
  if (contacts.length === 0) return { error: 'Contato não encontrado' }

  const previousStageId = contacts[0].pipeline_stage_id
  if (previousStageId === newStageId) return {}  // nenhuma mudança

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .update({
      pipeline_stage_id: newStageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao mover contato' }

  // Registrar atividade de mudança de estágio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    type: 'stage_change',
    content: `Movido para ${newStageId ? 'novo estágio' : 'Sem estágio'}`,
  })

  revalidatePath('/dashboard/pipeline')
  return {}
}
```

---

## 6. Componente `pipeline-client.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { PipelineColumn } from './pipeline-column'
import { PipelineCard } from './pipeline-card'
import { StageConfigModal } from './stage-config-modal'
import { moveContactAction } from '@/app/(dashboard)/dashboard/pipeline/actions'
import type { KanbanContact, KanbanColumn } from '@/types/app'
import type { Tables } from '@/types/database'

interface PipelineClientProps {
  initialColumns: KanbanColumn[]
  workspaceId: string
  stages: Tables<'pipeline_stages'>[]
}

export function PipelineClient({
  initialColumns,
  workspaceId,
  stages,
}: PipelineClientProps) {
  const router = useRouter()
  const [columns, setColumns] = useState(initialColumns)
  const [activeContact, setActiveContact] = useState<KanbanContact | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },  // 8px de movimento para iniciar drag
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const contact = columns
      .flatMap(col => col.contacts)
      .find(c => c.id === event.active.id)
    setActiveContact(contact ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveContact(null)
    const { active, over } = event
    if (!over) return

    const contactId = active.id as string
    const newStageId = over.id === 'no-stage' ? null : (over.id as string)

    // Encontrar coluna atual
    const currentColumn = columns.find(col => col.contacts.some(c => c.id === contactId))
    const currentStageId = currentColumn?.stage?.id ?? null
    if (currentStageId === newStageId) return

    // Optimistic update
    setColumns(prev => {
      const contact = prev.flatMap(col => col.contacts).find(c => c.id === contactId)
      if (!contact) return prev

      return prev.map(col => {
        if (col.contacts.some(c => c.id === contactId)) {
          return { ...col, contacts: col.contacts.filter(c => c.id !== contactId) }
        }
        const isTarget = newStageId === null
          ? col.stage === null
          : col.stage?.id === newStageId
        if (isTarget) {
          return { ...col, contacts: [{ ...contact, pipeline_stage_id: newStageId }, ...col.contacts] }
        }
        return col
      })
    })

    // Persistir no banco
    startTransition(async () => {
      const result = await moveContactAction(contactId, newStageId, workspaceId)
      if (result.error) {
        toast.error(result.error)
        // Reverter: recarregar dados
        router.refresh()
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description={`${columns.reduce((sum, col) => sum + col.contacts.length, 0)} contatos no funil`}
        action={
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Settings size={15} />
            Configurar etapas
          </button>
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <PipelineColumn
              key={column.stage?.id ?? 'no-stage'}
              column={column}
              onCardClick={id => router.push(`/dashboard/contacts/${id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeContact && (
            <PipelineCard contact={activeContact} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      <StageConfigModal
        stages={stages}
        workspaceId={workspaceId}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
```

---

## 7. Componente `pipeline-column.tsx`

```tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { PipelineCard } from './pipeline-card'
import type { KanbanColumn, KanbanContact } from '@/types/app'

interface PipelineColumnProps {
  column: KanbanColumn
  onCardClick: (id: string) => void
}

export function PipelineColumn({ column, onCardClick }: PipelineColumnProps) {
  const columnId = column.stage?.id ?? 'no-stage'
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  const color = column.stage?.color ?? '#94a3b8'
  const name = column.stage?.name ?? 'Sem estágio'

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 rounded-md px-1 py-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-gray-700">{name}</h3>
        <span className="ml-auto text-xs font-medium text-gray-400">
          {column.contacts.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`min-h-[120px] flex-1 rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-[#378ADD] bg-blue-50' : 'border-transparent'
        }`}
      >
        <div className="flex flex-col gap-2">
          {column.contacts.map(contact => (
            <PipelineCard
              key={contact.id}
              contact={contact}
              onClick={() => onCardClick(contact.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## 8. Componente `pipeline-card.tsx`

```tsx
'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, DollarSign } from 'lucide-react'
import { getInitials, getAvatarColor, getTagColor } from '@/lib/formatters'
import type { KanbanContact } from '@/types/app'

interface PipelineCardProps {
  contact: KanbanContact
  onClick?: () => void
  isDragging?: boolean
}

export function PipelineCard({ contact, onClick, isDragging = false }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: contact.id,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const colors = getAvatarColor(contact.name)
  const visibleTags = contact.tags.slice(0, 2)
  const extraTags = contact.tags.length - 2

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border bg-white p-3 transition-shadow ${
        isDragging
          ? 'rotate-1 shadow-lg opacity-90'
          : 'border-gray-200 hover:border-[#378ADD]/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}
        >
          {getInitials(contact.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
          {contact.company && (
            <p className="truncate text-xs text-gray-400">{contact.company}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleTags.map(tag => (
            <span
              key={tag}
              className="rounded-full px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: getTagColor(tag) + '20',
                color: getTagColor(tag),
              }}
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
              +{extraTags}
            </span>
          )}
        </div>
      )}

      {/* Footer: deal value + open task indicator */}
      {(contact.deal_value || contact.has_open_task) && (
        <div className="mt-2 flex items-center gap-2.5 border-t border-gray-50 pt-2">
          {contact.deal_value && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700">
              <DollarSign size={11} />
              {contact.deal_value.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              })}
            </span>
          )}
          {contact.has_open_task && (
            <span className="flex items-center gap-1 text-xs text-amber-600" title="Tarefa pendente">
              <CheckSquare size={11} />
              Tarefa pendente
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 9. Componente `stage-config-modal.tsx`

Modal para gerenciar etapas do pipeline (adicionar, renomear, reordenar, remover).

### Funcionalidades:
- Lista as stages ordenadas por `position`
- Botão "Adicionar etapa" (nome + cor)
- Editar nome inline (click no nome)
- Reordenar via setas ↑↓
- Remover etapa (com confirmação se tiver contatos)

### Server Actions necessárias em `pipeline/actions.ts`:

```ts
export async function createStageAction(
  name: string,
  color: string,
  workspaceId: string
): Promise<{ error?: string }>

export async function updateStageAction(
  stageId: string,
  name: string,
  workspaceId: string
): Promise<{ error?: string }>

export async function deleteStageAction(
  stageId: string,
  workspaceId: string
): Promise<{ error?: string }>
// Antes de deletar: mover todos os contacts do stage para pipeline_stage_id = null

export async function reorderStagesAction(
  orderedIds: string[],
  workspaceId: string
): Promise<{ error?: string }>
// Atualiza position de cada stage com base no índice no array
```

### Paleta de cores para stages (usar seletor de swatches):
```ts
const STAGE_COLORS = [
  '#378ADD', // azul safira (padrão)
  '#22c55e', // verde
  '#f59e0b', // âmbar
  '#ef4444', // vermelho
  '#8b5cf6', // violeta
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#f97316', // laranja
  '#6b7280', // cinza
]
```

---

## 10. Page server component `pipeline/page.tsx`

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveWorkspace } from '@/lib/workspace'
import { PipelineClient } from '@/components/pipeline/pipeline-client'
import type { KanbanColumn, KanbanContact } from '@/types/app'
import type { Tables } from '@/types/database'

export default async function PipelinePage() {
  const supabase = await createClient()
  const workspace = await getActiveWorkspace(supabase)
  if (!workspace) redirect('/login')

  const workspaceId = workspace.id

  // Buscar stages
  const { data: stagesRaw } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position')

  const stages = (stagesRaw ?? []) as Tables<'pipeline_stages'>[]

  // Buscar contatos com deals e tasks
  const { data: contactsRaw } = await (supabase as any)
    .from('contacts')
    .select('id, name, company, tags, pipeline_stage_id, deals(value, status), tasks(id, status)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const rawContacts = (contactsRaw ?? []) as any[]

  const contacts: KanbanContact[] = rawContacts.map(c => ({
    id: c.id,
    name: c.name,
    company: c.company,
    tags: c.tags ?? [],
    pipeline_stage_id: c.pipeline_stage_id,
    deal_value: c.deals?.find((d: any) => d.status === 'open')?.value ?? null,
    has_open_task: (c.tasks ?? []).some((t: any) => t.status !== 'done'),
  }))

  // Montar colunas
  const noStageContacts = contacts.filter(c => !c.pipeline_stage_id)
  const columns: KanbanColumn[] = []

  if (noStageContacts.length > 0) {
    columns.push({ stage: null, contacts: noStageContacts })
  }

  for (const stage of stages) {
    columns.push({
      stage,
      contacts: contacts.filter(c => c.pipeline_stage_id === stage.id),
    })
  }

  return (
    <PipelineClient
      initialColumns={columns}
      workspaceId={workspaceId}
      stages={stages}
    />
  )
}
```

---

## 11. Critérios de conclusão

- [ ] Kanban exibe todos os contatos agrupados por estágio
- [ ] Colunas ordenadas por `position` da stage; "Sem estágio" primeiro (se houver)
- [ ] Arrastar card para outra coluna: atualiza na UI imediatamente (optimistic)
- [ ] Depois do drag: atualiza `pipeline_stage_id` no banco via `moveContactAction`
- [ ] Se falhar: reverte via `router.refresh()` + toast.error
- [ ] Clicar no card navega para `/dashboard/contacts/${id}`
- [ ] Modal de configuração: criar, renomear, reordenar e remover etapas
- [ ] Remover etapa com contatos: move contatos para "Sem estágio" antes de deletar
- [ ] `npm run build` sem erros ou warnings

---

## 12. Notas de implementação

- **Collision detection**: `closestCenter` funciona bem para kanban. Se tiver problemas,
  testar `closestCorners` (mais preciso para grids).
- **Activation constraint `distance: 8`**: evita ativar drag em cliques simples. Essencial
  para o `onClick` do card funcionar sem conflito com o drag.
- **`DragOverlay`**: renderiza cópia fantasma do card durante o drag. Sem isso o card
  some do lugar original durante o arraste e a UX fica estranha.
- **Reordenação dentro da coluna**: não prevista nesta sprint. Focar apenas em mover
  entre colunas. Adicionar intra-column sort depois se necessário.
- **Coluna "Sem estágio"**: só aparece se houver contatos sem stage. Não é droppable
  permanente; se arrastar o último card de lá, a coluna desaparece. Tratar este
  edge case no handleDragEnd (verificar se coluna still exists).

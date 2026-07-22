# Spec — Semana 02 Dia 03 Noite

## Contexto

O Dashboard de Metricas esta completo com:
- Selecao de semana com animacao
- 4 KPIs com variacao semanal
- Grafico combinado Recharts (12 semanas)
- Funil de conversao por etapa
- Feed de atividades da semana
- Realtime via Supabase channel

Esta noite consolida o dashboard com testes reais,
valida o realtime e prepara o modulo de Configuracoes
que e o ponto de entrada do Dia 04.

---

## Parte 1 — Testes do Dashboard com dados reais

### 1.1 Fluxo de navegacao semanal

Executar manualmente no browser:

[ ] Abrir /dashboard → semana atual carregada
[ ] Clicar "←" → semana anterior, animacao de slide
[ ] Verificar que KPIs mudam (podem ser 0 se sem dados)
[ ] Clicar "Hoje" → volta para semana atual
[ ] Clicar "←" 11 vezes → botao fica desabilitado (limite 12 semanas)
[ ] Clicar "→" quando nao e semana atual → avanca
[ ] Na semana atual: botao "→" desabilitado, botao "Hoje" nao aparece

### 1.2 Validacao dos KPIs com dados do seed

Para cada KPI, verificar no Supabase Studio:

Faturamento:
```sql
SELECT SUM(value) FROM sales
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND status = 'paid'
  AND sale_date >= '2026-04-28'  -- segunda da semana atual
  AND sale_date <= '2026-05-04'  -- domingo da semana atual
```

Novos leads:
```sql
SELECT COUNT(*) FROM contacts
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND deleted_at IS NULL
  AND created_at >= '2026-04-28T00:00:00'
  AND created_at < '2026-05-05T00:00:00'
```

Fechamentos:
```sql
SELECT COUNT(DISTINCT contact_id) FROM activities
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND type = 'stage_change'
  AND content ILIKE '%Fechado%'
  AND created_at >= '2026-04-28T00:00:00'
  AND created_at < '2026-05-05T00:00:00'
```

Tarefas concluidas:
```sql
SELECT COUNT(*) FROM tasks
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND completed_at >= '2026-04-28T00:00:00'
  AND completed_at < '2026-05-05T00:00:00'
```

### 1.3 Validacao do grafico de 12 semanas

[ ] Grafico renderiza com 12 barras
[ ] Barra da semana selecionada esta destacada (ReferenceArea azul claro)
[ ] Tooltip aparece ao hover mostrando faturamento e leads
[ ] Legenda visivel abaixo do grafico

### 1.4 Validacao do funil

[ ] Todas as etapas do pipeline aparecem
[ ] Barras proporcionais ao maior count
[ ] Taxa de conversao exibida (ex: "↓ 71% do anterior")
[ ] Etapa com count=0 mostra barra vazia mas aparece

### 1.5 Feed de atividades

[ ] Lista atividades da semana selecionada
[ ] Icone correto por tipo (stage_change, task, sale, note)
[ ] Nome do contato clicavel navega para /dashboard/contacts/[id]
[ ] "Nenhuma atividade nesta semana" quando vazio

---

## Parte 2 — Validacao do Realtime

### 2.1 Teste em duas abas

Procedimento:
1. Abrir /dashboard na aba A (semana atual)
2. Abrir /dashboard/sales na aba B
3. Na aba B: criar uma venda nova (status: pago, data: hoje)
4. Observar aba A: KPI de faturamento deve atualizar em < 3s

O canal Supabase assina:
- INSERT em `sales` → refetch KPIs + atividades
- INSERT em `activities` → refetch KPIs + atividades
- UPDATE em `tasks` → refetch KPIs + atividades

### 2.2 Teste de criacao de contato

1. Aba A: /dashboard (semana atual)
2. Aba B: /dashboard/contacts → criar novo contato
3. Aba A: KPI "Novos leads" nao vai atualizar automaticamente
   (contacts INSERT nao esta no canal — isso e esperado)
   Para incluir: adicionar .on('postgres_changes', { event: 'INSERT', table: 'contacts' })
   ao canal em hooks/use-dashboard.ts

Decisao: adicionar ou nao depende do impacto de performance.
Se o workspace tem muitos contatos, pode ser caro.
Recomendacao: adicionar na proxima sessao se necessario.

---

## Parte 3 — Modulo de Configuracoes

### 3.1 Estrutura

Rota: `/dashboard/settings`
Ja existe como placeholder em `app/(dashboard)/dashboard/settings/`.

Tres secoes em abas verticais:

```
[ Perfil do workspace ]
[ Membros             ]
[ Plano               ]
```

### 3.2 Aba Perfil do workspace

Campos editaveis:
- Nome do workspace (text input)
- Logo (upload de imagem — pode ser fase 2)

Query de leitura:
```sql
SELECT name, slug FROM workspaces WHERE id = $1
```

Server Action para salvar:
```ts
updateWorkspaceAction(workspaceId, { name })
```

Validacao:
- Nome obrigatorio, min 2 chars, max 60 chars

Permissao:
- Apenas `role = 'owner'` pode editar
- Verificar via workspace_members.role

### 3.3 Aba Membros

Listar membros atuais:
```sql
SELECT wm.role, wm.created_at, u.email, u.raw_user_meta_data->>'full_name' as name
FROM workspace_members wm
JOIN auth.users u ON u.id = wm.user_id
WHERE wm.workspace_id = $1
ORDER BY wm.created_at ASC
```

Acoes por membro (apenas owner pode fazer):
- Alterar role (admin <-> member)
- Remover membro (nao pode remover o proprio owner)

Convidar membro:
- Input de email
- Criar registro em workspace_members (usuario precisa ja existir)
  OU usar link de convite (fase 2)

### 3.4 Aba Plano

Placeholder por enquanto:
- Mostrar plano atual (workspace.plan)
- "Plano gratuito — em desenvolvimento"
- Botao "Fazer upgrade" desabilitado com tooltip "Em breve"

---

## Parte 4 — Onboarding guiado

### 4.1 Quando mostrar

Mostrar onboarding quando:
- Usuario acabou de criar conta (primeiro login)
- `workspace.onboarding_completed = false`

Apos completar: marcar `onboarding_completed = true`

### 4.2 Migration necessaria

```sql
-- supabase/migrations/004_onboarding.sql
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
```

### 4.3 Estrutura do onboarding

Rota: `/onboarding`
Fora do layout do dashboard (sem sidebar).

5 passos em stepper horizontal:

```
[1] Nome do negocio
[2] Configurar pipeline
[3] Primeiro contato
[4] WhatsApp (pode pular)
[5] Concluir
```

#### Passo 1 — Nome do negocio
- Input: nome do workspace
- Ja pre-preenchido se veio do registro
- Atualiza `workspaces.name`

#### Passo 2 — Configurar pipeline
- Mostrar etapas padrao: "Prospecao, Qualificacao, Proposta, Fechado"
- Opcao de personalizar nomes
- Criar as etapas via `createPipelineStageAction`

#### Passo 3 — Primeiro contato
- Formulario simplificado: nome + telefone + email
- `createContactAction`
- Pode pular

#### Passo 4 — WhatsApp
- Explicar integracao
- Input para WhatsApp Business ID e token
- Atualiza `workspaces.whatsapp_phone` e `whatsapp_token`
- Pode pular

#### Passo 5 — Concluir
- Resumo do que foi configurado
- "Ir para o painel" → redirect para /dashboard
- Marcar `onboarding_completed = true`

### 4.4 Deteccao de onboarding pendente

No layout do dashboard (`app/(dashboard)/layout.tsx`):
```ts
if (!workspace.onboarding_completed) {
  redirect('/onboarding')
}
```

---

## Parte 5 — Titulos de pagina (browser tab)

Usar o hook `useDocumentTitle` ja criado em `hooks/use-document-title.ts`
em cada Client Component principal dos modulos.

Mapeamento de titulos:
- /dashboard → "Operacao"
- /dashboard/contacts → "Contatos"
- /dashboard/pipeline → "Pipeline"
- /dashboard/tasks → "Tarefas"
- /dashboard/sales → "Vendas"
- /dashboard/settings → "Configuracoes"

Implementacao em cada client component:
```ts
useDocumentTitle('Contatos')
```

Para incluir o nome do workspace:
```ts
const { workspace } = useWorkspace()
useDocumentTitle('Contatos', workspace?.name)
```

---

## Criterios de aceitacao da noite

- [ ] Navegacao de semanas funcional no browser com dados reais
- [ ] KPIs conferem com queries diretas no Supabase Studio
- [ ] Grafico renderiza 12 semanas com highlight correto
- [ ] Funil mostra etapas reais do pipeline com contagens
- [ ] Feed de atividades lista eventos reais da semana
- [ ] Realtime: criar venda em aba B → KPI atualiza em aba A
- [ ] Configuracoes: rota /dashboard/settings com 3 abas
- [ ] Perfil do workspace editavel pelo owner
- [ ] Migration 004_onboarding.sql criada e documentada
- [ ] Titulos de pagina atualizados em todos os modulos
- [ ] npm run build limpo

---

## Fora do escopo desta noite

- Implementacao completa do onboarding (apenas spec + migration)
- Integracao real WhatsApp
- Checkout Stripe
- Upload de logo do workspace
- Sistema de convite por email com link magico
- Notificacoes push ou email

---

## Ordem de implementacao recomendada

1. Testar dashboard no browser com seed real
2. Validar realtime (duas abas)
3. Implementar /dashboard/settings (3 abas)
4. Criar migration 004_onboarding.sql
5. Adicionar useDocumentTitle nos client components existentes
6. npm run build

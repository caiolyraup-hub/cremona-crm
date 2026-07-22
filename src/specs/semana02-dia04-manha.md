# Spec - Semana 02 Dia 04 (manha)

## Objetivo
Entregar o onboarding guiado de novos workspaces e o modulo `/dashboard/settings`, ultimo passo estrutural antes da fase de venda.

## Migration necessaria
Executar no Supabase SQL Editor:

```sql
alter table workspaces
  add column if not exists onboarding_completed boolean default false;

alter table workspaces
  add column if not exists business_type text;

alter table workspaces
  add column if not exists business_name text;
```

## Regras de redirect
- Rota do onboarding: `/onboarding`
- Redirecionar para `/onboarding` quando:
  - usuario autenticado
  - workspace ativo encontrado
  - `workspace.onboarding_completed = false`
- Nao redirecionar quando `workspace.onboarding_completed = true`
- Se o usuario entrar em `/onboarding` ja concluido, redirecionar para `/dashboard`
- O gate deve cobrir todo o dashboard, inclusive `/dashboard/settings`

## Estrutura de arquivos
- `app/onboarding/page.tsx`
- `app/onboarding/onboarding-flow.tsx`
- `components/onboarding/onboarding-step.tsx`
- `components/onboarding/step-progress.tsx`
- `components/onboarding/step-1.tsx`
- `components/onboarding/step-2.tsx`
- `components/onboarding/step-3.tsx`
- `components/onboarding/step-4.tsx`
- `components/onboarding/step-5.tsx`

## Modelo de estado
- `app/onboarding/page.tsx`:
  - Server Component
  - valida auth
  - resolve workspace ativo
  - redireciona se onboarding concluido
  - carrega stages atuais para o passo 2
- `app/onboarding/onboarding-flow.tsx`:
  - Client Component
  - controla passo atual
  - mantem estado local do formulario
  - persiste cada etapa com Server Actions
  - nao perde dados ao voltar um passo

## Passo 1 - Sobre seu negocio
- Titulo: `Sobre seu negocio`
- Campo obrigatorio: nome do negocio
- Select obrigatorio: tipo de negocio
- Opcoes:
  - `loja_fisica`
  - `ecommerce`
  - `servicos`
  - `consultoria`
  - `outro`
- Persistencia:
  - `workspaces.business_name`
  - `workspaces.business_type`
- Validacoes:
  - nome minimo de 2 caracteres
  - tipo obrigatorio

## Passo 2 - Configure seu funil
- Mostrar as 5 etapas padrao ja existentes
- Renomear cada etapa inline
- Adicionar etapa ate o maximo de 7
- Remover etapa ate o minimo de 2
- Mostrar preview visual em pills coloridas
- Reusar a mesma logica do modulo atual de etapas
- Persistencia em `pipeline_stages`
- Validacoes:
  - minimo 2 etapas
  - maximo 7 etapas
  - nomes obrigatorios

## Passo 3 - Adicione seu primeiro contato
- Formulario simplificado:
  - nome obrigatorio
  - telefone opcional
  - e-mail opcional
- Botao `Adicionar outro`
- Maximo de 3 contatos
- Pode pular o passo
- Persistencia:
  - criar contatos em `contacts`
  - usar a primeira etapa do pipeline como stage padrao

## Passo 4 - Conecte seu WhatsApp
- Mostrar 2 paragrafos explicando o beneficio da integracao
- Botao principal: `Conectar agora`
- Botao secundario: `Pular por agora - conectar depois`
- Nesta sprint, `Conectar agora` abre placeholder do fluxo futuro da Meta
- O passo pode ser pulado sem bloquear o onboarding

## Passo 5 - Tudo pronto
- Mostrar resumo real:
  - `Funil com X etapas`
  - `Y contatos adicionados`
- Disparar confetti com `canvas-confetti`
- Dependencias a instalar:
  - `canvas-confetti`
  - `@types/canvas-confetti`
- Botao principal: `Ir para o dashboard`
- Acao final:
  1. atualizar `workspaces.onboarding_completed = true`
  2. redirecionar para `/dashboard`
  3. exibir o dashboard com dados reais do onboarding

## Componentes

### `components/onboarding/onboarding-step.tsx`
- wrapper visual padrao
- titulo, descricao, corpo e footer

### `components/onboarding/step-progress.tsx`
- progresso de 5 passos
- labels curtas
- estado atual visivel

### `components/onboarding/step-1` a `step-5`
- um componente por passo
- props tipadas
- sem responsabilidade de navegacao global

## Server Actions sugeridas
- `saveWorkspaceProfileAction`
- `saveOnboardingStagesAction`
- `createOnboardingContactsAction`
- `completeOnboardingAction`

## Modulo `/dashboard/settings`

### Aba Workspace
- editar nome do workspace
- editar tipo de negocio
- upload de logo via Supabase Storage

### Aba Pipeline
- reusar `StagesConfigModal`
- criar, editar, remover e reordenar etapas

### Aba Plano
- mostrar plano atual
- mostrar `trial_ends_at`
- botao `Fazer upgrade`
- Stripe fica para Sprint 6

### Aba WhatsApp
- mostrar status atual da conexao
- placeholder funcional ate a Sprint 5

## Requisitos de UX
- fluxo mobile-first e responsivo
- CTA principal sempre visivel
- estados de loading e erro em PT-BR
- transicao curta entre passos
- dados preservados ao voltar

## Critério de conclusao do dia
- novo usuario registrado vai para `/onboarding`
- completar os 5 passos vai para `/dashboard`
- usuario concluido nao volta ao onboarding
- `/dashboard/settings` tem 4 abas funcionando
- dados do workspace sao editaveis nas configuracoes

## Checklist de validacao
- registrar usuario novo e confirmar redirect
- concluir passo 1 e recarregar a tela
- renomear etapas no passo 2 e validar persistencia
- adicionar 1 a 3 contatos no passo 3
- pular o passo 4 sem perder os dados anteriores
- concluir passo 5 e validar `onboarding_completed = true`
- abrir `/dashboard/settings` e validar `Workspace`, `Pipeline`, `Plano` e `WhatsApp`

# Spec — Dia 02 Manhã: Telas de Autenticação

## Objetivo
Construir as telas de login e registro com validação completa, mensagens
de erro tratadas e fluxo de onboarding pós-registro (criação do workspace).

## Arquivos a criar ou modificar

| Arquivo | Ação |
|---|---|
| `app/(auth)/login/page.tsx` | Modificar — adicionar validação client-side e mensagens PT-BR |
| `app/(auth)/register/page.tsx` | Modificar — adicionar campo de nome da empresa + fluxo de onboarding |
| `app/(auth)/layout.tsx` | Criar — layout compartilhado das telas de auth |
| `app/onboarding/page.tsx` | Criar — tela pós-registro para configurar o workspace |
| `lib/actions/auth.ts` | Criar — Server Actions para login, registro e logout |
| `lib/actions/workspace.ts` | Criar — Server Action para criar workspace no onboarding |

---

## Tela de Login (`/login`)

### Campos
| Campo | Tipo | Validação |
|---|---|---|
| E-mail | `email` | obrigatório, formato válido |
| Senha | `password` | obrigatório, mínimo 6 caracteres |

### Comportamento
- Submit desabilita o botão e mostra spinner
- Após login bem-sucedido → redireciona para `/dashboard`
- Se usuário não tiver workspace → redireciona para `/onboarding`
- Link "Criar conta grátis" → `/register`
- Link "Esqueci minha senha" → `/reset-password` (tela a criar no futuro)

### Mensagens de erro
| Situação | Mensagem exibida |
|---|---|
| E-mail inválido | "Digite um e-mail válido" |
| Senha muito curta | "A senha deve ter pelo menos 6 caracteres" |
| Credenciais incorretas | "E-mail ou senha incorretos" |
| Conta não confirmada | "Confirme seu e-mail antes de entrar" |
| Erro genérico | "Erro ao entrar. Tente novamente." |

---

## Tela de Registro (`/register`)

### Campos
| Campo | Tipo | Validação |
|---|---|---|
| Nome completo | `text` | obrigatório, mínimo 2 caracteres |
| E-mail | `email` | obrigatório, formato válido |
| Senha | `password` | obrigatório, mínimo 8 caracteres |
| Confirmar senha | `password` | deve ser igual à senha |

### Comportamento
- Submit desabilita o botão e mostra spinner
- Após registro bem-sucedido → redireciona para `/onboarding`
- Link "Já tenho conta" → `/login`

### Mensagens de erro
| Situação | Mensagem exibida |
|---|---|
| E-mail já cadastrado | "Este e-mail já está em uso" |
| Senhas não coincidem | "As senhas não coincidem" |
| Senha muito curta | "A senha deve ter pelo menos 8 caracteres" |
| E-mail inválido | "Digite um e-mail válido" |
| Erro genérico | "Erro ao criar conta. Tente novamente." |

---

## Tela de Onboarding (`/onboarding`)

### Objetivo
Criar o workspace do usuário logo após o primeiro registro.
Rota protegida: só acessível se autenticado E sem workspace.

### Campos
| Campo | Tipo | Validação |
|---|---|---|
| Nome do negócio | `text` | obrigatório, mínimo 2 caracteres |
| Segmento | `select` | opcional (varejo, serviços, saúde, educação, outro) |

### Comportamento
- Ao submeter: cria o workspace + associa o usuário como `owner` em `workspace_members`
- Cria os 5 pipeline stages padrão para o workspace
- Após criar → redireciona para `/dashboard`
- Se usuário já tem workspace → redireciona para `/dashboard`

### Server Action: `createWorkspace(name, segment?)`
1. Gera slug a partir do nome (ex: "Loja da Maria" → "loja-da-maria")
2. Insere em `workspaces` com `owner_id = auth.uid()`
3. Insere em `workspace_members` com `role = 'owner'`
4. Insere os 5 stages padrão em `pipeline_stages`
5. Retorna `{ ok: true }` ou `{ ok: false, message }`

---

## Layout compartilhado (`app/(auth)/layout.tsx`)
- Fundo branco, centralizado verticalmente
- Logo "Cremona" no topo do card
- Sem sidebar, sem header
- Card com sombra suave (`shadow-sm`, `border border-slate-200`)
- Footer com "In Petra Ancoratus" já presente via root layout

---

## Critério de conclusão da sessão
- [ ] Login funciona com usuário do seed ou conta real do Supabase
- [ ] Registro cria usuário no Supabase Auth
- [ ] Onboarding cria workspace e redireciona para /dashboard
- [ ] Todas as mensagens de erro estão em português
- [ ] Middleware redireciona corretamente (sem loop de redirecionamento)
- [ ] Zero erros de TypeScript
- [ ] `npm run build` passa sem erros

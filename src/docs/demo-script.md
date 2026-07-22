# Cremona — Roteiro Demo (3 min, Loom)

## Objetivo
Mostrar o fluxo completo: cadastro → onboarding → contato via WhatsApp → venda fechada → painel atualizado.

---

## [00:00–00:20] Abertura (20s)

**Tela:** landing page (cremona.app)

> "Olá! Vou mostrar em 3 minutos como o Cremona transforma conversas do WhatsApp em vendas organizadas — sem planilha, sem complicação."

- Role a página lentamente mostrando as seções Hero, Funcionalidades, Preços.
- Destaque o botão "Começar grátis".

---

## [00:20–00:50] Cadastro e Onboarding (30s)

**Ação:** Clique em "Começar grátis" → tela de registro.

> "O cadastro leva menos de um minuto."

1. Preencha email + senha → clique "Criar conta".
2. Tela de onboarding: digite o nome do negócio (ex: "Barbearia do João").
3. Clique "Continuar" → dashboard.

> "Pronto, já estamos dentro."

---

## [00:50–01:30] Dashboard e Contatos (40s)

**Tela:** `/dashboard`

> "Este é o painel principal. Aqui você vê os contatos, as tarefas do dia e o funil de vendas."

1. Clique em **Contatos** → lista de contatos.
2. Clique em **Novo contato** → preencha:
   - Nome: "Maria Silva"
   - Telefone: "+55 11 91234-5678"
   - Clique "Salvar".
3. Abra o contato → clique **Nova mensagem**.
4. Digite: "Olá Maria, vi que você tem interesse no corte! Quando posso agendar?" → Enviar.

> "A mensagem vai direto pelo WhatsApp Business. Tudo registrado aqui."

---

## [01:30–02:00] Funil de Vendas (30s)

**Tela:** `/dashboard/sales`

> "Agora veja o funil. Cada negociação tem um estágio."

1. Clique **Nova venda** → preencha:
   - Contato: "Maria Silva"
   - Valor: R$ 80
   - Estágio: "Proposta enviada"
   - Clique "Salvar".
2. Arraste o card para "Fechado - Ganho".

> "Venda fechada. O valor aparece automaticamente no resumo do mês."

---

## [02:00–02:30] Tarefas (30s)

**Tela:** `/dashboard/tasks`

> "Para não esquecer o follow-up:"

1. Clique **Nova tarefa** → preencha:
   - Título: "Ligar para Maria amanhã"
   - Vencimento: amanhã
   - Contato vinculado: "Maria Silva"
   - Clique "Salvar".
2. Mostre o badge de tarefas no painel principal.

> "O Cremona lembra por você."

---

## [02:30–02:50] Assinatura (20s)

**Tela:** `/dashboard/settings` → aba Plano

> "O plano gratuito tem tudo isso. Quando crescer, o Pro desbloqueia múltiplos usuários e relatórios avançados."

1. Clique **Fazer upgrade** → tela do Stripe Checkout (não precisa concluir).
2. Mostre os campos de cartão.
3. Pressione `Esc` / feche.

---

## [02:50–03:00] Encerramento (10s)

**Tela:** landing page

> "Cremona — seu CRM no WhatsApp. Comece grátis em cremona.app."

- Mostre a URL na barra de endereço.
- Encerre a gravação.

---

## Dicas de Gravação

- Use dados da conta demo (execute `npm run seed:demo` antes).
- Janela do browser: 1280×800, zoom 100%.
- Microfone: ambiente silencioso, fale devagar.
- Edição: corte pausas longas, adicione zoom suave nos cliques.
- Upload no Loom → configure thumbnail com a logo do Cremona.

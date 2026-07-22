# Semana 03 — Dia 02 — Tarde

## Objetivo

Executar validacao ponta a ponta do WhatsApp em producao/Vercel e corrigir bugs encontrados no teste real.

## Escopo

- Testar GET real do webhook no dominio Vercel.
- Configurar webhook no painel da Meta.
- Validar `WHATSAPP_VERIFY_TOKEN`.
- Validar `WHATSAPP_APP_SECRET`.
- Enviar mensagem pelo sandbox da Meta.
- Confirmar contato criado no Supabase.
- Confirmar mensagem inbound salva em `messages`.
- Confirmar activity criada.
- Confirmar conversa na Inbox.
- Confirmar realtime em duas abas.
- Confirmar badge de nao lidas.
- Confirmar marcacao como lida.
- Confirmar status callbacks.
- Testar envio basico, se credenciais reais estiverem disponiveis.
- Corrigir bugs encontrados.

## Fora de escopo

- Stripe.
- Landing page.
- Templates aprovados.
- Download completo de midia.
- Automacoes.
- Multiatendimento.

## Criterios de aceite

- Webhook real verificado na Meta.
- Mensagem real aparece na Inbox.
- Badge atualiza corretamente.
- Realtime validado.
- Erros tratados sem quebrar UX.
- README.md atualizado.
- CONTEXT.md atualizado.
- `npm run lint` passa.
- `npm run build` passa.

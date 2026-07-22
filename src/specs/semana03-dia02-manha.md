# Semana 03 - Dia 02 - Manha

## Objetivo

Validar a integracao WhatsApp em ambiente real com Vercel e sandbox da Meta, corrigindo os ultimos problemas tecnicos antes de iniciar recursos avancados.

## Escopo

- Fazer deploy atualizado na Vercel.
- Configurar variaveis `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` na Vercel.
- Configurar webhook real no painel da Meta.
- Testar GET de verificacao.
- Testar POST real com numero sandbox.
- Confirmar workspace encontrado por `whatsapp_phone_number_id`.
- Confirmar criacao automatica de contato.
- Confirmar mensagem inbound na Inbox.
- Confirmar realtime em duas abas.
- Confirmar status callbacks `sent`, `delivered`, `read`.
- Confirmar badge de nao lidas.
- Confirmar marcacao como lida.
- Confirmar envio basico, se credenciais reais estiverem disponiveis.
- Registrar bugs encontrados.

## Fora de escopo

- Stripe.
- Landing page.
- Templates aprovados.
- Midia completa com download.
- Automacao de follow-up.
- Multiatendimento.

## Criterios de aceite

- Webhook real verificado na Meta.
- Mensagem real aparece na Inbox.
- Badge atualiza.
- Realtime validado.
- Erros tratados sem quebrar UX.
- README.md atualizado.
- CONTEXT.md atualizado.
- `npm run lint` passa.
- `npm run build` passa.

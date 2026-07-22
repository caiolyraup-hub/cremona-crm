# Semana 02 - Dia 06 - Manha

## Objetivo

Validar a integracao WhatsApp ponta a ponta e preparar o Cremona para o sprint de lancamento controlado com primeiros usuarios.

## Escopo

- Testar webhook em ambiente Vercel com HTTPS.
- Testar recebimento real usando numero sandbox da Meta.
- Testar match numero -> contato.
- Testar criacao automatica de contato.
- Testar Inbox em tempo real em duas abas.
- Testar envio basico de mensagem pela Meta.
- Testar marcacao como lida e badge da sidebar.
- Revisar erros de token invalido, numero invalido e `phone_number_id` invalido.
- Melhorar mensagens de erro para o usuario.
- Preparar suporte a tipos de midia:
  - image;
  - audio;
  - document;
  - location.
- Documentar limitacao da janela de 24h da Meta.
- Planejar templates aprovados para mensagens business-initiated.
- Checklist final antes de Stripe e landing page.

## Fora de escopo

- Checkout Stripe.
- Landing page.
- Templates aprovados em producao.
- Midia completa com download da Meta.
- Multiatendimento avancado.

## Criterios de aceite

- Webhook real testado em producao.
- Mensagem recebida aparece na Inbox.
- Nova mensagem aparece via realtime.
- Abrir conversa marca como lida.
- Badge da sidebar atualiza.
- Envio basico funciona ou retorna erro claro da Meta.
- README.md atualizado.
- CONTEXT.md atualizado.
- `npm run lint` passa.
- `npm run build` passa.

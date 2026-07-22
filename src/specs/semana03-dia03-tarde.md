# Semana 03 - Dia 03 - Tarde

## Objetivo

Consolidar a regra da janela de 24 horas na Inbox, testar bloqueio de envio fora da janela e preparar o modulo futuro de templates WhatsApp.

## Escopo

- Testar `isWithinWhatsApp24hWindow`.
- Testar envio com janela aberta.
- Testar envio com janela fechada.
- Melhorar UX da Inbox quando a janela estiver fechada.
- Criar mock visual de botao `Enviar template` desabilitado.
- Revisar documentacao de templates.
- Melhorar historico WhatsApp no contato.
- Atualizar README.md.
- Atualizar CONTEXT.md.

## Fora de escopo

- Criar templates reais na Meta.
- Enviar templates reais.
- Stripe.
- Landing page.
- Automacao avancada.

## Criterios de aceite

- Janela de 24h calculada corretamente.
- Inbox mostra status da janela.
- Envio livre e bloqueado fora da janela.
- Usuario entende por que nao pode enviar.
- Documentacao de templates criada.
- README.md atualizado.
- CONTEXT.md atualizado.
- `npm run lint` passa.
- `npm run build` passa.

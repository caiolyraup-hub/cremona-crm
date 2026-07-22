# Semana 02 - Dia 05 - Noite

## Objetivo

Integrar a Inbox WhatsApp ao restante do CRM, adicionar badge de nao lidas na sidebar, preparar configuracao real do WhatsApp nas Settings e consolidar documentacao.

## Escopo

- Badge verde no item WhatsApp da sidebar.
- Query server-side para count de conversas nao lidas.
- `markConversationAsReadAction` refletindo no badge.
- Aba WhatsApp das Settings com formulario real:
  - Phone Number ID;
  - numero exibido;
  - token de acesso;
  - botao salvar e testar conexao.
- Criar migration `006_whatsapp_config.sql`, se ainda nao existir:
  - `whatsapp_phone_number_id`.
- Atualizar passo 4 do onboarding para usar configuracao real ou manter fallback de pular.
- Melhorar documentacao de setup.
- Atualizar README.md e CONTEXT.md.

## Fora de escopo

- Templates da Meta.
- Envio ativo fora da janela de 24h.
- Midia completa.
- Stripe.
- Landing page.
- Multiatendimento com usuarios multiplos.

## Criterios de aceite

- Badge aparece na sidebar quando ha mensagens inbound nao lidas.
- Abrir conversa marca mensagens como lidas.
- Settings permite salvar credenciais do WhatsApp.
- Teste de conexao com Meta API funciona ou retorna erro claro.
- CONTEXT.md atualizado.
- README.md atualizado.
- `npm run lint` passa.
- `npm run build` passa.

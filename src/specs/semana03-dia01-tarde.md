# Semana 03 - Dia 01 - Tarde

## Objetivo

Executar testes ponta a ponta da integracao WhatsApp em ambiente local e preparar o primeiro teste real em producao/Vercel.

## Escopo

- Rodar script local do webhook.
- Validar criacao automatica de contato.
- Validar mensagem inbound em `messages`.
- Validar activity criada.
- Validar Inbox carregando conversa.
- Validar realtime com duas abas.
- Validar marcacao como lida.
- Validar badge da sidebar.
- Validar Settings WhatsApp com credenciais reais ou fake.
- Validar teste de conexao.
- Revisar logs de erro.
- Ajustar mensagens de erro para usuario final.
- Preparar deploy Vercel, se ainda nao estiver pronto.

## Fora de escopo

- Stripe.
- Landing page.
- Templates aprovados da Meta.
- Suporte completo a midia.
- Multiatendimento.
- Automacoes.

## Criterios de aceite

- Webhook local testado.
- Inbox testada com dados reais ou payload fake.
- Badge validado.
- Settings testada.
- README.md atualizado.
- CONTEXT.md atualizado.
- `npm run lint` passa.
- `npm run build` passa.

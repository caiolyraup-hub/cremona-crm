# WhatsApp - Janela de 24 horas e Templates

## O que e a janela de 24 horas

Quando um cliente envia uma mensagem para o negocio, a Meta abre uma janela de atendimento de 24 horas.

Dentro dessa janela, o CRM pode responder livremente com mensagens normais.

Quando a janela expira, a Meta deixa de permitir mensagens ativas livres. Nesse caso, o envio deve ser feito com um template previamente aprovado.

Essa regra afeta especialmente o envio iniciado pelo CRM, como reativacao de lead, cobranca, confirmacao e follow-up fora do fluxo recente da conversa.

## Como o Cremona deve tratar

O Cremona passa a considerar a data da ultima mensagem inbound do contato como a referencia da janela.

Regras:

- se a ultima inbound tiver ate 24 horas, o envio livre fica permitido;
- se a ultima inbound tiver mais de 24 horas, o envio livre deve ser bloqueado;
- se ainda nao existir inbound para o contato, o CRM considera que nao ha janela ativa.

Na Inbox, o status da janela aparece junto da conversa selecionada:

- `Janela 24h aberta`
- `Janela 24h fechada`
- `Sem janela ativa`

Quando a janela estiver perto de expirar, o Cremona tambem pode sinalizar isso de forma discreta para o operador.

Quando a janela estiver fechada, o Cremona nao deve chamar a Meta para envio livre e deve orientar o usuario a usar templates quando esse modulo estiver disponivel.

## Estado atual

Estado desta sessao:

- o envio basico de texto continua disponivel para respostas dentro da janela;
- o helper de janela de 24 horas foi implementado;
- o bloqueio de envio livre fora da janela foi implementado na action da Inbox;
- a Inbox mostra o status visual da janela;
- a Inbox mostra um mock desabilitado de `Enviar template` quando o envio livre nao pode ser usado;
- templates reais ainda nao foram implementados.

## Futuro

Itens planejados para sprint futura:

- tabela de templates por workspace;
- status de aprovacao e sincronizacao com a Meta;
- envio real de templates;
- selecao de template na Inbox quando a janela estiver fechada;
- historico de template enviado por contato;
- possiveis automacoes baseadas em janela expirada.

# Roadmap - Templates WhatsApp no Cremona

## Por que templates sao necessarios

Templates serao necessarios para:

- mensagens fora da janela de 24h;
- campanhas ativas;
- reativacao de leads;
- confirmacao de agendamento;
- cobranca;
- follow-up.

## Modelagem futura sugerida

Tabela futura `whatsapp_templates`:

- `id`
- `workspace_id`
- `name`
- `category`
- `language`
- `status`
- `meta_template_id`
- `components` jsonb
- `created_at`
- `updated_at`

Tabela futura `whatsapp_template_messages`, se necessario:

- `id`
- `workspace_id`
- `contact_id`
- `template_id`
- `status`
- `sent_at`
- `meta_message_id`

## UI futura

Sugestao de evolucao:

- aba `Templates` em `Settings > WhatsApp`;
- lista de templates por workspace;
- status de aprovacao exibido na UI;
- botao `Enviar template` na Inbox quando a janela de 24h estiver fechada.
- nesta etapa atual, esse botao existe apenas como mock visual desabilitado com selo `Em breve`.

## Fora do escopo atual

- criar templates reais na Meta;
- aprovar templates;
- envio real de templates;
- automacoes.

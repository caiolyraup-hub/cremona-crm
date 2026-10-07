# Lucca: qualificação noturna pelo WhatsApp

## Estado da entrega

A implementação fica desativada por padrão (`LUCCA_WHATSAPP_ENABLED=false`). Ela usa o webhook Twilio e um worker hospedado na Vercel, acionado a cada minuto. Não depende de computador, navegador ou sessão aberta.

O escopo é restrito ao workspace e ao remetente configurados. Outros workspaces continuam com o comportamento anterior.

## Estado verificado em 6 de outubro de 2026

- Repositório remoto: `https://github.com/caiolyraup-hub/cremona-crm.git`.
- Projeto Vercel vinculado: `caiolyraup-3519s-projects/cremona`.
- Produção atual: `https://cremona-iota.vercel.app`, deployment `Ready` de 25 de agosto de 2026. Este código do Lucca ainda não foi publicado.
- O endpoint publicado `POST /api/webhooks/twilio/whatsapp` respondeu `403` sem assinatura, confirmando que a rota existe e rejeita uma chamada não autenticada.
- A produção possui as variáveis Twilio, Supabase e `CRON_SECRET`, mas ainda não possui `OPENAI_API_KEY`, `LUCCA_NOTIFICATION_CONTENT_SID` ou variáveis `LUCCA_*`.
- As duas migrations do Lucca foram aplicadas ao projeto Supabase `dbijlopiyknlznihycxn`; as tabelas ficaram vazias, com RLS ativo, políticas por workspace e nenhum grant para `anon`.

O valor das variáveis Secret da Vercel não é exibido pela listagem. Por isso, antes de ativar é obrigatório conferir no painel da Twilio e no ambiente publicado se `TWILIO_INBOUND_WEBHOOK_URL` contém exatamente a URL pública acima com `/api/webhooks/twilio/whatsapp`.

## Fluxo

1. A Twilio chama `POST /api/webhooks/twilio/whatsapp`.
2. O webhook valida `X-Twilio-Signature` com o SDK oficial e confere `AccountSid`.
3. A mensagem é persistida com idempotência por `MessageSid`.
4. Para uma primeira conversa elegível, o sistema cria `lucca_qualifications` e jobs duráveis em `lucca_jobs`. Em produção, `LUCCA_ALWAYS_ON=true` mantém esse atendimento ativo 24 horas por dia, todos os dias.
5. Depois da gravação durável, o webhook tenta processar a recepção/conversa e a notificação ao Caio imediatamente. O cron `/api/cron/process-lucca-queue` recupera o trabalho a cada minuto se a invocação terminar ou algum provedor falhar.
6. A OpenAI interpreta o texto e devolve JSON estruturado. O código, e não o modelo, decide elegibilidade, horário, estado, próxima pergunta, destinatário e autorização de envio.
7. Todo envio passa por `whatsapp_dispatches`, evitando duplicidade após retries. Timeout com resultado incerto vira `delivery_unknown` e não é reenviado automaticamente.
8. Quando `LUCCA_ALWAYS_ON=false`, o horário configurado continua sendo respeitado e, ao encerrar a janela, qualificações ativas passam para `awaiting_human`. Com o modo 24/7 ativo, essa pausa por horário não ocorre.

O worker processa no máximo dois jobs por execução por padrão. A tentativa imediata cobre os dois trabalhos independentes criados para um lead; o cron a cada minuto é o fallback. A recepção tem meta operacional inferior a dois minutos. `response_sla_ms` mede recebimento no Cremona até aceite da requisição pela Twilio; entrega e leitura são medidas separadamente pelos status callbacks.

## Dados e rastreamento

`lucca_qualifications` guarda estado, três respostas, textos originais, resumo, horários, pausa/transferência, SLA, estado da notificação e evidência de origem.

Atribuição usa esta prioridade:

1. Referral recebido diretamente no webhook Twilio (`ReferralSourceId`, `ReferralSourceType`, `ReferralSourceUrl`, `ReferralHeadline`, `ReferralBody`, `ReferralCtwaClid` quando existir, e campos `ReferralMedia*`).
2. `lead_submissions` do mesmo `contact_id`, criado antes da conversa e dentro de `LUCCA_UTM_LOOKBACK_DAYS`.
3. Origem não identificada.

O ID do anúncio e o ID da mídia são preservados como evidência. Nome interno e imagem exata do criativo dependem de cadastro próprio de anúncios ou integração com a Meta; o Cremona não os inventa.

`messages.sender_type` distingue `contact`, `human`, `automation`, `system` e registros antigos `unknown`. Mensagens do Lucca usam `automated_by=lucca`.

## Configuração

Todas as variáveis abaixo são exclusivamente server-side, exceto a URL pública já usada pela aplicação:

```env
LUCCA_WHATSAPP_ENABLED=false
LUCCA_WORKSPACE_ID=7ca55bf5-5726-4d2a-9d70-419f5fb1b864
LUCCA_WHATSAPP_FROM=whatsapp:+5582936180673
LUCCA_ALWAYS_ON=true
LUCCA_TIME_ZONE=America/Sao_Paulo
LUCCA_START_HOUR=18
LUCCA_END_HOUR=8

OPENAI_API_KEY=
LUCCA_OPENAI_MODEL=gpt-5.6-sol
LUCCA_OPENAI_TIMEOUT_MS=8000
LUCCA_OPENAI_MAX_RETRIES=1
LUCCA_OPENAI_MAX_OUTPUT_TOKENS=1000
LUCCA_MAX_INPUT_CHARACTERS=4000
LUCCA_MAX_OUTPUT_CHARACTERS=900

LUCCA_NOTIFICATION_TO=whatsapp:+5582996932970
LUCCA_NOTIFICATION_CONTENT_SID=
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO

LUCCA_WORKER_BATCH_SIZE=2
LUCCA_MAX_ATTEMPTS=3
LUCCA_JOB_LEASE_SECONDS=180
LUCCA_RETRY_BASE_SECONDS=45
LUCCA_UTM_LOOKBACK_DAYS=30
LUCCA_APPROVED_QCM_INFO=
```

O template interno de notificação deve ser aprovado para WhatsApp e conter seis variáveis, nesta ordem:

1. Nome disponível.
2. Telefone.
3. Data e horário de chegada.
4. Primeira mensagem.
5. Origem/anúncio identificável.
6. Link autenticado da conversa no Cremona.

O texto fixo do template também não pode conter emojis. As variáveis textuais são higienizadas antes do envio. Não reutilize o template comercial de boas-vindas. Se `LUCCA_NOTIFICATION_CONTENT_SID` estiver ausente, somente o aviso interno falha; a recepção do lead continua.

## Aplicação da migration

Arquivos:

- `src/supabase/migrations/20261006142427_lucca_whatsapp_qualification.sql`;
- `src/supabase/migrations/20261006145430_lucca_whatsapp_fk_indexes.sql`.

Ela adiciona as tabelas `lucca_qualifications` e `lucca_jobs`, os campos de autoria em `messages`, RLS, políticas por workspace e índices de idempotência/concorrência.

Após aplicar, execute os advisors de segurança e performance do Supabase e confirme que as duas tabelas estão com RLS ativo.

Na verificação desta entrega, os advisors não apontaram problema novo de segurança nem chave estrangeira sem índice nas tabelas do Lucca. Permaneceram avisos preexistentes em outras áreas do projeto (incluindo políticas ausentes no protótipo `dialer_*`, funções antigas com `search_path` mutável e proteção de senhas vazadas desativada); eles não foram alterados por esta entrega.

## Testes sem destinatários reais

```bash
npm run test:lucca
npm run test:twilio-unit
npm run test:automation-queue
npm run build
```

`test:lucca` usa somente dados fictícios, não chama OpenAI, Twilio ou Supabase e não envia mensagens. Ele cobre limites do horário, saudações, nomes, tratamentos, ausência de emojis, identidade/transparência, sequência e antecipação das respostas, recusa, referral/UTM, exclusão do número do Caio, idempotência, concorrência, RLS e bloqueio das automações concorrentes.

Para um teste ponta a ponta, use um número explicitamente destinado a testes e um projeto/branch Supabase de teste. Nunca configure um lead real em `TWILIO_TEST_TO`.

## Ativação segura

1. Aplicar a migration e publicar o código.
2. Confirmar no deploy publicado que `TWILIO_INBOUND_WEBHOOK_URL` aponta exatamente para `/api/webhooks/twilio/whatsapp` e que o remetente comercial é `whatsapp:+5582936180673`.
3. Configurar `OPENAI_API_KEY`, modelo, workspace, remetente, destinatário e o ContentSid aprovado.
4. Manter `LUCCA_WHATSAPP_ENABLED=false` durante o smoke test de leitura e schema.
5. Fazer teste ponta a ponta apenas com número de teste, verificando `messages`, `lucca_qualifications`, `lucca_jobs`, `whatsapp_dispatches` e `whatsapp_message_events`.
6. Só então definir `LUCCA_WHATSAPP_ENABLED=true` e fazer novo deploy.

## Monitoramento

Consultas úteis:

```sql
select status, count(*) from lucca_jobs group by status;

select id, contact_id, status, current_step, notification_status,
       response_sla_ms, response_sla_breached, updated_at
from lucca_qualifications
order by updated_at desc
limit 100;

select status, count(*)
from whatsapp_dispatches
where event_key like 'lucca:%'
group by status;
```

Alertar para jobs `failed`, dispatches `delivery_unknown`, `response_sla_breached=true` e notificações `failed`.

## Pausa e reversão

Pausa imediata global: definir `LUCCA_WHATSAPP_ENABLED=false` e redeploy. Isso impede novos atendimentos e novos envios do worker.

Pausa por conversa: clicar **Assumir atendimento** na Inbox. Qualquer mensagem enviada por atendente no Cremona também muda a conversa para `human_owned`. Retomada só ocorre pelo botão **Retomar Lucca**, por usuário autenticado, dentro do horário ativo.

Rollback de código: voltar o deploy mantendo as tabelas, pois são aditivas. Para preservar auditoria, não apague as tabelas. Se a remoção física for realmente necessária, exporte os dados antes e faça uma migration reversa separada.

## Referências oficiais consultadas

- OpenAI Responses API e texto: https://developers.openai.com/api/docs/guides/text
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Twilio: segurança de webhooks: https://www.twilio.com/docs/usage/webhooks/webhooks-security
- Twilio: parâmetros de webhook e referral: https://www.twilio.com/docs/messaging/guides/webhook-request
- Twilio: status callbacks: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
- Supabase: chaves de API: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase: segurança da Data API: https://supabase.com/docs/guides/api/securing-your-api

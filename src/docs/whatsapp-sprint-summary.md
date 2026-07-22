# Sprint WhatsApp MVP — Resumo

## O que foi construído

### Envio de mídia
O usuário pode enviar imagens, documentos, áudios e vídeos diretamente pela Inbox.
O arquivo é carregado no Supabase Storage (bucket `outbound-media`) e enviado via Meta Cloud API.

**Arquivos:**
- `components/inbox/media-upload-button.tsx` — botão Paperclip com seletor de arquivo
- `components/inbox/media-preview-modal.tsx` — modal de preview e confirmação antes do envio
- `lib/whatsapp/media-upload.ts` — upload para Storage + envio via Meta API
- `supabase/migrations/008_media_storage.sql` — bucket e policies RLS

**Tipos de mídia suportados:**
- Imagem: JPEG, PNG, WebP (até 16 MB)
- Documento: PDF (até 16 MB)
- Áudio: MP3, OGG, MP4 de áudio
- Vídeo: MP4, MOV

### Automações
Sistema completo baseado em eventos:

**Gatilhos:**
- `contact_created` — novo contato criado
- `stage_enter` — lead entra em uma etapa do pipeline
- `stage_exit` — lead sai de uma etapa do pipeline

**Ações:**
- `send_whatsapp_text` — mensagem de texto com variáveis `{{contact_name}}` etc.
- `send_whatsapp_template` — template aprovado pela Meta
- `send_whatsapp_media` — imagem, documento ou áudio estático
- `create_task` — cria tarefa no CRM

**Delay:** de imediato até 24 horas, via fila persistente no banco.

**Deduplicação:** evita disparos duplicados para o mesmo contato nos últimos 5 minutos.

**Arquivos:**
- `supabase/migrations/009_automations.sql` — tabelas `automations` e `automation_logs`
- `lib/automations/engine.ts` — motor principal
- `lib/automations/actions.ts` — executores por tipo de ação
- `app/(dashboard)/dashboard/automations/` — páginas e actions server-side
- `components/automations/` — AutomationCard, AutomationModal, AutomationLogItem

### Fila de delay (Vercel Cron)
Automações com delay > 0 são enfileiradas em vez de executar imediatamente.

**Fluxo:**
1. Evento dispara → engine detecta `delay_minutes > 0`
2. Item inserido em `automation_queue` com `scheduled_for = now + delay`
3. Log registrado como `skipped` com texto "Agendada para X minutos"
4. Vercel Cron chama `/api/cron/process-automation-queue` a cada minuto
5. Cron busca itens prontos (`status=pending AND scheduled_for <= NOW()`)
6. Marca como `processing` atomicamente (previne race condition com dois crons simultâneos)
7. Executa a ação e registra `done` ou `failed`

**Retry:** máximo 3 tentativas por item. Após esgotar: `failed` definitivo.

**Arquivos:**
- `supabase/migrations/012_automation_queue.sql`
- `app/api/cron/process-automation-queue/route.ts`
- `vercel.json` — `"schedule": "* * * * *"`

**Variável de ambiente necessária:** `CRON_SECRET` (Bearer auth no endpoint)

### Templates WhatsApp
Gestão de templates aprovados pela Meta diretamente no produto.

**Fluxo de uso:**
1. Criar template em **Settings → Templates** (status: `pending`)
2. Criar o mesmo template no Meta Business Manager com exatamente o mesmo `name`
3. Aguardar aprovação da Meta (3–10 dias úteis)
4. Marcar como `approved` no produto (Settings → Templates → menu → Marcar como Aprovado)
5. Template disponível na Inbox (botão "Usar template") e em Automações

**Variáveis:** suportadas como `{{1}}`, `{{2}}` no corpo. O produto resolve com dados do contato.

**Arquivos:**
- `supabase/migrations/010_custom_templates.sql`
- `components/settings/templates-settings.tsx`
- `components/settings/template-modal.tsx`
- `app/(dashboard)/dashboard/settings/template-actions.ts`
- `components/inbox/template-picker-modal.tsx`

### Logs de execução
Histórico de todas as execuções de automações.

**Acesso:** `/dashboard/automations/logs`

**Informações por log:**
- Automação executada
- Contato alvo
- Status (success / failed / skipped)
- Mensagem de erro (quando falhou)
- Data/hora de execução

### Dashboard de analytics (`/dashboard/whatsapp`)
Métricas reais de WhatsApp com seletor de período (7 / 30 / 90 dias).

**KPIs:**
- Mensagens enviadas (outbound)
- Mensagens recebidas (inbound)
- Taxa de resposta (% de contatos inbound que receberam outbound no período)
- Conversas ativas (últimos 7 dias, independente do período selecionado)

**Gráfico:** volume diário de mensagens — barras azuis (enviadas) + linha verde (recebidas)

**Cards:**
- Performance de automações: execuções totais + taxa de sucesso + top 5
- Contatos mais ativos: top 5 com contagem e última interação

---

## Arquitetura técnica

### Migrations aplicadas
| Migration | Conteúdo |
|-----------|----------|
| `008_media_storage.sql` | Bucket `outbound-media` + policies |
| `009_automations.sql` | Tabelas `automations` e `automation_logs` |
| `010_custom_templates.sql` | Tabela `whatsapp_templates` |
| `011_automation_media.sql` | Índice `idx_automations_action_type` |
| `012_automation_queue.sql` | Tabela `automation_queue` + índices |
| `013_whatsapp_indexes.sql` | Índices de performance para analytics |

### Variáveis de ambiente adicionadas
```
CRON_SECRET=          # gerar: openssl rand -hex 32
```

### Rotas novas
- `GET /api/cron/process-automation-queue` — Vercel Cron (Bearer CRON_SECRET)
- `GET /api/dashboard/whatsapp?workspaceId=...&days=30` — analytics
- `GET/POST /dashboard/automations` — lista e CRUD
- `GET /dashboard/automations/logs` — histórico de execuções
- `GET /dashboard/whatsapp` — dashboard de analytics
- `GET /dashboard/settings?tab=templates` — gestão de templates

---

## Como testar em produção

### Cron manualmente
```bash
curl -X GET \
  "https://[dominio]/api/cron/process-automation-queue" \
  -H "Authorization: Bearer [CRON_SECRET]"
```
Resposta esperada: `{"processed":0,"succeeded":0,"failed":0,"retrying":0}`

### Script de teste end-to-end
```bash
node --experimental-strip-types scripts/test-whatsapp-sprint.ts [WORKSPACE_ID]
```

### Seed de templates padrão
```bash
npm run seed:templates [WORKSPACE_ID]
```

### Verificar fila de delay
```sql
-- Ver itens pendentes
SELECT * FROM automation_queue
WHERE workspace_id = '[id]'
ORDER BY scheduled_for ASC
LIMIT 20;

-- Ver itens processados recentemente
SELECT * FROM automation_queue
WHERE status IN ('done', 'failed')
ORDER BY processed_at DESC
LIMIT 20;
```

---

## Limitações conhecidas

1. **Templates precisam de aprovação manual na Meta** — o produto cria a estrutura mas não submete automaticamente à Meta. Processo externo leva 3–10 dias úteis.

2. **URLs de mídia inbound expiram em ~5 minutos** — a Meta retorna URLs temporárias. Para armazenamento permanente, fazer re-download para o Supabase Storage após salvar a mensagem.

3. **Cron por instância Vercel** — para alto volume, o lock atômico previne duplicação, mas o throughput é limitado. Para escala, usar Upstash Redis + BullMQ ou Supabase pg_cron.

4. **Disparos em massa não implementados** — funcionalidade de próximo sprint. O motor atual é baseado em eventos individuais.

5. **Delay mínimo: 1 minuto** — cron roda a cada minuto no plano gratuito Vercel. Delays menores (ex: 30 segundos) são arredondados para a próxima execução do cron.

# Migrations do Cremona

Execute no Supabase SQL Editor, nesta ordem:

## Migrations originais (MVP core)
1. 001_initial_schema.sql
2. 002_soft_delete.sql
3. 003_search_indexes.sql
4. 004_dashboard_indexes.sql
5. 005_onboarding.sql
6. 006_whatsapp_config.sql

## Migrations Stripe
7. 007_stripe.sql

## Sprint WhatsApp MVP
8. 008_media_storage.sql
   Bucket outbound-media para midia enviada
9. 009_automations.sql
   Tabelas automations e automation_logs
10. 010_custom_templates.sql
    Tabela whatsapp_templates
11. 011_automation_media.sql
    Indice de action_type em automations
12. 012_automation_queue.sql
    Fila para automacoes com delay
13. 013_whatsapp_indexes.sql
    Indices de performance para analytics
14. 014_pipelines.sql
    Ajustes de pipeline
15. 015_automation_queue_idempotency.sql
    event_key e indice unico parcial para idempotencia da fila
16. 016_automation_queue_retries_and_lease.sql
    Lease, retries com backoff e recuperacao de processing abandonado

## Como verificar se todas foram aplicadas

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Tabelas esperadas apos todas as migrations:
- activities
- automation_logs
- automation_queue
- automations
- contacts
- deals
- messages
- pipeline_stages
- sales
- tasks
- whatsapp_templates
- workspace_members
- workspaces

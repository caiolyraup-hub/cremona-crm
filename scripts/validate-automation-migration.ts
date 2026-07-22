import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const idempotencySql = readFileSync('src/supabase/migrations/015_automation_queue_idempotency.sql', 'utf8')
  .toLowerCase()
  .replace(/\s+/g, ' ')

assert.match(idempotencySql, /alter table automation_queue add column if not exists event_key text/)
assert.match(idempotencySql, /create unique index if not exists automation_queue_event_key_unique/)
assert.match(idempotencySql, /on automation_queue\s*\(\s*event_key\s*\)/)
assert.match(idempotencySql, /where event_key is not null/)
assert.match(idempotencySql, /drop index if exists automation_queue_event_key_unique/)
assert.match(idempotencySql, /alter table automation_queue drop column if exists event_key/)

const leaseSql = readFileSync('src/supabase/migrations/016_automation_queue_retries_and_lease.sql', 'utf8')
  .toLowerCase()
  .replace(/\s+/g, ' ')

assert.match(leaseSql, /add column if not exists locked_at timestamptz/)
assert.match(leaseSql, /add column if not exists locked_by text/)
assert.match(leaseSql, /add column if not exists last_attempt_at timestamptz/)
assert.match(leaseSql, /create index if not exists idx_automation_queue_processing_lease/)
assert.match(leaseSql, /where status = 'processing'/)
assert.match(leaseSql, /drop index if exists idx_automation_queue_processing_lease/)
assert.match(leaseSql, /alter table automation_queue drop column if exists locked_at/)

console.log('OK automation migration validation')

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('src/supabase/migrations/015_automation_queue_idempotency.sql', 'utf8')
  .toLowerCase()
  .replace(/\s+/g, ' ')

assert.match(sql, /alter table automation_queue add column if not exists event_key text/)
assert.match(sql, /create unique index if not exists automation_queue_event_key_unique/)
assert.match(sql, /on automation_queue\s*\(\s*event_key\s*\)/)
assert.match(sql, /where event_key is not null/)
assert.match(sql, /drop index if exists automation_queue_event_key_unique/)
assert.match(sql, /alter table automation_queue drop column if exists event_key/)

console.log('OK automation migration validation')

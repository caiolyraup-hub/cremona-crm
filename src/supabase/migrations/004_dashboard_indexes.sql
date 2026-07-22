-- Dashboard indexes for weekly KPI, chart, funnel, and activity queries.
-- Run this in the Supabase SQL Editor.

create index if not exists idx_sales_workspace_date_status
  on sales(workspace_id, sale_date, status)
  where status = 'paid';

create index if not exists idx_contacts_workspace_created
  on contacts(workspace_id, created_at)
  where deleted_at is null;

create index if not exists idx_tasks_workspace_completed
  on tasks(workspace_id, completed_at)
  where completed_at is not null;

create index if not exists idx_activities_workspace_created_type
  on activities(workspace_id, created_at, type);

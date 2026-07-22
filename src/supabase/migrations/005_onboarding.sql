ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id text;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS whatsapp_business_account_id text;

CREATE INDEX IF NOT EXISTS idx_workspaces_whatsapp_phone_number_id
ON workspaces(whatsapp_phone_number_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_whatsapp_business_account_id
ON workspaces(whatsapp_business_account_id);

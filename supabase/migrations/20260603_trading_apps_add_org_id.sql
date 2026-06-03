-- Add org_id to trading_apps so apps are scoped to an organisation
ALTER TABLE trading_apps
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS trading_apps_org_id_idx ON trading_apps (org_id);

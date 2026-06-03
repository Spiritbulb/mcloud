-- Add puck_content column to store_themes for the Puck visual editor
alter table store_themes
    add column if not exists puck_content jsonb default null;

comment on column store_themes.puck_content is
    'Serialized Puck editor layout data. When non-null, the storefront renders from this instead of the legacy theme.';

-- Dark-mode accent and secondary colours for store themes.
--
-- storefront.css already reads --sf-dark-accent and --sf-dark-secondary in its
-- prefers-color-scheme: dark block, but no column fed them, so every store got the
-- hardcoded fallbacks. The defaults here equal those fallbacks, so existing stores
-- render exactly as before until a merchant changes them in the Editor.

alter table store_themes
  add column if not exists dark_accent_color    text not null default '#c9a96e',
  add column if not exists dark_secondary_color text not null default '#27272a';

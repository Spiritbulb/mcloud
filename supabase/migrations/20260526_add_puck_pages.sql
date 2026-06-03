-- Per-page Puck layout data for all storefront pages except home (which uses puck_content)
alter table store_themes
    add column if not exists puck_pages jsonb default null;

comment on column store_themes.puck_pages is
    'Per-page Puck editor layouts keyed by page type: products, product_detail, blog, blog_post, service_detail.';

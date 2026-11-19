-- Products could not be deleted once anything referenced them: every foreign key to products
-- (and order_items -> product_variants) was ON DELETE NO ACTION, so deleteProduct() failed with
-- "Could not delete the product." for any product that had ever been viewed, ordered, reviewed,
-- wishlisted, put in a collection or given a variant (41 of 62 products on 2026-11-19).
--
-- Rows that only exist for the product go with it (CASCADE). History keeps its row and loses the
-- link (SET NULL): order_items snapshots title, variant_title, sku, image_url and price, and
-- get_store_analytics joins products with an inner join, so unlinked rows drop out of top products.

alter table public.product_variants
  drop constraint product_variants_product_id_fkey,
  add constraint product_variants_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.collection_products
  drop constraint collection_products_product_id_fkey,
  add constraint collection_products_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.wishlists
  drop constraint wishlists_product_id_fkey,
  add constraint wishlists_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.product_reviews
  drop constraint product_reviews_product_id_fkey,
  add constraint product_reviews_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.order_items
  drop constraint order_items_product_id_fkey,
  add constraint order_items_product_id_fkey
    foreign key (product_id) references public.products(id) on delete set null;

-- A cascaded variant must not be blocked by the orders that bought it.
alter table public.order_items
  drop constraint order_items_variant_id_fkey,
  add constraint order_items_variant_id_fkey
    foreign key (variant_id) references public.product_variants(id) on delete set null;

alter table public.store_analytics
  drop constraint store_analytics_product_id_fkey,
  add constraint store_analytics_product_id_fkey
    foreign key (product_id) references public.products(id) on delete set null;

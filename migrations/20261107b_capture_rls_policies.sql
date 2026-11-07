-- RLS policies that exist in the live database but had no definition in migrations/ (SPI-71).
-- Copied from pg_policies on 2026-11-07, so applying this to the live database changes nothing.
-- Idempotent (drop if exists, then create).
--
-- Note: identity is WorkOS, so auth.uid() is null for every request. The three `auth.uid()`
-- member/owner policies below therefore match nothing; all real access goes through the
-- service role (see AGENTS.md "Never query the database from the browser"). They are captured
-- as they are rather than fixed here.
-- reach_vendors_read and reach_product_vendors_read are readable by anon on purpose (the Reach
-- shopper app lists vendors); review which columns that exposes before widening it.

drop policy if exists blog_authors_member_write on public.blog_authors;
create policy blog_authors_member_write on public.blog_authors
  as permissive for all to public
  using (store_id in (select store_members.store_id from public.store_members where store_members.user_id = (auth.uid())::text));

drop policy if exists blog_authors_public_read on public.blog_authors;
create policy blog_authors_public_read on public.blog_authors
  as permissive for select to public
  using (true);

drop policy if exists blog_posts_member_all on public.blog_posts;
create policy blog_posts_member_all on public.blog_posts
  as permissive for all to public
  using (store_id in (select store_members.store_id from public.store_members where store_members.user_id = (auth.uid())::text));

drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  as permissive for select to public
  using (is_published = true);

drop policy if exists reach_product_vendors_read on public.reach_product_vendors;
create policy reach_product_vendors_read on public.reach_product_vendors
  as permissive for select to anon, authenticated
  using (true);

drop policy if exists reach_vendors_read on public.reach_vendors;
create policy reach_vendors_read on public.reach_vendors
  as permissive for select to anon, authenticated
  using (true);

drop policy if exists store_member_read_analytics on public.store_analytics;
create policy store_member_read_analytics on public.store_analytics
  as permissive for select to public
  using (store_id in (select store_members.store_id from public.store_members where store_members.user_id = (auth.uid())::text));

drop policy if exists store_owner_read_analytics on public.store_analytics;
create policy store_owner_read_analytics on public.store_analytics
  as permissive for select to public
  using (store_id in (select stores.id from public.stores where stores.owner_id = (auth.uid())::text));

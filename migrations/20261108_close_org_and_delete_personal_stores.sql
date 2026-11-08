-- Close an organization, and delete a person's Personal stores with their account (SPI-77, SPI-67).
--
-- Why this file exists: no foreign key from the store or org tables cascades (about 45 tables are
-- involved, all NO ACTION), so neither the Delete organization button nor store deletion could finish
-- once real data existed. The button also ran its steps one call at a time and left a half-closed org
-- behind when the last step failed.
--
-- 1. delete_store_cascade(store): the ordered hard delete of one store and everything under it.
--    Refuses while the store (or its Reach vendors) has vendor payouts not yet paid out.
-- 2. close_org(org, actor): what the Delete organization button now does, in one transaction. Stores
--    are kept and move to Personal (org_id null), as the button always said. Refuses, changing
--    nothing, while the org has running servers or a wallet balance. Org-level rows (members,
--    invites, integrations, wallet and its history) are deleted with the org.
-- 3. delete_user_account: replaces the 20261107c version. Personal stores (org_id null) the person
--    owns are now deleted with the account instead of blocking it. Stores in an org still go to the
--    org's new owner.
--
-- Server-only: executable by service_role.

-- ── 1. One store, hard delete ──────────────────────────────────────────────

create or replace function public.store_has_unpaid_payouts(p_store_id uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from reach_vendor_payouts p
     where p.status in ('pending', 'held', 'released')
       and (p.vendor_id in (select v.id from reach_vendors v where v.store_id = p_store_id)
            or p.order_id in (select o.id from orders o where o.store_id = p_store_id))
  );
$function$;

create or replace function public.delete_store_cascade(p_store_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if store_has_unpaid_payouts(p_store_id) then
    raise exception 'store_has_unpaid_payouts' using errcode = 'P0001';
  end if;

  -- Reach: the store's marketplace vendor and what hangs off it.
  delete from reach_vendor_payouts
   where vendor_id in (select id from reach_vendors where store_id = p_store_id)
      or order_id in (select id from orders where store_id = p_store_id);
  delete from reach_vendor_members where vendor_id in (select id from reach_vendors where store_id = p_store_id);
  delete from reach_courier_keys where vendor_id in (select id from reach_vendors where store_id = p_store_id);
  delete from reach_vendors where store_id = p_store_id;   -- reach_product_vendors, reach_vendor_areas cascade

  -- Orders and what refers to them.
  delete from whatsapp_messages
   where conversation_id in (select id from whatsapp_conversations where store_id = p_store_id)
      or order_id in (select id from orders where store_id = p_store_id);
  delete from whatsapp_conversations where store_id = p_store_id;
  delete from store_analytics where store_id = p_store_id;
  delete from payment_transactions where store_id = p_store_id;
  delete from payment_links where store_id = p_store_id;
  delete from product_reviews where store_id = p_store_id;
  delete from wishlists where store_id = p_store_id;
  delete from order_items where order_id in (select id from orders where store_id = p_store_id);
  delete from orders where store_id = p_store_id;           -- reach_payments cascades

  -- Catalogue.
  delete from collection_products where collection_id in (select id from collections where store_id = p_store_id);
  delete from collections where store_id = p_store_id;
  delete from product_variants where product_id in (select id from products where store_id = p_store_id);
  delete from products where store_id = p_store_id;
  delete from customers where store_id = p_store_id;

  -- The rest of the store.
  delete from blog_posts where store_id = p_store_id;
  delete from blog_authors where store_id = p_store_id;
  delete from service_packages where service_id in (select id from services where store_id = p_store_id);
  delete from services where store_id = p_store_id;
  delete from api_keys where store_id = p_store_id;
  delete from contact_submissions where store_id = p_store_id;
  delete from delivery_options where store_id = p_store_id;
  delete from delivery_zones where store_id = p_store_id;
  delete from discount_codes where store_id = p_store_id;
  delete from pages where store_id = p_store_id;
  delete from store_integrations where store_id = p_store_id;
  delete from store_invites where store_id = p_store_id;
  delete from store_join_requests where store_id = p_store_id;
  delete from store_members where store_id = p_store_id;
  delete from store_subscriptions where store_id = p_store_id;
  delete from store_themes where store_id = p_store_id;
  delete from store_visits where store_id = p_store_id;
  delete from webhook_logs where store_id = p_store_id;

  -- Wallet history belongs to the org: keep the rows, drop the link to the store.
  update wallet_ledger_entries set store_id = null where store_id = p_store_id;

  delete from stores where id = p_store_id;
end;
$function$;

-- ── 2. Close an organization ───────────────────────────────────────────────

create or replace function public.close_org(p_org_id uuid, p_actor text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_owner    text;
  v_servers  int;
  v_balance  bigint;
  v_stores   jsonb;
begin
  select owner_id into v_owner from orgs where id = p_org_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_org');
  end if;
  if v_owner is distinct from p_actor then
    return jsonb_build_object('ok', false, 'code', 'not_owner');
  end if;

  select count(*) into v_servers from servers where org_id = p_org_id;
  if v_servers > 0 then
    return jsonb_build_object('ok', false, 'code', 'org_has_servers', 'servers', v_servers);
  end if;

  select coalesce(balance_cents, 0) into v_balance from org_wallets where org_id = p_org_id for update;
  if coalesce(v_balance, 0) > 0 then
    return jsonb_build_object('ok', false, 'code', 'org_has_balance', 'balance_cents', v_balance);
  end if;

  -- Stores are kept: they move to Personal.
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'slug', slug)), '[]'::jsonb)
    into v_stores from stores where org_id = p_org_id;
  update stores set org_id = null, updated_at = now() where org_id = p_org_id;
  update trading_apps set org_id = null where org_id = p_org_id;

  delete from org_integrations where org_id = p_org_id;
  delete from org_invites where org_id = p_org_id;
  delete from org_members where org_id = p_org_id;
  delete from server_billing where org_id = p_org_id;
  delete from wallet_ledger_entries where org_id = p_org_id;
  delete from wallet_topups where org_id = p_org_id;
  delete from org_wallets where org_id = p_org_id;
  delete from orgs where id = p_org_id;

  return jsonb_build_object('ok', true, 'moved_stores', v_stores);
end;
$function$;

-- ── 3. Account deletion, now deleting Personal stores ──────────────────────

create or replace function public.delete_user_account(p_user_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org        record;
  v_store      record;
  v_successor  text;
  v_transfers  jsonb := '[]'::jsonb;
  v_deleted    jsonb := '[]'::jsonb;
begin
  perform 1 from users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_user');
  end if;

  -- Pass 1: refuse before changing anything.
  for v_org in select id, name from orgs where owner_id = p_user_id loop
    select m.user_id into v_successor
      from org_members m
     where m.org_id = v_org.id and m.user_id <> p_user_id and m.role in ('owner', 'admin')
     order by (m.role = 'owner') desc, m.created_at
     limit 1;
    if v_successor is null then
      return jsonb_build_object(
        'ok', false, 'code', 'org_needs_successor', 'org', v_org.name,
        'has_other_members', exists (select 1 from org_members m where m.org_id = v_org.id and m.user_id <> p_user_id)
      );
    end if;
  end loop;

  for v_store in select id, name from stores where owner_id = p_user_id and org_id is null loop
    if store_has_unpaid_payouts(v_store.id) then
      return jsonb_build_object('ok', false, 'code', 'store_has_unpaid_payouts', 'store', v_store.name);
    end if;
  end loop;

  -- Pass 2: delete Personal stores, hand over orgs, then the stores that go with them.
  for v_store in select id, slug, custom_domain from stores where owner_id = p_user_id and org_id is null loop
    v_deleted := v_deleted || jsonb_build_object('slug', v_store.slug, 'custom_domain', v_store.custom_domain);
    perform delete_store_cascade(v_store.id);
  end loop;

  for v_org in select id, name from orgs where owner_id = p_user_id loop
    select m.user_id into v_successor
      from org_members m
     where m.org_id = v_org.id and m.user_id <> p_user_id and m.role in ('owner', 'admin')
     order by (m.role = 'owner') desc, m.created_at
     limit 1;

    update orgs set owner_id = v_successor, updated_at = now() where id = v_org.id;
    update org_members set role = 'owner' where org_id = v_org.id and user_id = v_successor;
    v_transfers := v_transfers || jsonb_build_object('org', v_org.name, 'to', v_successor);
  end loop;

  insert into store_members (store_id, user_id, role)
  select s.id, o.owner_id, 'owner'
    from stores s join orgs o on o.id = s.org_id
   where s.owner_id = p_user_id
  on conflict (store_id, user_id) do update set role = 'owner';

  update stores s
     set owner_id = o.owner_id
    from orgs o
   where s.org_id = o.id and s.owner_id = p_user_id;

  -- The person's own rows.
  delete from store_members where user_id = p_user_id;
  delete from org_members where user_id = p_user_id;
  delete from reach_vendor_members where user_id = p_user_id;
  delete from store_invites where invited_by = p_user_id;

  update org_invites set invited_by = null where invited_by = p_user_id;
  update servers set created_by = null where created_by = p_user_id;
  update wallet_topups set requested_by = null where requested_by = p_user_id;
  update blog_authors set user_id = null where user_id = p_user_id;
  update nuru_notes set reviewed_by = null where reviewed_by = p_user_id;

  delete from nuru_chat_messages
   where user_id = p_user_id
      or session_id in (select id from nuru_chat_sessions where user_id = p_user_id);
  delete from nuru_chat_sessions where user_id = p_user_id;
  delete from nuru_note_chunks where note_id in (select id from nuru_notes where uploader_id = p_user_id);
  delete from nuru_notes where uploader_id = p_user_id;

  delete from users where id = p_user_id;   -- reach_users goes with it (ON DELETE CASCADE)

  return jsonb_build_object('ok', true, 'transfers', v_transfers, 'deleted_stores', v_deleted);
end;
$function$;

revoke all on function public.store_has_unpaid_payouts(uuid) from public, anon, authenticated;
revoke all on function public.delete_store_cascade(uuid) from public, anon, authenticated;
revoke all on function public.close_org(uuid, text) from public, anon, authenticated;
revoke all on function public.delete_user_account(text) from public, anon, authenticated;
grant execute on function public.store_has_unpaid_payouts(uuid) to service_role;
grant execute on function public.delete_store_cascade(uuid) to service_role;
grant execute on function public.close_org(uuid, text) to service_role;
grant execute on function public.delete_user_account(text) to service_role;

-- Account deletion in one transaction (SPI-67).
--
-- Until now the app deleted rows one call at a time and the final `users` delete failed for anyone
-- who owned or belonged to an org (every foreign key to users is NO ACTION). This function does the
-- whole job or nothing.
--
-- Rules:
--   * Stores belong to orgs, not people: deleting an account never deletes a store.
--   * An org the person owns goes to its longest-serving other admin (an owner counts first). If
--     there is nobody to take it, nothing is changed and the caller gets code 'org_needs_successor'.
--     Closing an org is NOT handled here: no foreign key from the store or org tables cascades, so a
--     real "close org" needs its own ordered delete.
--   * Stores owned by the person move to their org's (new) owner, who becomes their store owner.
--   * A store with no org cannot be handed over: code 'store_without_org', nothing changed.
--   * Their memberships, invites they sent, vendor links and Nuru chats and notes are removed;
--     references that only record "who did it" (servers, top-ups, org invites, blog authors,
--     reviewers) are set to null.
--
-- Server-only: executable by service_role.

create or replace function public.delete_user_account(p_user_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org        record;
  v_successor  text;
  v_transfers  jsonb := '[]'::jsonb;
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

  if exists (select 1 from stores where owner_id = p_user_id and org_id is null) then
    return jsonb_build_object('ok', false, 'code', 'store_without_org');
  end if;

  -- Pass 2: hand over orgs, then the stores that go with them.
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

  return jsonb_build_object('ok', true, 'transfers', v_transfers);
end;
$function$;

revoke all on function public.delete_user_account(text) from public, anon, authenticated;
grant execute on function public.delete_user_account(text) to service_role;

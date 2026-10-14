-- NOT YET APPLIED. Run AFTER 20261014b_reach_users.sql AND after the web app that reads
-- reach_users (apps/web/app/api/mobile/me, reach/confirm-buyer) is deployed.
--
-- Why the order matters: until that deploy, /api/mobile/me reads users.role to tell the Reach app
-- who is a vendor. Clearing the column first would send the existing vendors back to the role picker.
--
-- Resets the two accounts that Reach had stamped 'rch-vendor' to the column default, 'customer'
-- (no platform privileges; it is what a new user gets). It cannot lower anyone's access, because
-- 'rch-vendor' was not 'admin' either. If either account should be a platform admin, set that
-- explicitly afterwards.
update public.users
set role = 'customer', updated_at = now()
where role in ('rch-customer', 'rch-vendor');

-- Verify (should return no rows):
--   select id, role from public.users where role like 'rch-%';

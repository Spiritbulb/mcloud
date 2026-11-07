-- Reach courier (store) keys: remove the weak generator and the weak keys it made (SPI-76).
--
-- reach_issue_courier_key built a key from 4 characters of the vendor id plus 4 digits from
-- random() (about 10^4 guesses per vendor, and the vendor id part is not secret). Nothing calls it:
-- store keys are issued by the app (packages/merchant/src/reach.ts generateStoreKey, `RCH-XXXX-XXXX-XXXX`,
-- about 59 bits from the Web Crypto API) with a direct insert. Drop it so nobody wires it up again.
--
-- Keys already issued in the old format are revoked. Their lookup could not succeed anyway: the app
-- upper-cases what people type and the old keys are stored in lower case. Keys in the current format
-- are untouched. Revoking only sets active = false (and revoked_at); rows stay for history.

drop function if exists public.reach_issue_courier_key(uuid, text);

update public.reach_courier_keys
   set active = false,
       revoked_at = now()
 where active
   and key !~ '^RCH-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$';

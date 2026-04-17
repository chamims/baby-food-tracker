# Phase 3 Chunks 3 & 4 — Auth, Households, and Realtime

**Status:** Design approved. Ready for implementation-plan phase.
**Date:** 2026-04-16
**Prior work:** Chunk 1 (data layer, commit `e23268b`), Chunk 2 (sync UX, commit `910c2b2`).

---

## Goal

Replace the current `anon_all` Supabase RLS policy with real magic-link auth, scope data to households (so two or more adults can share a baby's food log), and add realtime subscriptions so changes on one device appear on another within seconds.

The target user set is small: the app owner + spouse + a handful of testers. Not public.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sharing model | Household with individual logins | Attribution preserved; clean schema; scales to 3+ people |
| Auth method | Magic link only | No password-reset flow to build; works well on mobile |
| Invite mechanism | Owner types email → code generated → code emailed to invitee → invitee enters code after magic-link sign-in | User controls when invites go out; code is manually shareable if email is lost |
| Realtime | Yes, Supabase Realtime on `food_entries` | Core value prop of shared household data |
| Existing-data migration | One-time SQL to attach existing rows to owner's household | Owner is the only writer so far; no ambiguity |
| Chunk split | Chunk 3 = auth foundation (solo-usable); Chunk 4 = collaboration (invites + realtime) | Each chunk independently shippable |

---

## Chunk 3 — Auth Foundation

**Goal:** Replace `anon_all` policy with magic-link auth scoped to households. App works for the owner alone with existing data preserved.

### Schema migration (`0001_auth_and_households.sql`)

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index on household_members (user_id);

alter table food_entries add column household_id uuid;
-- Backfill placeholder; real value set after owner's household exists (see "Migration of existing data")
update food_entries set household_id = '00000000-0000-0000-0000-000000000000' where household_id is null;
alter table food_entries alter column household_id set not null;
alter table food_entries add constraint food_entries_household_id_fkey
  foreign key (household_id) references households(id) on delete cascade;

-- Drop the permissive policy
drop policy if exists anon_all on food_entries;

-- New RLS: all CRUD gated on household membership
create policy food_entries_select on food_entries for select
  using (household_id in (select household_id from household_members where user_id = auth.uid()));
create policy food_entries_insert on food_entries for insert
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));
create policy food_entries_update on food_entries for update
  using (household_id in (select household_id from household_members where user_id = auth.uid()));
create policy food_entries_delete on food_entries for delete
  using (household_id in (select household_id from household_members where user_id = auth.uid()));

alter table households enable row level security;
alter table household_members enable row level security;

create policy households_select on households for select
  using (id in (select household_id from household_members where user_id = auth.uid()));
create policy households_insert on households for insert
  with check (owner_user_id = auth.uid());
create policy household_members_select on household_members for select
  using (user_id = auth.uid() or household_id in (select household_id from household_members where user_id = auth.uid()));
-- Only the owner of a household can add themselves as a member (this covers first-login
-- household creation in chunk 3). Invite-based joins in chunk 4 go through a
-- security-definer postgres function that bypasses this RLS.
create policy household_members_insert_self_owner on household_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from households
      where id = household_members.household_id
        and owner_user_id = auth.uid()
    )
  );
```

### Auth flow

- Use Supabase's built-in magic-link auth: `supabase.auth.signInWithOtp({ email })`
- After the user clicks the link, Supabase establishes a session in the browser
- On session load, check if `auth.uid()` has a `household_members` row. If not (first-time sign-in), atomically create a household row (`owner_user_id = auth.uid()`) + matching `household_members` row with `role = 'owner'`
- Sign-out via `supabase.auth.signOut()`

### UI

- **`SignInView.tsx`** (new, in `src/components/Auth/`): email input → "Send magic link" → "Check your email" confirmation. Shown whenever `SUPABASE_ENABLED && !session`.
- Existing loading spinner in `App.tsx` covers the "session hydrating" gap.
- **SettingsModal.tsx**: add a new section showing "Signed in as `<user.email>`" + "Sign out" button.

### Code touch points

| File | Change |
|------|--------|
| `src/utils/supabase.ts` | Add `getSession()`, `signInWithOtp(email)`, `signOut()`, `onAuthStateChange(cb)`. Queries now rely on the authenticated session (no explicit user_id filter needed — RLS handles it) |
| `src/hooks/useAuth.ts` (new) | Exposes `session`, `user`, `household`, `signIn`, `signOut`. Subscribes to `onAuthStateChange`. Handles "create household on first login" side effect |
| `src/hooks/useFoodEntries.ts` | Only runs DB queries when session + household are present. Expose `authReady` state |
| `src/App.tsx` | Renders `<SignInView />` or main app based on auth state. Pass `user.email` to SettingsModal |
| `src/components/Auth/SignInView.tsx` (new) | Email input + magic link send + "check your email" state |
| `src/components/Layout/SettingsModal.tsx` | Sign-in identity row + sign-out button |

### Migration of existing data

1. Migration runs with placeholder `household_id = '00000000-...'` (will be orphaned rows temporarily).
2. Owner signs in for the first time → `useAuth` creates their household, giving it a real UUID.
3. One-shot SQL via Supabase dashboard:
   ```sql
   update food_entries
   set household_id = '<owner-household-id>'
   where household_id = '00000000-0000-0000-0000-000000000000';
   ```
4. Existing localStorage data: the "Sync to Cloud" button in StatsView (built in chunk 2) still works. On first post-chunk-3 login, hit it once if local data is newer than Supabase.

### Out of scope for chunk 3

- Invites, realtime, multi-user flows, household management UI beyond "signed in as X / sign out"

### Verification

1. `npm run build` clean
2. Sign in with owner email → magic link arrives → click → you're in, see all existing entries
3. Add / edit / delete entries works
4. Open in incognito (no session) → sign-in screen appears; direct Supabase query with just the anon key returns zero rows (RLS blocks)
5. `npm run dev` — app works with or without `VITE_SUPABASE_URL` (graceful degradation preserved)

---

## Chunk 4 — Collaboration

**Goal:** Two-person (or more) shared household via email invites + live realtime sync.

### Schema migration (`0002_household_invites.sql`)

```sql
create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  code text not null,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users(id)
);

create unique index on household_invites (code);
create index on household_invites (household_id, email);

alter table household_invites enable row level security;

-- Household members can see invites for their household (so owner sees pending invites in settings)
create policy household_invites_select on household_invites for select
  using (household_id in (select household_id from household_members where user_id = auth.uid()));

-- Household members can create invites
create policy household_invites_insert on household_invites for insert
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));

-- The invitee (identified by email) can mark invites redeemed
create policy household_invites_update on household_invites for update
  using (email = lower((auth.jwt() ->> 'email')::text) and redeemed_at is null and expires_at > now());

-- Household members can revoke invites (delete)
create policy household_invites_delete on household_invites for delete
  using (household_id in (select household_id from household_members where user_id = auth.uid()));
```

### Invite flow

1. Owner opens Settings → "Members" section → enters invitee email → clicks "Send invite"
2. Client calls Edge Function `send-invite` with `{ email, household_id }`
3. Edge Function:
   - Validates caller is a member of `household_id`
   - Generates 6-char uppercase alphanumeric code
   - Inserts `household_invites` row
   - Sends email via Resend with the code + a link to the app
4. Invitee visits the app → enters her email → gets magic link → clicks → signs in
5. `useAuth` detects new user has no household membership → shows `JoinHouseholdView` (NOT the auto-create flow from chunk 3)
6. She enters the code → client calls postgres function `redeem_invite(p_code text)` (security-definer, defined in chunk 4 migration). The function atomically:
   - Verifies invite exists with that code, matching the caller's email, not redeemed, not expired
   - Inserts `household_members` row for the caller
   - Marks invite `redeemed_at = now()`, `redeemed_by_user_id = auth.uid()`
   - Raises an exception if any check fails
7. She's in the household and sees existing entries

### Postgres function: `redeem_invite`

Defined in `0002_household_invites.sql` (security-definer so it can bypass the locked-down `household_members.insert` RLS):

```sql
create or replace function redeem_invite(p_code text)
returns uuid -- returns the household_id joined
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite household_invites%rowtype;
  v_email text := lower((auth.jwt() ->> 'email')::text);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite from household_invites
   where code = upper(p_code) for update;

  if not found then raise exception 'invalid code'; end if;
  if v_invite.email <> v_email then raise exception 'invite email mismatch'; end if;
  if v_invite.redeemed_at is not null then raise exception 'already redeemed'; end if;
  if v_invite.expires_at <= now() then raise exception 'expired'; end if;

  insert into household_members (household_id, user_id, role)
    values (v_invite.household_id, auth.uid(), 'member')
    on conflict do nothing;

  update household_invites
     set redeemed_at = now(), redeemed_by_user_id = auth.uid()
   where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

revoke all on function redeem_invite(text) from public;
grant execute on function redeem_invite(text) to authenticated;
```

**Important:** Chunk 3's first-login flow auto-creates a household. Chunk 4 changes that so first-login users are asked: "Do you have an invite code?" → if yes, redemption flow; if no, create a new household (same as chunk 3's behavior).

### Realtime subscriptions

In `useFoodEntries`, after initial load and household is known:

```ts
const channel = supabase
  .channel(`food_entries:${householdId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'food_entries', filter: `household_id=eq.${householdId}` },
    (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // Dedupe against optimistic writes: if the row is already in state with same data, no-op
      // For DELETE, payload.old.id identifies the row
    })
  .subscribe();
return () => supabase.removeChannel(channel);
```

Deduplication: for INSERT, check if `entries.some(e => e.id === newEntry.id)` before appending. For UPDATE, only apply if the updated_at is newer than what's in state. For DELETE, filter out regardless.

### Settings UI additions

In the existing **SettingsModal.tsx**, add a "Household" section below the existing baby profile section:

- **Members list:** one row per `household_members`. Shows email, role badge (owner/member), "(you)" label on your own row. Owner sees a "Remove" button on other members' rows (member rows can't be removed by non-owners).
- **Invite section:** email input + "Send invite" button. Below it, a list of pending invites (`redeemed_at IS NULL` and not expired), each with: email, code (copyable), "Revoke" button.
- **Leave household:** button at the bottom, confirmation dialog. Logic:
  - If you're the only member → delete the household entirely (cascade removes data)
  - If you're the owner and others remain → transfer ownership to oldest other member, then remove yourself
  - Otherwise → just remove your `household_members` row

### Edge Function: `send-invite`

Location: `supabase/functions/send-invite/index.ts`

Deno function, roughly:
- Parse `{ email, household_id }` from request body
- Validate caller via `supabase.auth.getUser()` (using the Authorization header)
- Check caller is in `household_id` via `household_members`
- Generate 6-char code (uppercase A-Z 0-9, reject if collision with existing unredeemed invite)
- Insert `household_invites` row (using service role key, to bypass needing to round-trip RLS)
- POST to Resend API with from = `invites@<your-verified-domain>` or `onboarding@resend.dev` for testing
- Email body: simple HTML template with the code prominently displayed + the app URL

Required secrets (set via `supabase secrets set`):
- `RESEND_API_KEY`
- `APP_URL` (so the email link goes to the right place)

### Code touch points

| File | Change |
|------|--------|
| `supabase/migrations/0002_household_invites.sql` (new) | Schema + RLS |
| `supabase/functions/send-invite/index.ts` (new) | Edge Function |
| `src/utils/supabase.ts` | Add `dbInviteMember(email)` (calls Edge Function), `dbRedeemInvite(code)` (calls `redeem_invite` RPC), `dbListMembers()`, `dbListInvites()`, `dbRevokeInvite(id)`, `dbLeaveHousehold()` |
| `src/hooks/useAuth.ts` | Adjust first-login logic: if no household, show choice between "redeem code" and "create household" |
| `src/components/Auth/JoinHouseholdView.tsx` (new) | Code input + "Start a new household instead" fallback |
| `src/hooks/useFoodEntries.ts` | Realtime subscription with dedup |
| `src/components/Layout/SettingsModal.tsx` | Members + Invites + Leave sections |

### Environment / infra

- Resend free tier: 100 emails/day, 3k/month
- For testing: send from `onboarding@resend.dev` (no domain verification needed)
- For production-looking emails: verify a domain in Resend and send from `invites@<yourdomain>`

### Out of scope for chunk 4

- Multi-baby support
- Per-user entry attribution ("logged by Chad" shown on cards)
- Real-time presence (who's online)
- Push notifications
- Household name editing UI (the `name` column exists; UI deferred)
- Invite resend / expiration-extending UI (can revoke + re-invite)

### Verification

1. `npm run build` clean
2. From owner account: Settings → send invite to wife's email
3. Wife receives email with code → enters email on app → gets magic link → signs in
4. JoinHouseholdView shown → enters code → joins household, sees existing entries
5. Owner adds an entry on their phone → within ~2 seconds it appears on wife's phone with no refresh
6. Wife edits an entry → owner sees the update live
7. Wife deletes an entry → owner sees it removed live
8. Owner revokes a pending invite → code stops working for redemption
9. Wife leaves household → she's gone from members list; owner still has all data

---

## Future / Phase 4+ (explicitly not now)

- Multi-baby per household
- Per-user attribution on entries
- Baby profile screen with DOB, start date (replaces `BABY_NAME` constant)
- Push / weekly summary notifications
- Offline queue with retry (beyond localStorage fallback)
- Entry comments / reactions between household members

---

## Risks and open questions

- **Email deliverability:** If Resend emails land in spam, testers won't sign up. Mitigation: owner can always read the `code` from Supabase dashboard or from the pending-invites UI and share manually.
- **Realtime scaling:** Supabase Realtime has per-project connection limits on free tier (~200 concurrent). Not a concern for a handful of testers but worth noting.
- **First-login UX on chunk 3 vs chunk 4:** Chunk 3 auto-creates a household on first login. Chunk 4 introduces the "do you have a code?" prompt. Anyone who signs in between chunks 3 and 4 and later becomes a second member will already have their own household. **Mitigation:** defer inviting anyone until chunk 4 ships. Only the owner signs in during the chunk 3 window.

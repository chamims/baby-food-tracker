-- household_invites: pending invitations; auto-redeemed when invitee signs in
-- with a matching Google email. No email/code roundtrip needed because
-- Google OAuth already proves the email.
create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users(id)
);

-- At most one pending (unredeemed) invite per (household, email, lowercased).
create unique index household_invites_pending
  on household_invites (household_id, lower(email))
  where redeemed_at is null;

-- Fast lookup by email for redemption.
create index household_invites_email_idx
  on household_invites (lower(email))
  where redeemed_at is null;

alter table household_invites enable row level security;

-- Household members see invites for their household (for the pending list UI).
create policy household_invites_select on household_invites for select
  using (household_id in (select household_id from household_members where user_id = auth.uid()));

-- Household members can create invites for their household.
create policy household_invites_insert on household_invites for insert
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));

-- Household members can revoke (delete) pending invites.
create policy household_invites_delete on household_invites for delete
  using (household_id in (select household_id from household_members where user_id = auth.uid()));

-- redeem_pending_invite(): security-definer so it can insert into household_members
-- (which has a locked-down insert policy from chunk 3). Returns the joined
-- household_id, or null if no matching invite exists or the caller already
-- has a household. Always safe to call on every sign-in.
create or replace function redeem_pending_invite()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite household_invites%rowtype;
  v_email text := lower((auth.jwt() ->> 'email')::text);
begin
  if auth.uid() is null or coalesce(v_email, '') = '' then
    return null;
  end if;

  -- Reject if caller already belongs to a household. They must "leave" first.
  if exists (select 1 from household_members where user_id = auth.uid()) then
    return null;
  end if;

  select * into v_invite from household_invites
   where lower(email) = v_email
     and redeemed_at is null
     and expires_at > now()
   order by created_at desc
   limit 1
   for update;

  if not found then
    return null;
  end if;

  insert into household_members (household_id, user_id, role)
    values (v_invite.household_id, auth.uid(), 'member')
    on conflict do nothing;

  update household_invites
     set redeemed_at = now(),
         redeemed_by_user_id = auth.uid()
   where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

revoke all on function redeem_pending_invite() from public;
grant execute on function redeem_pending_invite() to authenticated;

-- leave_household(): security-definer helper for the "Leave household" button.
-- Rules:
--   * Last member (solo) → delete household (cascade deletes food_entries).
--   * Owner leaving with other members → transfer ownership to the oldest
--     remaining member before removing self.
--   * Non-owner member → just remove self.
create or replace function leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_role text;
  v_other_member uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select hm.household_id, hm.role
    into v_household_id, v_role
    from household_members hm
   where hm.user_id = auth.uid()
   limit 1;

  if v_household_id is null then
    return;
  end if;

  -- If caller is the sole member, delete the household (cascade wipes entries + invites).
  if (select count(*) from household_members where household_id = v_household_id) = 1 then
    delete from households where id = v_household_id;
    return;
  end if;

  -- Owner leaving: promote the oldest other member to owner first.
  if v_role = 'owner' then
    select user_id into v_other_member
      from household_members
     where household_id = v_household_id
       and user_id <> auth.uid()
     order by joined_at asc
     limit 1;

    update households
       set owner_user_id = v_other_member
     where id = v_household_id;

    update household_members
       set role = 'owner'
     where household_id = v_household_id
       and user_id = v_other_member;
  end if;

  delete from household_members
   where household_id = v_household_id
     and user_id = auth.uid();
end;
$$;

revoke all on function leave_household() from public;
grant execute on function leave_household() to authenticated;

-- Enable realtime replication on food_entries so household-mates get live updates.
alter publication supabase_realtime add table food_entries;

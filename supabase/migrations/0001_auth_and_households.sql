-- households: one per family unit
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- household_members: maps users to households
create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index on household_members (user_id);

-- add household_id to food_entries
alter table food_entries add column household_id uuid;
update food_entries set household_id = '00000000-0000-0000-0000-000000000000' where household_id is null;
alter table food_entries alter column household_id set not null;
alter table food_entries add constraint food_entries_household_id_fkey
  foreign key (household_id) references households(id) on delete cascade;

-- drop the old permissive policy
drop policy if exists anon_all on food_entries;

-- new RLS: all CRUD gated on household membership
create policy food_entries_select on food_entries for select
  using (household_id in (select household_id from household_members where user_id = auth.uid()));
create policy food_entries_insert on food_entries for insert
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));
create policy food_entries_update on food_entries for update
  using (household_id in (select household_id from household_members where user_id = auth.uid()));
create policy food_entries_delete on food_entries for delete
  using (household_id in (select household_id from household_members where user_id = auth.uid()));

-- RLS on households
alter table households enable row level security;
-- Owner can always see their own household (needed to pass the household_members insert policy).
-- Without this, the member insert's EXISTS subquery would be filtered by this policy,
-- creating a circular dependency that blocks the first insert.
create policy households_select on households for select
  using (
    owner_user_id = auth.uid()
    or id in (select household_id from household_members where user_id = auth.uid())
  );
create policy households_insert on households for insert
  with check (owner_user_id = auth.uid());

-- RLS on household_members
alter table household_members enable row level security;
-- Chunk 3: user sees only their own membership row.
-- (Referencing household_members in its own USING clause causes infinite RLS recursion.)
-- Chunk 4 will add a SECURITY DEFINER function so household-mates can see each other.
create policy household_members_select on household_members for select
  using (user_id = auth.uid());
-- Only a household owner can add themselves as the first member (covers first-login creation).
-- Chunk 4 invite-based joins use a security-definer function that bypasses this.
create policy household_members_insert_self_owner on household_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from households
      where id = household_members.household_id
        and owner_user_id = auth.uid()
    )
  );

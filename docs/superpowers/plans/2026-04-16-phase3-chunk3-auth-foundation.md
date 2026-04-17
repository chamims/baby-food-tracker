# Phase 3 Chunk 3 — Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the permissive `anon_all` Supabase RLS policy with magic-link auth scoped to households, so the app works securely for the owner alone with all existing data preserved.

**Architecture:** A new `useAuth` hook manages Supabase session state and household creation on first login. `useFoodEntries` is gated on `householdId` being available before running any DB queries. `App.tsx` renders a sign-in screen when unauthenticated and the main app when authenticated. `SUPABASE_ENABLED = false` preserves the existing localStorage-only path untouched.

**Tech Stack:** Supabase Auth (magic link), `@supabase/supabase-js` (already installed), React 18 hooks, TypeScript.

**Note on tests:** This project has no test framework configured. Verification steps use `npm run build` (TypeScript + Vite) as the type-check gate, plus browser verification against a live Supabase project. Tests can be added in a future chunk.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `supabase/migrations/0001_auth_and_households.sql` | **Create** | DB schema: households, household_members, household_id on food_entries, new RLS |
| `src/utils/supabase.ts` | **Modify** | Add auth helpers + household DB helpers; update DbRow/entryToRow/dbInsertEntry/dbUpsertEntries for household_id |
| `src/hooks/useAuth.ts` | **Create** | Session state, signIn, signOut, household creation on first login |
| `src/components/Auth/SignInView.tsx` | **Create** | Email input + "Send magic link" + "Check your email" confirmation |
| `src/hooks/useFoodEntries.ts` | **Modify** | Accept `householdId` option; gate DB calls; pass householdId to insert/upsert |
| `src/components/FoodHistory/StatsView.tsx` | **Modify** | Remove direct `dbUpsertEntries` import; receive `onSyncToCloud` callback |
| `src/App.tsx` | **Modify** | Integrate `useAuth`; auth-gated rendering; wire `householdId` and callbacks |
| `src/components/Layout/SettingsModal.tsx` | **Modify** | Add `userEmail` + `onSignOut` props; render account section |

---

## Task 1: Run the Database Migration

**Files:**
- Create: `supabase/migrations/0001_auth_and_households.sql`

This is a manual step. Create the file for version control, then paste its contents into the Supabase dashboard SQL editor and run it.

- [ ] **Step 1.1: Create the migration file**

Create `supabase/migrations/0001_auth_and_households.sql` with this exact content:

```sql
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
create policy households_select on households for select
  using (id in (select household_id from household_members where user_id = auth.uid()));
create policy households_insert on households for insert
  with check (owner_user_id = auth.uid());

-- RLS on household_members
alter table household_members enable row level security;
create policy household_members_select on household_members for select
  using (user_id = auth.uid() or household_id in (
    select household_id from household_members where user_id = auth.uid()
  ));
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
```

- [ ] **Step 1.2: Run the migration in the Supabase dashboard**

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) → your project → SQL Editor
2. Paste the full contents of `0001_auth_and_households.sql` and click **Run**
3. Verify it succeeded: go to Table Editor — you should see `households` and `household_members` tables, and `food_entries` should now have a `household_id` column

- [ ] **Step 1.3: Commit the migration file**

```bash
git add supabase/migrations/0001_auth_and_households.sql
git commit -m "db: add households + auth RLS migration (chunk 3)"
```

---

## Task 2: Update `supabase.ts` — Auth Helpers + Household_id on Rows

**Files:**
- Modify: `src/utils/supabase.ts`

Adds: auth helper functions, two household DB helpers, `household_id` field to `DbRow`, updated `entryToRow` / `dbInsertEntry` / `dbUpsertEntries` signatures.

- [ ] **Step 2.1: Add `Session` import and auth helpers**

At the top of `src/utils/supabase.ts`, update the import line and add auth functions after the existing exports:

Replace:
```ts
import { createClient } from '@supabase/supabase-js';
```
With:
```ts
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
export type { Session };
```

Then add these four auth helpers at the end of the file (after `dbUpsertEntries`):

```ts
// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithOtp(email: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOutFromSupabase(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
```

- [ ] **Step 2.2: Add household DB helpers**

Add these two functions after the auth helpers:

```ts
// ---------------------------------------------------------------------------
// Household helpers
// ---------------------------------------------------------------------------

export async function dbGetHousehold(): Promise<{ id: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .single();
  if (error) return null;
  return { id: (data as { household_id: string }).household_id };
}

export async function dbCreateHousehold(userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not enabled');
  const { data: household, error: hErr } = await supabase
    .from('households')
    .insert({ owner_user_id: userId })
    .select('id')
    .single();
  if (hErr) throw hErr;
  const householdId = (household as { id: string }).id;
  const { error: mErr } = await supabase
    .from('household_members')
    .insert({ household_id: householdId, user_id: userId, role: 'owner' });
  if (mErr) throw mErr;
  return householdId;
}
```

- [ ] **Step 2.3: Add `household_id` to `DbRow` and update `entryToRow`**

In the `DbRow` interface, add `household_id` as the last field:

```ts
interface DbRow {
  id: string;
  date: string;
  food_name: string;
  food_category: string;
  texture: string;
  time_of_day: string;
  amount_eaten: string;
  enjoyment: string;
  allergens: string[];
  is_first_introduction: boolean;
  had_reaction: boolean;
  reaction_delay: string | null;
  symptoms: string[];
  notes: string;
  created_at: string;
  feeding_time: string | null;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } | null;
  photo_analysis: string | null;
  household_id: string;
}
```

Update `entryToRow` to accept a second `householdId` parameter:

```ts
function entryToRow(entry: FoodEntry, householdId: string): DbRow {
  return {
    id: entry.id,
    date: entry.date,
    food_name: entry.foodName,
    food_category: entry.foodCategory,
    texture: entry.texture,
    time_of_day: entry.timeOfDay,
    amount_eaten: entry.amountEaten,
    enjoyment: entry.enjoyment,
    allergens: entry.allergens,
    is_first_introduction: entry.isFirstIntroduction,
    had_reaction: entry.hadReaction,
    reaction_delay: entry.reactionDelay ?? null,
    symptoms: entry.symptoms,
    notes: entry.notes,
    created_at: entry.createdAt,
    feeding_time: entry.feedingTime ?? null,
    nutrition: entry.nutrition ?? null,
    photo_analysis: entry.photoAnalysis ?? null,
    household_id: householdId,
  };
}
```

- [ ] **Step 2.4: Update `dbInsertEntry` and `dbUpsertEntries` signatures**

Replace `dbInsertEntry`:
```ts
export async function dbInsertEntry(entry: FoodEntry, householdId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('food_entries').insert(entryToRow(entry, householdId));
  if (error) throw error;
}
```

Replace `dbUpsertEntries`:
```ts
export async function dbUpsertEntries(entries: FoodEntry[], householdId: string): Promise<number> {
  if (!supabase || entries.length === 0) return 0;
  const rows = entries.map(e => entryToRow(e, householdId));
  const { error, count } = await supabase
    .from('food_entries')
    .upsert(rows, { onConflict: 'id', count: 'exact' });
  if (error) throw error;
  return count ?? rows.length;
}
```

- [ ] **Step 2.5: Verify TypeScript compiles**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1 | head -40
```

Expected: errors only about callers of `dbInsertEntry` / `dbUpsertEntries` that now need `householdId` (those will be fixed in later tasks). No errors inside `supabase.ts` itself.

- [ ] **Step 2.6: Commit**

```bash
git add src/utils/supabase.ts
git commit -m "feat(chunk3): add auth helpers + household_id to supabase.ts"
```

---

## Task 3: Create `useAuth` Hook

**Files:**
- Create: `src/hooks/useAuth.ts`

Manages Supabase session state and household creation on first login. When `SUPABASE_ENABLED` is false, returns `authReady: true` and everything else null, so the rest of the app is unaffected.

- [ ] **Step 3.1: Create the file**

Create `src/hooks/useAuth.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  SUPABASE_ENABLED,
  getSession,
  signInWithOtp,
  signOutFromSupabase,
  onAuthStateChange,
  dbGetHousehold,
  dbCreateHousehold,
} from '../utils/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  householdId: string | null;
  authReady: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    householdId: null,
    authReady: !SUPABASE_ENABLED,
  });

  const resolveHousehold = useCallback(async (user: User) => {
    try {
      const existing = await dbGetHousehold();
      if (existing) {
        setState(prev => ({ ...prev, householdId: existing.id, authReady: true }));
        return;
      }
      const id = await dbCreateHousehold(user.id);
      setState(prev => ({ ...prev, householdId: id, authReady: true }));
    } catch (err) {
      console.error('Failed to resolve household:', err);
      setState(prev => ({ ...prev, authReady: true }));
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    getSession().then(session => {
      if (session) {
        setState(prev => ({ ...prev, session, user: session.user }));
        resolveHousehold(session.user);
      } else {
        setState(prev => ({ ...prev, authReady: true }));
      }
    });

    return onAuthStateChange(session => {
      if (session) {
        setState(prev => ({
          ...prev,
          session,
          user: session.user,
          householdId: null,
          authReady: false,
        }));
        resolveHousehold(session.user);
      } else {
        setState({ session: null, user: null, householdId: null, authReady: true });
      }
    });
  }, [resolveHousehold]);

  const signIn = useCallback(async (email: string) => {
    await signInWithOtp(email);
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
  }, []);

  return { ...state, signIn, signOut };
}
```

- [ ] **Step 3.2: Verify it compiles**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1 | head -40
```

Expected: no new errors in `useAuth.ts`. Existing errors from callers of `dbInsertEntry`/`dbUpsertEntries` are expected and will be fixed in later tasks.

- [ ] **Step 3.3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat(chunk3): add useAuth hook with session + household management"
```

---

## Task 4: Create `SignInView` Component

**Files:**
- Create: `src/components/Auth/SignInView.tsx`

Email input → button sends magic link → confirmation message. Three states: `idle`, `sending`, `sent`.

- [ ] **Step 4.1: Create `src/components/Auth/` directory and `SignInView.tsx`**

```bash
mkdir -p /Users/chaddevoley/Projects/baby-food-tracker/src/components/Auth
```

Create `src/components/Auth/SignInView.tsx`:

```tsx
import { useState } from 'react';

interface SignInViewProps {
  onSignIn: (email: string) => Promise<void>;
}

type SignInState = 'idle' | 'sending' | 'sent';

export default function SignInView({ onSignIn }: SignInViewProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SignInState>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await onSignIn(email.trim().toLowerCase());
      setStatus('sent');
    } catch {
      setStatus('idle');
      setError('Failed to send — check your email address and try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sage-50 dark:bg-stone-900 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🍼</p>
          <h1 className="text-2xl font-bold text-sage-700 dark:text-sage-400">Baby Food Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">Sign in to access your data</p>
        </div>

        {status === 'sent' ? (
          <div className="card text-center py-8">
            <p className="text-3xl mb-3">📬</p>
            <p className="font-semibold text-gray-800 dark:text-stone-100">Check your email</p>
            <p className="text-sm text-gray-500 dark:text-stone-400 mt-2">
              We sent a magic link to <span className="font-medium text-gray-700 dark:text-stone-200">{email}</span>.
              Click the link to sign in.
            </p>
            <button
              onClick={() => { setStatus('idle'); setEmail(''); }}
              className="text-xs text-sage-600 dark:text-sage-400 mt-4 underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-stone-200 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
                className="w-full border border-gray-200 dark:border-stone-600 rounded-xl px-3 py-2.5 text-gray-800 dark:text-stone-100 bg-white dark:bg-stone-700 focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={status === 'sending' || !email.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: Verify it compiles**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1 | head -40
```

Expected: no new errors in `SignInView.tsx`.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/Auth/SignInView.tsx
git commit -m "feat(chunk3): add SignInView component"
```

---

## Task 5: Update `useFoodEntries` — Gate on `householdId`

**Files:**
- Modify: `src/hooks/useFoodEntries.ts`

Changes: accept `householdId` option; gate DB queries on it; change `syncing` init to `false`; pass `householdId` to `dbInsertEntry` and `dbUpsertEntries`.

- [ ] **Step 5.1: Update the options interface and hook signature**

In `src/hooks/useFoodEntries.ts`, update the options interface:

```ts
interface UseFoodEntriesOptions {
  onSyncError?: (message: string) => void;
  householdId?: string | null;
}
```

Update the destructuring at the top of the function body:

```ts
export function useFoodEntries(options: UseFoodEntriesOptions = {}) {
  const { onSyncError, householdId } = options;
```

- [ ] **Step 5.2: Change `syncing` initial state and gate the load `useEffect` on `householdId`**

Change the `syncing` initial state from `SUPABASE_ENABLED` to `false`:

```ts
const [syncing, setSyncing] = useState(false);
```

Replace the existing `useEffect` that loads entries from Supabase:

```ts
useEffect(() => {
  if (!SUPABASE_ENABLED || !householdId) return;
  setSyncing(true);
  dbLoadEntries()
    .then((data) => {
      setEntries(data);
      saveEntries(data);
    })
    .catch((err) => {
      console.error('Failed to load from Supabase, falling back to localStorage:', err);
      setEntries(loadEntries());
    })
    .finally(() => setSyncing(false));
}, [householdId]);
```

- [ ] **Step 5.3: Pass `householdId` to `dbInsertEntry` and `dbUpsertEntries`**

Update the `addEntry` callback to pass `householdId`:

```ts
const addEntry = useCallback((entry: Omit<FoodEntry, 'id' | 'createdAt'>) => {
  const newEntry: FoodEntry = {
    ...entry,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  setEntries(prev => {
    const updated = [...prev, newEntry];
    saveEntries(updated);
    return updated;
  });
  if (SUPABASE_ENABLED && householdId) {
    dbInsertEntry(newEntry, householdId).catch(err => {
      console.error('Supabase insert failed:', err);
      onSyncError?.('Failed to save to cloud — saved locally');
    });
  }
  return newEntry;
}, [householdId, onSyncError]);
```

Update the `importEntries` callback to pass `householdId`:

```ts
const importEntries = useCallback((imported: FoodEntry[]) => {
  setEntries(prev => {
    const existingIds = new Set(prev.map(e => e.id));
    const newEntries = imported.filter(e => !existingIds.has(e.id));
    const merged = [...prev, ...newEntries];
    saveEntries(merged);
    return merged;
  });
  if (SUPABASE_ENABLED && householdId) {
    dbUpsertEntries(imported, householdId).catch(err => {
      console.error('Supabase import sync failed:', err);
      onSyncError?.('Imported locally but cloud sync failed');
    });
  }
}, [householdId, onSyncError]);
```

- [ ] **Step 5.4: Verify it compiles**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1 | head -40
```

Expected: errors reduced. Remaining errors should be in `App.tsx` (caller not passing `householdId` yet) and `StatsView.tsx` (calling `dbUpsertEntries` without `householdId`).

- [ ] **Step 5.5: Commit**

```bash
git add src/hooks/useFoodEntries.ts
git commit -m "feat(chunk3): gate useFoodEntries DB calls on householdId"
```

---

## Task 6: Update `StatsView` — Remove Direct Supabase Coupling

**Files:**
- Modify: `src/components/FoodHistory/StatsView.tsx`

Replaces the direct `dbUpsertEntries` call with an `onSyncToCloud` callback prop. This removes supabase coupling from the component and allows App.tsx to pass the householdId-aware version.

- [ ] **Step 6.1: Update `StatsViewProps` and replace the sync button handler**

In `src/components/FoodHistory/StatsView.tsx`:

Replace the import block at the top (remove `SUPABASE_ENABLED` and `dbUpsertEntries`):

```ts
import { useMemo, useRef, useState } from 'react';
import type { FoodEntry } from '../../types';
import { FOOD_CATEGORIES, ENJOYMENT_LEVELS, ALLERGENS } from '../../utils/constants';
import { importData } from '../../utils/storage';
import { SUPABASE_ENABLED } from '../../utils/supabase';
```

Update the props interface to add `onSyncToCloud`:

```ts
interface StatsViewProps {
  entries: FoodEntry[];
  onImport: (entries: FoodEntry[]) => void;
  onSyncToCloud?: () => Promise<number>;
}
```

Update the component signature:

```ts
export default function StatsView({ entries, onImport, onSyncToCloud }: StatsViewProps) {
```

Replace the "Sync to Cloud" button's onClick handler in the `return` block (the non-empty state section):

```tsx
{SUPABASE_ENABLED && onSyncToCloud && (
  <button
    onClick={async () => {
      setSyncing(true);
      setSyncStatus('');
      try {
        const count = await onSyncToCloud();
        setSyncStatus(`Synced ${count} entries to cloud ✓`);
      } catch {
        setSyncStatus('Sync failed — check connection');
      } finally {
        setSyncing(false);
      }
    }}
    disabled={syncing || entries.length === 0}
    className="btn-secondary w-full text-sm mt-2 disabled:opacity-50"
  >
    {syncing ? 'Syncing…' : 'Sync to Cloud ☁️'}
  </button>
)}
```

Also update the identical Sync button in the **empty-state** early-return block (the one rendered when `entries.length === 0`). Find the empty state `<div className="card">` that also has a Sync button, and apply the same replacement pattern there.

- [ ] **Step 6.2: Verify it compiles**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1 | head -40
```

Expected: `StatsView.tsx` errors gone. Remaining errors in `App.tsx` only.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/FoodHistory/StatsView.tsx
git commit -m "feat(chunk3): decouple StatsView from supabase, use onSyncToCloud callback"
```

---

## Task 7: Update `App.tsx` — Auth-Gated Rendering

**Files:**
- Modify: `src/App.tsx`

Integrates `useAuth`, renders `SignInView` when unauthenticated, passes `householdId` to `useFoodEntries`, wires `onSyncToCloud` to StatsView, passes `userEmail` and `onSignOut` to SettingsModal.

- [ ] **Step 7.1: Add imports**

At the top of `src/App.tsx`, add these imports (keep all existing ones):

```ts
import { useAuth } from './hooks/useAuth';
import { SUPABASE_ENABLED, dbUpsertEntries } from './utils/supabase';
import SignInView from './components/Auth/SignInView';
```

Remove the existing `import { SUPABASE_ENABLED } from './utils/supabase'` line (it's now covered above).

- [ ] **Step 7.2: Add `useAuth` call and wire `householdId` into `useFoodEntries`**

After the existing `useState` / `useEffect` calls, add `useAuth`:

```ts
const { session, user, householdId, authReady, signIn, signOut } = useAuth();
```

Update the `useFoodEntries` call to pass `householdId`:

```ts
const {
  entries,
  syncing,
  addEntry,
  updateEntry,
  deleteEntry,
  importEntries,
  isFirstIntroduction,
  recentNewAllergens,
} = useFoodEntries({ onSyncError: showToast, householdId });
```

- [ ] **Step 7.3: Add the `onSyncToCloud` callback**

After the existing `handleImport` callback, add:

```ts
const handleSyncToCloud = useCallback(async () => {
  if (!householdId) throw new Error('No household');
  return dbUpsertEntries(entries, householdId);
}, [entries, householdId]);
```

- [ ] **Step 7.4: Add auth-gated rendering at the top of the return block**

In the `return (...)`, right after `<div className="min-h-screen ...">` and before `<Header`, add:

```tsx
{SUPABASE_ENABLED && !authReady && (
  <div className="min-h-screen flex flex-col items-center justify-center bg-sage-50 dark:bg-stone-900">
    <div className="w-8 h-8 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin mb-3" />
    <p className="text-sm text-gray-400 dark:text-stone-500">Loading…</p>
  </div>
)}
{SUPABASE_ENABLED && authReady && !session && (
  <SignInView onSignIn={signIn} />
)}
{(!SUPABASE_ENABLED || (authReady && session)) && (
  <>
    <Header
      view={view}
      babyName={profile.babyName}
      themePref={themePref}
      onToggleTheme={toggleTheme}
      onOpenSettings={() => setShowSettings(true)}
      cloudEnabled={SUPABASE_ENABLED}
    />
    {/* ... rest of the existing JSX inside here ... */}
  </>
)}
```

Move the entire existing JSX (Header through the toast div) inside the third conditional block.

- [ ] **Step 7.5: Pass `userEmail` and `onSignOut` to `SettingsModal`**

Update the `<SettingsModal>` props:

```tsx
<SettingsModal
  open={showSettings}
  onClose={() => setShowSettings(false)}
  initialProfile={profile}
  onSave={(updated) => {
    saveProfile(updated);
    setProfile(updated);
  }}
  userEmail={user?.email}
  onSignOut={SUPABASE_ENABLED ? signOut : undefined}
/>
```

- [ ] **Step 7.6: Pass `onSyncToCloud` to `StatsView`**

Update the `<StatsView>` call:

```tsx
{view === 'stats' && (
  <StatsView
    entries={entries}
    onImport={handleImport}
    onSyncToCloud={householdId ? handleSyncToCloud : undefined}
  />
)}
```

- [ ] **Step 7.7: Verify it compiles**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1 | head -40
```

Expected: errors only in `SettingsModal.tsx` (doesn't accept the new props yet). No errors in `App.tsx`.

- [ ] **Step 7.8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(chunk3): auth-gated rendering in App.tsx"
```

---

## Task 8: Update `SettingsModal` — Account Section

**Files:**
- Modify: `src/components/Layout/SettingsModal.tsx`

Adds `userEmail` and `onSignOut` props. Renders an "Account" section at the bottom showing the signed-in email and a sign-out button.

- [ ] **Step 8.1: Update props interface and component signature**

In `src/components/Layout/SettingsModal.tsx`, update the interface:

```ts
interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: BabyProfile) => void;
  initialProfile: BabyProfile;
  userEmail?: string;
  onSignOut?: () => void;
}
```

Update the destructuring:

```ts
export default function SettingsModal({ open, onClose, onSave, initialProfile, userEmail, onSignOut }: SettingsModalProps) {
```

- [ ] **Step 8.2: Add account section to the modal body**

Inside `<div className="p-4 space-y-4">`, add this block after the existing three form fields (Solids start date):

```tsx
{userEmail && onSignOut && (
  <div className="border-t border-gray-100 dark:border-stone-700 pt-4">
    <p className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wide mb-2">Account</p>
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-700 dark:text-stone-200 truncate mr-3">{userEmail}</p>
      <button
        onClick={() => { onSignOut(); onClose(); }}
        className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 whitespace-nowrap flex-shrink-0"
      >
        Sign out
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 8.3: Verify the full project compiles cleanly**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && ./node_modules/.bin/tsc --noEmit 2>&1
```

Expected: **zero errors**.

- [ ] **Step 8.4: Commit**

```bash
git add src/components/Layout/SettingsModal.tsx
git commit -m "feat(chunk3): add account section to SettingsModal"
```

---

## Task 9: Full Build Verification

**Files:** none — verification only

- [ ] **Step 9.1: Run the production build**

```bash
cd /Users/chaddevoley/Projects/baby-food-tracker && npm run build 2>&1
```

Expected: `✓ built in X.Xs` with no TypeScript errors.

- [ ] **Step 9.2: Start dev server and verify graceful degradation (localStorage mode)**

```bash
npm run dev
```

1. Open `http://localhost:5173` in a browser
2. Confirm: no sign-in screen appears (app loads normally, localStorage mode)
3. Confirm: cloud icon is absent from the header
4. Add / edit / delete an entry — all works normally

- [ ] **Step 9.3: Manual browser test with Supabase enabled**

Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in `.env.local`, then restart dev server.

1. Open in incognito tab → sign-in screen appears (email input + "Send magic link" button)
2. Enter your email → button shows "Sending…" → then "Check your email" confirmation appears
3. Click the magic link from your email → browser redirects back → you're signed in
4. You see zero entries (expected — existing rows have the placeholder `household_id`, not yet migrated)
5. Cloud icon (☁️) is visible in the header
6. Open Settings ⚙️ → "Account" section shows your email + "Sign out" button
7. Sign out → sign-in screen reappears
8. Open in a second incognito tab → sign-in screen again; signing in there also works

- [ ] **Step 9.4: Commit if any last fixes were made**

If any small issues were found and fixed in 9.3, commit them now before continuing to Task 10.

---

## Task 10: Post-Login Data Migration

**Files:** none — manual SQL only

This is a one-time step to attach existing `food_entries` rows (currently pointing at a placeholder UUID) to the owner's real household.

- [ ] **Step 10.1: Find your household ID**

After signing in (Task 9.3 step 3), go to the Supabase dashboard → Table Editor → `households`. Find the row with your email as `owner_user_id`. Copy its `id` value (a UUID like `a1b2c3d4-...`).

Alternatively, run in Supabase SQL editor:

```sql
select id, owner_user_id from households;
```

- [ ] **Step 10.2: Attach existing entries**

In the Supabase SQL editor, run (replace `<your-household-id>` with the UUID from step 10.1):

```sql
update food_entries
set household_id = '<your-household-id>'
where household_id = '00000000-0000-0000-0000-000000000000';
```

Expected: `UPDATE N` where N is your number of existing food entries.

- [ ] **Step 10.3: Verify entries are visible**

Reload the app. Your food entries should now appear in the Calendar and History views.

Alternatively, if you'd rather use the localStorage-based migration path: in the app, go to Stats → "Sync to Cloud ☁️" button. This upserts all localStorage entries with your correct `household_id`. Both methods work; the SQL approach is faster and deduplication-safe.

- [ ] **Step 10.4: Final commit (update spec status)**

Update the `Status` line in `docs/superpowers/specs/2026-04-16-phase3-chunks-3-and-4-design.md`:

Change:
```markdown
**Status:** Design approved. Ready for implementation-plan phase.
```
To:
```markdown
**Status:** Chunk 3 complete. Chunk 4 ready for implementation.
```

Then commit everything:
```bash
git add docs/superpowers/specs/2026-04-16-phase3-chunks-3-and-4-design.md
git commit -m "feat(phase3/chunk3): auth foundation complete — magic-link auth, households, RLS"
```

---

## Self-Review Checklist (completed by plan author)

**Spec coverage:**
- [x] Magic-link auth via `signInWithOtp` → Task 2 + 3 + 4
- [x] `households` + `household_members` tables + RLS → Task 1
- [x] `household_id` on `food_entries` + RLS → Task 1 + 2
- [x] `useAuth` hook with session, household, signIn, signOut → Task 3
- [x] `SignInView` component → Task 4
- [x] `useFoodEntries` gated on `householdId` → Task 5
- [x] `App.tsx` auth-gated rendering → Task 7
- [x] `SettingsModal` account section → Task 8
- [x] `SUPABASE_ENABLED = false` graceful degradation → preserved in every task
- [x] One-time data migration SQL → Task 10
- [x] `StatsView` decoupled from direct `dbUpsertEntries` call → Task 6

**Type consistency:**
- `dbInsertEntry(entry, householdId)` — defined in Task 2, used in Task 5 ✓
- `dbUpsertEntries(entries, householdId)` — defined in Task 2, used in Tasks 5, 7 ✓
- `useAuth()` returns `{ session, user, householdId, authReady, signIn, signOut }` — defined in Task 3, consumed in Task 7 ✓
- `SettingsModal` new props `userEmail?: string, onSignOut?: () => void` — defined in Task 8, passed in Task 7 ✓
- `StatsView` new prop `onSyncToCloud?: () => Promise<number>` — defined in Task 6, passed in Task 7 ✓

# src/hooks/

Custom React hooks.

## Files

### `useFoodEntries.ts`
Single source of truth for all food entry CRUD. Consumed by `App.tsx`.

**Persistence strategy:**
- When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set → loads from Supabase on mount; writes update localStorage optimistically then sync to Supabase in background. Subscribes to a Supabase Realtime channel filtered by `household_id` for live insert/update/delete from household-mates (deduped by id against optimistic writes). Clears in-memory + localStorage state when `householdId` goes null so sign-out on a shared browser doesn't leak the prior user's data.
- Without those env vars → localStorage only (original Phase 1/2 behaviour).

**`useAuth.ts`**
- Owns session + `householdId`. On first post-sign-in mount with no existing membership, calls `redeem_pending_invite()` before creating a new household — so Gmail users who've been invited by the owner auto-join the owner's household instead of creating a solo one.

**Returned API:**

| Symbol | Description |
|--------|-------------|
| `entries` | Full `FoodEntry[]`, sorted by `createdAt` ascending |
| `syncing` | `true` while the initial Supabase load is in flight |
| `addEntry(entry)` | Generates `id` + `createdAt`, persists locally + optimistically to Supabase, returns new entry |
| `updateEntry(id, updates)` | Merges partial updates locally + async-syncs to Supabase |
| `deleteEntry(id)` | Removes by id locally + async-deletes from Supabase |
| `importEntries(imported)` | Dedupes by id and merges; bulk-upserts to Supabase when signed in |
| `isFirstIntroduction(foodName, _date)` | `true` if no other stored entry has the same food name (case-insensitive). Second argument is accepted for API stability but unused — correctness comes from the new entry not yet being in `entries`, and edit-mode skipping re-evaluation unless the name changed. |
| `recentNewAllergens` | Memoized list of allergens first introduced in the last 5 days, with human-readable wait-until windows for the history-view reminder cards |

## Notes
- Do not add data-fetching logic directly to components — always go through this hook.
- When rapid successive `updateEntry` calls fire, realtime echoes may briefly replay an older value before the newer DB write's echo lands. In practice this is a sub-second flash; if it ever becomes user-visible, add a local write-timestamp check before applying realtime `UPDATE` payloads.

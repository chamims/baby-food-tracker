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
| `addEntry(entry)` | Generates `id` + `createdAt`, persists, returns new entry |
| `updateEntry(id, updates)` | Merges partial updates; **exists but not yet wired to any UI** |
| `deleteEntry(id)` | Removes by id |
| `getEntriesForDate(date)` | Filter by YYYY-MM-DD |
| `getEntriesForMonth(year, month)` | Filter by year/month (0-indexed month) |
| `getFoodNames()` | Sorted unique food names (lowercase) |
| `isFirstIntroduction(foodName, date)` | `true` if no earlier entry has the same food name |

## Notes
- Do not add data-fetching logic directly to components — always go through this hook.
- `updateEntry` is ready; wire it to `FoodEntryCard` for the Phase 2 edit feature.

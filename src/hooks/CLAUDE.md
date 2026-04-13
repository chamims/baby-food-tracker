# src/hooks/

Custom React hooks.

## Files

### `useFoodEntries.ts`
Single source of truth for all food entry CRUD. Consumed by `App.tsx`.

**Persistence strategy:**
- When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set → loads from Supabase on mount; writes update localStorage optimistically then sync to Supabase in background.
- Without those env vars → localStorage only (original Phase 1/2 behaviour).

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

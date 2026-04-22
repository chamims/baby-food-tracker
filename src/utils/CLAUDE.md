# src/utils/

Utility modules. No React here — pure functions and clients only.

## Files

### `constants.ts`
All lookup data the app reads at runtime. **Only file to edit when adding new allergens, categories, or symptoms.**

| Export | Type | Description |
|--------|------|-------------|
| `ALLERGENS` | readonly array | 9 major allergens with id, label, emoji |
| `SYMPTOMS` | readonly array | 10 reaction symptoms |
| `FOOD_CATEGORIES` | array | 6 categories with id, label, emoji, Tailwind colour class |
| `TEXTURES` | array | 4 texture options |
| `TIMES_OF_DAY` | array | 4 time buckets with emoji |
| `AMOUNTS` | array | 5 amount levels |
| `ENJOYMENT_LEVELS` | array | 5 enjoyment levels with colour class |
| `STORAGE_KEY` | string | `'baby-food-tracker-entries'` |

### `storage.ts`
localStorage helpers.

| Export | Description |
|--------|-------------|
| `loadEntries()` | Parse `FoodEntry[]` from localStorage; returns `[]` on error |
| `saveEntries(entries)` | Stringify and write to localStorage |
| `importData(file)` | Parse and validate uploaded JSON file into `FoodEntry[]` |

Export-to-JSON lives inline in `StatsView` (`handleExport`) so it serializes the in-memory `entries` prop — that way cloud-synced data is included without another round-trip through localStorage.

### `ai.ts`
Anthropic Claude API helpers (via `@anthropic-ai/sdk` with `dangerouslyAllowBrowser: true`). All exports are no-ops / hidden when `AI_ENABLED` is `false`.

| Export | Description |
|--------|-------------|
| `AI_ENABLED` | `true` only when `VITE_ANTHROPIC_API_KEY` is set |
| `deriveTimeOfDay(hhmm)` | Maps HH:MM string → `TimeOfDay` bucket |
| `analyzeFood(name)` | Text call to `claude-haiku-4-5` → category, allergens, nutrition |
| `analyzeFoodImage(base64, mimeType)` | Vision call to `claude-sonnet-4-6` → foodName, category, allergens, notes. Two-step fallback: if `foodName` is empty but `notes` has content, a Haiku text call extracts the name. |

### `supabase.ts`
Supabase client and typed query helpers. Active only when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set.

| Export | Description |
|--------|-------------|
| `SUPABASE_ENABLED` | `true` when both env vars are present |
| `supabase` | `SupabaseClient \| null` |
| `dbLoadEntries()` | Fetch all rows ordered by `created_at` |
| `dbInsertEntry(entry)` | Insert a full `FoodEntry` (camelCase → snake_case) |
| `dbUpdateEntry(id, updates)` | Partial update by id |
| `dbDeleteEntry(id)` | Delete by id |
| `signInWithGoogle()` | Starts Supabase OAuth redirect to Google; returns user to `window.location.origin` |
| `signOutFromSupabase()` | Ends current session |
| `getSession()` / `onAuthStateChange(cb)` | Session readers used by `useAuth` |
| `dbRedeemPendingInvite()` | RPC → `redeem_pending_invite()`. Auto-joins caller to any household with a pending invite matching their verified Gmail; returns `household_id` or `null` |
| `dbListInvites(householdId)` / `dbCreateInvite(householdId, email, userId)` / `dbRevokeInvite(id)` | Pending-invite CRUD for the Settings UI |
| `dbLeaveHousehold()` | RPC → `leave_household()`. Solo member → deletes household; owner with others → transfers ownership to oldest other member; plain member → removes self |
| `subscribeFoodEntries(householdId, handlers)` | Realtime channel filtered by `household_id=eq.<id>`; fires `onInsert` / `onUpdate` / `onDelete`; returns an unsubscribe fn |

The `DbRow` interface (internal) mirrors `FoodEntry` in snake_case and must stay in sync with the `food_entries` Supabase table schema and `src/types/index.ts`.

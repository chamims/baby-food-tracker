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
| `exportData()` | Download all entries as a JSON file |
| `importData(file)` | Parse uploaded JSON file into `FoodEntry[]` |

`exportData` / `importData` are implemented but not yet wired to UI buttons (Phase 2 backlog).

### `ai.ts`
Claude API helpers. All exports are no-ops / hidden when `AI_ENABLED` is `false`.

| Export | Description |
|--------|-------------|
| `AI_ENABLED` | `true` only when `VITE_ANTHROPIC_API_KEY` is set |
| `deriveTimeOfDay(hhmm)` | Maps HH:MM string → `TimeOfDay` bucket |
| `analyzeFood(name)` | Text call to Haiku → category, allergens, nutrition |
| `analyzeFoodImage(base64, mimeType)` | Vision call to Haiku → foodName, category, allergens, notes. Two-step fallback: if `foodName` is empty but `notes` has content, a second text call extracts the name. |

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

The `DbRow` interface (internal) mirrors `FoodEntry` in snake_case and must stay in sync with the `food_entries` Supabase table schema and `src/types/index.ts`.

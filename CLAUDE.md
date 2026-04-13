# Baby Food Tracker — Project Brief

A mobile-first web app for parents tracking solid food introductions during their baby's transition from bottle feeding (starting ~6 months). Parents can log each feeding session with food details, allergen flags, enjoyment levels, and any reactions.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (custom sage/peach color palette)
- **Data:** localStorage (key: `baby-food-tracker-entries`) — Phase 3 migrates to Supabase
- **AI:** `@anthropic-ai/sdk` — food analysis + photo recognition via Claude (gated behind `VITE_ANTHROPIC_API_KEY`)
- **Utilities:** date-fns (date math), uuid (ID generation)

## Running the App
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build
```

Optional: copy `.env.example` to `.env.local` and add `VITE_ANTHROPIC_API_KEY` to enable AI features.

## Architecture

### Data Model (`src/types/index.ts`)
`FoodEntry` is the core entity. Key fields:
- `date` (YYYY-MM-DD), `foodName`, `foodCategory`, `texture`, `timeOfDay`
- `feedingTime?` — actual HH:MM time (new), `timeOfDay` is derived from it
- `amountEaten`, `enjoyment` — rated per feeding
- `allergens[]` — from the 9 major allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame)
- `hadReaction`, `symptoms[]`, `reactionDelay` — reaction tracking
- `isFirstIntroduction` — auto-detected based on prior entries
- `notes` — free text
- `nutrition?` — AI-estimated per-100g macros (calories, protein, carbs, fat, fiber)
- `photoAnalysis?` — one-sentence AI description from photo capture

All lookup data (allergens, symptoms, categories, etc.) lives in `src/utils/constants.ts`.

### State Management
`useFoodEntries` hook (`src/hooks/useFoodEntries.ts`) manages all CRUD operations and auto-persists to localStorage. `updateEntry` is implemented but not yet wired to any UI (needed for Phase 2 edit feature).

### AI (`src/utils/ai.ts`)
- `AI_ENABLED` — false when `VITE_ANTHROPIC_API_KEY` is absent; all AI UI is hidden
- `analyzeFood(name)` — text call to Haiku; returns category, allergens, nutrition
- `analyzeFoodImage(base64, mimeType)` — vision call to Haiku; returns foodName, category, allergens, notes. Has a two-step fallback: if foodName is empty but notes has content, a second text call extracts the name from the description.
- `deriveTimeOfDay(hhmm)` — maps HH:MM → morning/midday/afternoon/evening

### Views
| View | Component | Purpose |
|------|-----------|---------|
| Calendar | `CalendarView` | Monthly calendar, emoji food dots per day, day detail panel |
| History | `FoodHistoryView` | Searchable/filterable list of all entries |
| Stats | `StatsView` | Enjoyment breakdown, category breakdown, favorites, allergen summary |

### Key Components
- `AddFoodModal` — 4-step guided form (food name → details → reactions → notes). Includes time picker, AI debounce analysis, photo capture with thumbnail
- `FoodEntryCard` — expandable card showing entry details (time, nutrition, photo notes), inline delete
- `DayCell` — calendar day tile with food emoji dots and ⭐/⚠️ badges

## Roadmap

### Phase 1 — COMPLETE ✅
- [x] Calendar view with monthly navigation
- [x] 4-step Add Food modal
- [x] Food entry cards (expandable)
- [x] Food history with search + filter + sort
- [x] Stats view (enjoyment, category, favorites, allergens)
- [x] localStorage persistence
- [x] Allergen tracking (9 major allergens)
- [x] Reaction/symptom logging
- [x] First introduction auto-detection

### Phase 2 — IN PROGRESS 🔄

**Shipped:**
- [x] Actual time picker replacing the 4 emoji time-of-day buttons
- [x] AI auto-detect category, allergens, nutrition on food name input (debounced 800ms)
- [x] Photo / OCR capture → Claude Vision identifies food name, category, allergens
- [x] Nutrition grid shown in step 4 summary and expanded card view
- [x] Feeding time shown on entry cards ("07:30 🌅")
- [x] Export/import functions built (`src/utils/storage.ts`) — needs UI wiring

**Backlog:**
- [ ] Baby profile screen (name, DOB, start date) — `BABY_NAME` hardcoded in `App.tsx`
- [ ] Edit entry — `updateEntry()` hook exists in `useFoodEntries.ts`, wire to `FoodEntryCard`
- [ ] "Wait 3–5 days" allergen rule reminder after new allergen introduction
- [ ] Expand food suggestions beyond 24 static items in `AddFoodModal`
- [ ] Export/Import UI buttons (functions already in `src/utils/storage.ts`)
- [ ] Weekly summary / push notifications (needs backend)

### Phase 3 — PLANNED 📋 (Supabase)

**Goal:** Replace localStorage with Supabase so data persists across devices.

**Setup (user, one-time):**
1. Create free Supabase project → run SQL schema (see plan file)
2. Add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to Vercel env vars

**Code changes:**
- New `src/utils/supabase.ts` — typed query helpers wrapping `@supabase/supabase-js`
- Update `src/hooks/useFoodEntries.ts` — replace localStorage with Supabase calls, keep localStorage as offline fallback
- Migration path: export existing data via `storage.ts` `exportData()`, re-import to Supabase

**Phase 3b (later):** Add Supabase Auth (Google/email) + row-level security for family sharing.

## Design System
Colors defined in `tailwind.config.js`:
- `sage-*` — primary green tones (buttons, active states)
- `peach-*` — accent warm orange (charts, category bars)
- Amber — allergen warnings
- Red — reactions/symptoms

## Notes for Claude Code
- Keep all components under `src/components/`. Group by feature, not type.
- The `BABY_NAME` constant in `App.tsx` is a placeholder; Phase 2 adds a settings screen.
- When adding new food categories or allergens, update `src/utils/constants.ts` only — components read from there.
- localStorage data format is `FoodEntry[]` — migrations needed when schema changes.
- Do not add a backend until Phase 3; localStorage is intentional for Phase 1/2.
- AI features are entirely opt-in via `AI_ENABLED` — app works fully without an API key.
- `updateEntry` is already implemented in `useFoodEntries.ts` but not exposed in `App.tsx` — wire it up for the Phase 2 edit feature.

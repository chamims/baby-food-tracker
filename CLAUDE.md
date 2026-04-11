# Baby Food Tracker — Project Brief

A mobile-first web app for parents tracking solid food introductions during their baby's transition from bottle feeding (starting ~6 months). Parents can log each feeding session with food details, allergen flags, enjoyment levels, and any reactions.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (custom sage/peach color palette)
- **Data:** localStorage (key: `baby-food-tracker-entries`) — plan to migrate to Supabase/Railway when deploying
- **Utilities:** date-fns (date math), uuid (ID generation)

## Running the App
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build
```

## Architecture

### Data Model (`src/types/index.ts`)
`FoodEntry` is the core entity. Key fields:
- `date` (YYYY-MM-DD), `foodName`, `foodCategory`, `texture`, `timeOfDay`
- `amountEaten`, `enjoyment` — rated per feeding
- `allergens[]` — from the 9 major allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame)
- `hadReaction`, `symptoms[]`, `reactionDelay` — reaction tracking
- `isFirstIntroduction` — auto-detected based on prior entries
- `notes` — free text

All lookup data (allergens, symptoms, categories, etc.) lives in `src/utils/constants.ts`.

### State Management
`useFoodEntries` hook (`src/hooks/useFoodEntries.ts`) manages all CRUD operations and auto-persists to localStorage.

### Views
| View | Component | Purpose |
|------|-----------|---------|
| Calendar | `CalendarView` | Monthly calendar, emoji food dots per day, day detail panel |
| History | `FoodHistoryView` | Searchable/filterable list of all entries |
| Stats | `StatsView` | Enjoyment breakdown, category breakdown, favorites, allergen summary |

### Key Components
- `AddFoodModal` — 4-step guided form (food name → details → reactions → notes)
- `FoodEntryCard` — expandable card showing entry details, inline delete
- `DayCell` — calendar day tile with food emoji dots and ⭐/⚠️ badges

## Roadmap / TODO

### Phase 1 (complete ✓)
- [x] Calendar view with monthly navigation
- [x] 4-step Add Food modal
- [x] Food entry cards (expandable)
- [x] Food history with search + filter + sort
- [x] Stats view (enjoyment, category, favorites, allergens)
- [x] localStorage persistence
- [x] Allergen tracking (9 major allergens)
- [x] Reaction/symptom logging
- [x] First introduction auto-detection

### Phase 2 (next up)
- [ ] Baby profile setup (name, DOB, start date)
- [ ] Data export to JSON / import backup
- [ ] Food suggestions database (expand beyond 24 suggestions)
- [ ] "Wait 3–5 days" rule reminder after new allergen introduction
- [ ] Edit entry (currently only add/delete)
- [ ] Photo attachment per entry
- [ ] Weekly summary email / push notification

### Phase 3 (cloud / deployment)
- [ ] Supabase backend for data persistence
- [ ] Deploy to Vercel or Railway
- [ ] Multi-device sync
- [ ] Family sharing (multiple parent accounts)
- [ ] Pediatrician report export (PDF)

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
- localStorage data format is `FoodEntry[]` — migrations will be needed when the schema changes.
- Do not add a backend until Phase 3; localStorage is intentional for Phase 1.

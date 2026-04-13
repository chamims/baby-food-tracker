# src/components/FoodHistory/

History list and statistics dashboard.

## Files

### `FoodHistoryView.tsx`
Searchable, filterable, sortable list of all food entries.

- **Search:** free-text match on `foodName` and `notes`.
- **Filter:** by food category (`FoodCategory` values from constants).
- **Sort:** newest first (default) or oldest first.
- Each result renders a `FoodEntryCard`.

### `StatsView.tsx`
Aggregated insights over all entries.

| Section | Description |
|---------|-------------|
| Enjoyment breakdown | Count per `EnjoymentLevel`, colour-coded |
| Category breakdown | Count per `FoodCategory`, colour bars using `peach-*` palette |
| Favorites | Top 3 foods by `loved_it` + `liked_it` count |
| Allergen summary | List of allergens ever encountered with food names |

## Notes
- Both components receive `entries: FoodEntry[]` directly from `App.tsx` — no internal data fetching.
- All label/emoji/colour data comes from `src/utils/constants.ts`; do not hardcode here.

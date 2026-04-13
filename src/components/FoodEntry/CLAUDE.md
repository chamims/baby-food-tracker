# src/components/FoodEntry/

Components for creating and viewing individual food entries.

## Files

### `AddFoodModal.tsx`
4-step guided form for logging a feeding session.

| Step | Fields |
|------|--------|
| 1 — Food | Food name (text + AI debounce), photo capture, category |
| 2 — Details | Texture, time picker (HH:MM), amount eaten, enjoyment |
| 3 — Reactions | `hadReaction` toggle, symptoms checkboxes, reaction delay |
| 4 — Notes | Free-text notes, nutrition summary grid |

Key behaviours:
- **AI auto-detect** (when `AI_ENABLED`): 800 ms debounce on food name input calls `analyzeFood()` → auto-fills category, allergens, and nutrition.
- **Photo capture** (when `AI_ENABLED`): camera input calls `analyzeFoodImage()` → auto-fills food name, category, allergens, and shows thumbnail.
- Allergens in step 1 are derived from AI analysis; user can always override.
- `isFirstIntroduction` is computed from the hook and displayed as a badge in step 4.

### `FoodEntryCard.tsx`
Expandable card showing a single `FoodEntry`.

- Collapsed: food name, emoji, time badge, first-intro / reaction flags.
- Expanded: full details — texture, amount, enjoyment, allergens, symptoms, nutrition grid, AI photo notes.
- Inline delete button (calls `onDeleteEntry`).

## Notes
- `updateEntry` exists in the hook but is **not yet wired** to this card — Phase 2 edit feature.
- Food suggestions list in `AddFoodModal` is currently 24 static items; Phase 2 expands these.

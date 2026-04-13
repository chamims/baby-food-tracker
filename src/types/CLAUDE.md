# src/types/

TypeScript type definitions for the entire app. All types are re-exported from `index.ts`.

## Core Types (`index.ts`)

### `FoodEntry`
The primary data entity stored in localStorage / Supabase.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID v4 |
| `date` | `string` | YYYY-MM-DD |
| `foodName` | `string` | |
| `foodCategory` | `FoodCategory` | |
| `texture` | `Texture` | |
| `timeOfDay` | `TimeOfDay` | Derived from `feedingTime` via `deriveTimeOfDay()` |
| `feedingTime` | `string?` | HH:MM 24-hour format |
| `amountEaten` | `AmountEaten` | |
| `enjoyment` | `EnjoymentLevel` | |
| `allergens` | `string[]` | IDs from `ALLERGENS` constant |
| `isFirstIntroduction` | `boolean` | Auto-detected by hook |
| `hadReaction` | `boolean` | |
| `reactionDelay` | `ReactionDelay \| null` | |
| `symptoms` | `string[]` | IDs from `SYMPTOMS` constant |
| `notes` | `string` | |
| `createdAt` | `string` | ISO timestamp |
| `nutrition` | `object?` | AI-estimated per-100 g macros |
| `photoAnalysis` | `string?` | One-sentence AI description |

### Union / Enum Types
`FoodCategory`, `Texture`, `TimeOfDay`, `AmountEaten`, `EnjoymentLevel`, `ReactionDelay`, `View`

## Notes
- Schema changes here require a localStorage migration (existing entries won't have new fields).
- When adding a new field, make it optional (`field?: T`) so old stored data stays valid.
- The Supabase `food_entries` table mirrors this type in snake_case — update `src/utils/supabase.ts` (`DbRow` interface) when this type changes.

# src/components/Calendar/

Monthly calendar view and individual day tiles.

## Files

### `CalendarView.tsx`
Top-level calendar page. Manages:
- `currentMonth` — navigated with prev/next arrows using `date-fns` (`addMonths` / `subMonths`)
- `selectedDate` — clicking a day opens a slide-up detail panel below the grid showing that day's entries (`FoodEntryCard` list)
- `showAddModal` — opens `AddFoodModal` pre-filled with the tapped date

Props: `entries`, `onAddEntry`, `onDeleteEntry`, `isFirstIntroduction`

### `DayCell.tsx`
Single day tile in the grid. Renders:
- Day number (greyed out when outside current month, highlighted ring when today)
- Up to 3 food category emoji dots (overflow shown as `+N`)
- ⭐ badge when any entry for that day is a first introduction
- ⚠️ badge when any entry had a reaction

Props: `date` (YYYY-MM-DD), `dayNumber`, `isToday`, `isCurrentMonth`, `entries`, `onClick`

## Notes
- Emoji per food category comes from `FOOD_CATEGORIES` in `src/utils/constants.ts` — do not hardcode emojis here.
- The grid always shows 6 weeks (42 cells) using `startOfWeek` / `endOfWeek` padding from `date-fns`.

# src/components/Layout/

App-wide chrome: sticky header and bottom navigation bar.

## Files

### `Header.tsx`
Sticky top bar. Displays:
- View title (mapped from `VIEW_TITLES` record keyed by `View` type).
- "Tracking for {babyName}" subtitle when `babyName` prop is provided.
- 🍼 emoji logo on the right.

Props: `view: View`, `babyName?: string`

### `Navigation.tsx`
Sticky bottom tab bar with three tabs: Calendar, History, Stats.

- Active tab gets a sage-coloured background + top indicator bar.
- Calls `onViewChange(view)` on tap.

Props: `view: View`, `onViewChange: (view: View) => void`

## Notes
- `NAV_ITEMS` and `VIEW_TITLES` are defined locally in each file (they're small and layout-specific).
- Both components are capped at `max-w-lg` to match the mobile-first layout constraint.

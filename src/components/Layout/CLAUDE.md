# src/components/Layout/

App-wide chrome: sticky header and bottom navigation bar.

## Files

### `Header.tsx`
Sticky top bar. Displays:
- View title (mapped from `VIEW_TITLES` record keyed by `View` type).
- "Tracking for {babyName}" subtitle when `babyName` prop is provided.
- Right-side controls: cloud icon (☁️) when Supabase is enabled, theme toggle (🌙/☀️), settings cog (⚙️).

Props: `view`, `babyName?`, `themePref`, `onToggleTheme`, `onOpenSettings?`, `cloudEnabled?`

### `Navigation.tsx`
Sticky bottom tab bar with three tabs: Calendar, History, Stats.

- Active tab gets a sage-coloured background + top indicator bar.
- Calls `onViewChange(view)` on tap.

Props: `view: View`, `onViewChange: (view: View) => void`

### `SettingsModal.tsx`
Modal for baby profile (name, DOB, solids start date) + household management (invite list, send-invite form, leave-household) + account (sign-out). Household and account sections appear only when Supabase is enabled and the user has a `householdId`. Local form state re-syncs to `initialProfile` every time the modal opens, so edits made elsewhere (or mid-session profile changes) don't leave stale values in the inputs.

Props: `open`, `onClose`, `onSave`, `initialProfile`, `userEmail?`, `userId?`, `householdId?`, `onSignOut?`, `onAfterLeave?`

## Notes
- `NAV_ITEMS` and `VIEW_TITLES` are defined locally in each file (they're small and layout-specific).
- All chrome components are capped at `max-w-lg` to match the mobile-first layout constraint.

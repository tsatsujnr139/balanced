# balanced

A personal finance app built with [Expo](https://expo.dev), native UI via
[`@expo/ui`](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/) (SwiftUI on
iOS), native bottom tabs from Expo Router, and a [Convex](https://convex.dev)
backend.

## What's here

- **Native bottom tab bar** (`expo-router/unstable-native-tabs`) with SF Symbol
  icons: **Dashboard · Planning · Stats · You**.
- **Dashboard** (`src/app/index.ios.tsx`) built entirely from native SwiftUI
  primitives via `@expo/ui/swift-ui`:
  - Net‑worth header with assets / debts summary.
  - **Accounts** — horizontally scrollable cards of balances.
  - **Recent transactions** list.
  - **Budgets** usage with native progress bars.
  - A React Native fallback (`src/app/index.tsx`) renders the same dashboard on
    web/Android.
- **Convex backend** scaffolding in `convex/` (schema, `getSnapshot` query, and a
  `seedDemo` mutation). The UI currently reads local sample data and is wired to
  swap to Convex with a one‑line change.

## Project structure

```
src/
  app/
    _layout.tsx          # Theme + Convex providers + native tabs
    index.ios.tsx        # Dashboard (SwiftUI via @expo/ui)
    index.tsx            # Dashboard (RN fallback for web/Android)
    planning.tsx         # Planning tab
    stats.tsx            # Stats tab
    you.tsx              # Profile tab
  components/
    app-tabs.tsx         # Native tab bar (iOS/Android)
    app-tabs.web.tsx     # Headless tab bar (web)
  features/finance/
    types.ts             # Account / Transaction / Budget types
    mock-data.ts         # Local sample data (matches Convex shape)
    use-finance.ts       # Data hook (swap to Convex useQuery later)
    format.ts            # Currency / date helpers
    components/placeholder*.tsx
  providers/convex-provider.tsx
  global.css             # Tailwind + Uniwind theme tokens (light/dark)
  lib/cn.ts              # className merge helper
convex/
  schema.ts              # accounts / transactions / budgets tables
  finance.ts             # getSnapshot query
  seed.ts                # seedDemo mutation
```

## Run it

> `@expo/ui` and native tabs need a **development build** (not Expo Go).

```bash
pnpm install

# iOS (simulator or device) — builds a dev client
pnpm exec expo run:ios

# Android
pnpm exec expo run:android
```

The RN fallback runs in the browser too: `pnpm web` or `pnpm exec expo start --web`.

## Styling & theming

[Uniwind](https://docs.uniwind.dev/) provides Tailwind `className` styling on React
Native screens (web/Android fallback). Theme tokens live in `src/global.css` using
`@layer theme` with `@variant light` / `@variant dark` — components use semantic
utilities like `bg-background`, `text-foreground`, and `bg-card` that adapt
automatically (no `dark:` prefix needed).

The app follows the device color scheme via `Uniwind.setTheme('system')` in
`src/app/_layout.tsx`. For APIs that need raw color values (native tab bar,
`SymbolView` tints), use `useThemeColors()` from `src/hooks/use-theme.ts`.

The iOS dashboard (`index.ios.tsx`) stays on `@expo/ui` SwiftUI `modifiers` — Uniwind
does not apply inside the SwiftUI tree.

## Connect the Convex backend

The app runs on sample data out of the box. To switch to live data:

```bash
# 1. Start Convex (creates the deployment, generates types, writes the URL)
pnpm exec convex dev

# 2. Expose the URL to the Expo client (copy from Convex output)
echo "EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud" > .env.local

# 3. Seed demo data
pnpm exec convex run seed:seedDemo
```

Then point the UI at Convex by replacing the body of `useFinance()` in
`src/features/finance/use-finance.ts`:

```ts
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const snapshot = useQuery(api.finance.getSnapshot) ?? { accounts: [], transactions: [], budgets: [] };
```

The query returns the same `FinanceSnapshot` shape the screens already use, so no
component changes are required.

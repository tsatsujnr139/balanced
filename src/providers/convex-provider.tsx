import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

/**
 * Wraps the app in a Convex client when `EXPO_PUBLIC_CONVEX_URL` is set.
 *
 * While we're still building the UI against local sample data, the env var can
 * be absent and the app renders normally. Once `npx convex dev` is running and
 * the URL is in `.env.local`, queries via `useQuery` start flowing.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

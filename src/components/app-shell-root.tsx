'use client';

import { AppShellProviders } from '@/components/app-shell-providers';

export function AppShellRoot({ children }: { children: React.ReactNode }) {
  return <AppShellProviders>{children}</AppShellProviders>;
}
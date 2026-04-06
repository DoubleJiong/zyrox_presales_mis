'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { RootAuthCheck } from '@/components/root-auth-check';
import { MainLayout } from '@/components/main-layout';
import { PermissionProvider } from '@/components/auth/PermissionProvider';
import { usePathname } from 'next/navigation';

export function AppShellProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPaths = ['/login', '/register'];
  const isPublicPage = publicPaths.some((path) => pathname?.startsWith(path));

  return (
    <AuthProvider>
      <RootAuthCheck>
        {isPublicPage ? (
          children
        ) : (
          <PermissionProvider>
            <MainLayout>{children}</MainLayout>
          </PermissionProvider>
        )}
      </RootAuthCheck>
    </AuthProvider>
  );
}
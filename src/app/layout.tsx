import type { Metadata } from 'next';
import { AppShellRoot } from '@/components/app-shell-root';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '售前管理系统',
  description: '正元智慧售前管理系统 - 全流程管理售前工作',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <AppShellRoot>{children}</AppShellRoot>
      </body>
    </html>
  );
}

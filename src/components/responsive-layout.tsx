'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { MobileNav } from '@/components/mobile-nav';
import { Toaster } from '@/components/ui/toaster';
import { BrowserNotification } from '@/components/browser-notification';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/**
 * 移动端响应式布局
 * - 移动端：底部导航栏 + 无侧边栏
 * - 桌面端：侧边栏 + 顶部导航
 */
export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  // 登录页面不需要布局
  const isAuthPage = pathname === '/login' || pathname.startsWith('/(auth)');
  
  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  // 移动端布局
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-40 w-full border-b bg-background safe-area-top">
          <div className="flex h-12 items-center px-4">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">正元智慧</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* 搜索按钮 */}
              <button
                className="p-2 rounded-full hover:bg-muted"
                onClick={() => {
                  // 触发全局搜索
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                  });
                  document.dispatchEvent(event);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        
        {/* 主内容区 */}
        <main className={cn(
          'flex-1 overflow-auto p-4',
          'pb-20' // 为底部导航留空间
        )}>
          {children}
        </main>
        
        {/* 底部导航栏 */}
        <MobileNav />
        
        <Toaster />
        <BrowserNotification />
      </div>
    );
  }

  // 桌面端布局 - 使用原有布局
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 侧边栏 */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-background">
        <div className="flex h-14 items-center border-b px-4">
          <h1 className="text-lg font-semibold">正元智慧</h1>
        </div>
        <nav className="flex-1 overflow-auto p-4">
          {/* 导航项由 Sidebar 组件处理 */}
        </nav>
      </aside>
      
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      
      <Toaster />
      <BrowserNotification />
    </div>
  );
}

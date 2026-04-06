'use client';

import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { BrowserNotification } from '@/components/browser-notification';
import { MobileNav } from '@/components/mobile-nav';

/**
 * 主应用布局
 * - 使用 CSS 媒体查询实现响应式布局，避免 hydration 问题
 * - 桌面端：侧边栏 + 头部
 * - 移动端：底部导航栏 + 简化头部
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 桌面端侧边栏 - 移动端隐藏 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* 桌面端头部 - 移动端隐藏 */}
        <div className="hidden md:block">
          <Header />
        </div>
        
        {/* 移动端顶部栏 - 桌面端隐藏 */}
        <header className="sticky top-0 z-40 w-full border-b bg-background safe-area-top md:hidden">
          <div className="flex h-12 items-center px-4">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">正元智慧</h1>
            </div>
            <Header />
          </div>
        </header>
        
        {/* 主内容区 */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      
      {/* 移动端底部导航栏 - 桌面端隐藏 */}
      <div className="md:hidden">
        <MobileNav />
      </div>
      
      <Toaster />
      <BrowserNotification />
    </div>
  );
}

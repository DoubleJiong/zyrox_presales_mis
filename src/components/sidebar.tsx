'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useNavItems, NavItem } from './navigation-menu';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = useNavItems(); // 使用动态badge的导航项
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 使用固定占位符避免 hydration 不匹配
  const userInitial = mounted && user ? (user.realName?.charAt(0) || user.username?.charAt(0) || '用') : '用';
  const displayName = mounted && user ? (user.realName || user.username || '用户') : '用户';
  const displayRole = mounted && user 
    ? (user.roleName || (user.roleCode === 'admin' ? '系统管理员' :
       user.roleCode === 'sales_manager' ? '售前主管' :
       user.roleCode === 'sales_engineer' ? '售前工程师' :
       user.roleCode === 'solution_engineer' ? '解决方案工程师' : '用户'))
    : '用户';

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center space-x-2" onClick={onClose}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">售</span>
          </div>
          <span className="text-lg font-bold">售前管理系统</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item: NavItem) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {userInitial}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {displayRole}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ className, isMobile = false, onClose }: SidebarProps) {
  if (isMobile) {
    return (
      <SheetContent side="left" className="p-0 w-72">
        <SidebarContent onClose={onClose} />
      </SheetContent>
    );
  }

  return (
    <div className={cn('hidden md:flex w-64 flex-col border-r bg-background', className)}>
      <SidebarContent />
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <Sidebar isMobile onClose={() => setOpen(false)} />
    </Sheet>
  );
}

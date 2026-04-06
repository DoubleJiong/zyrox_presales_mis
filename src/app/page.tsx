'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * 首页 - 重定向到工作台
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workbench');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">正在加载工作台...</p>
      </div>
    </div>
  );
}

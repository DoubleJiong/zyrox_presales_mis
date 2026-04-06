'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 旧 dashboard 页面 - 重定向到工作台
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workbench');
  }, [router]);

  return null;
}

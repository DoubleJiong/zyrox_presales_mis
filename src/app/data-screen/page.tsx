'use client';

import { DataScreenRegionLayout } from '@/components/dashboard/DataScreenRegionLayout';

export default function DataScreenPage() {
  return (
    <div
      data-testid="data-screen-page"
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0A0F1A',
        backgroundImage: [
          'linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '40px 40px',
        overflow: 'hidden',
        fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif',
        color: '#e0e8f0',
      }}
    >
      <DataScreenRegionLayout />
    </div>
  );
}

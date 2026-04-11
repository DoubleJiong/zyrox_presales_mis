'use client';

import Link from 'next/link';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import type { DataScreenDrilldownAction, DataScreenDrilldownBadge, DataScreenDrilldownObjectType } from '@/lib/data-screen-drilldown';

interface DataScreenDrilldownDrawerProps {
  open: boolean;
  objectType: DataScreenDrilldownObjectType;
  title: string;
  description: string;
  badges?: DataScreenDrilldownBadge[];
  actions?: DataScreenDrilldownAction[];
  onClose: () => void;
  children: React.ReactNode;
  testId: string;
  titleTestId: string;
}

export function DataScreenDrilldownDrawer({
  open,
  objectType,
  title,
  description,
  badges = [],
  actions = [],
  onClose,
  children,
  testId,
  titleTestId,
}: DataScreenDrilldownDrawerProps) {
  return (
    <Drawer open={open} direction="right" onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent data-testid={testId} className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl">
        <DrawerHeader>
          <DrawerTitle data-testid={titleTestId} className="text-white">
            {title}
          </DrawerTitle>
          <DrawerDescription className="text-slate-400">
            {description}
          </DrawerDescription>
          {badges.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {badges.map((badge) => (
                <span
                  key={`${objectType}-${badge.label}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: '28px',
                    padding: '0 12px',
                    borderRadius: '999px',
                    border: `1px solid ${(badge.accentColor || '#00D4FF')}33`,
                    background: badge.backgroundColor || 'rgba(255,255,255,0.03)',
                    color: badge.accentColor || '#00D4FF',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </DrawerHeader>

        <div style={{ padding: '0 16px 20px', overflowY: 'auto', display: 'grid', gap: '16px' }}>
          {children}

          {actions.length ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {actions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '999px',
                    border: '1px solid rgba(0,212,255,0.24)',
                    background: 'rgba(0,212,255,0.12)',
                    color: '#E6F5FF',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
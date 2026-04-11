'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DataScreenRegionInsightDialogBadge {
  label: string;
  accentColor?: string;
  backgroundColor?: string;
}

interface DataScreenRegionInsightDialogProps {
  open: boolean;
  title: string;
  description: string;
  badges?: DataScreenRegionInsightDialogBadge[];
  onClose: () => void;
  children: ReactNode;
  testId: string;
  titleTestId: string;
}

export function DataScreenRegionInsightDialog({
  open,
  title,
  description,
  badges = [],
  onClose,
  children,
  testId,
  titleTestId,
}: DataScreenRegionInsightDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent data-testid={testId} className="border-slate-800 bg-slate-950 p-0 text-slate-100 sm:max-w-5xl">
        <div style={{ display: 'grid', maxHeight: 'min(86vh, 960px)', minHeight: 'min(72vh, 760px)', gridTemplateRows: 'auto 1fr' }}>
          <DialogHeader style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(148, 163, 184, 0.18)', textAlign: 'left' }}>
            <DialogTitle data-testid={titleTestId} className="text-white">
              {title}
            </DialogTitle>
            <DialogDescription className="text-slate-400">{description}</DialogDescription>
            {badges.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {badges.map((badge) => (
                  <span
                    key={`${title}-${badge.label}`}
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
          </DialogHeader>

          <div style={{ overflowY: 'auto', padding: '22px 28px 28px' }}>{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
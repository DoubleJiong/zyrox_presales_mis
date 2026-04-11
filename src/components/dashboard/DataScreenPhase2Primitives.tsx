'use client';

import type { CSSProperties, ReactNode } from 'react';

export interface DataScreenPhase2MetricCardProps {
  label: string;
  value: string;
  detail: string;
  accentColor: string;
  testId?: string;
  variant?: 'hero' | 'compact';
}

export interface DataScreenPhase2SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeAccentColor?: string;
}

export interface DataScreenPhase2StateMessageProps {
  tone?: 'loading' | 'empty' | 'error';
  title: string;
  description: string;
  compact?: boolean;
}

export interface DataScreenPhase2MicroLabelProps {
  label: string;
  accentColor?: string;
}

export function DataScreenPhase2MetricCard({
  label,
  value,
  detail,
  accentColor,
  testId,
  variant = 'compact',
}: DataScreenPhase2MetricCardProps) {
  const isHero = variant === 'hero';

  return (
    <div
      data-testid={testId}
      style={{
        minHeight: isHero ? '118px' : '96px',
        padding: isHero ? '16px 18px' : '14px 16px',
        borderRadius: '18px',
        border: `1px solid ${accentColor}33`,
        background: isHero
          ? `linear-gradient(135deg, ${accentColor}18, rgba(10, 25, 42, 0.94) 28%, rgba(8, 16, 30, 0.88))`
          : 'linear-gradient(180deg, rgba(10, 25, 42, 0.92), rgba(8, 16, 30, 0.86))',
        boxShadow: isHero
          ? `inset 0 0 0 1px ${accentColor}18, 0 12px 30px -18px ${accentColor}66`
          : `inset 0 0 0 1px ${accentColor}12`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: isHero ? '4px' : '3px',
          background: `linear-gradient(180deg, ${accentColor}, transparent 82%)`,
          opacity: isHero ? 0.9 : 0.72,
        }}
      />
      <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: isHero ? '12px' : '11px', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ marginTop: isHero ? '12px' : '10px', color: accentColor, fontSize: isHero ? '30px' : '22px', fontWeight: 700, lineHeight: 1.05 }}>{value}</div>
      <div style={{ marginTop: isHero ? '10px' : '8px', color: 'rgba(255,255,255,0.48)', fontSize: isHero ? '11px' : '10px', lineHeight: 1.55 }}>{detail}</div>
    </div>
  );
}

export function DataScreenPhase2SectionHeader({
  eyebrow,
  title,
  subtitle,
  badge,
  badgeAccentColor = '#00D4FF',
}: DataScreenPhase2SectionHeaderProps) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#00D4FF', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1.3 }}>{eyebrow}</div>
          <div style={{ marginTop: '7px', color: '#FFFFFF', fontSize: '19px', fontWeight: 700, lineHeight: 1.18 }}>{title}</div>
          <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.58)', fontSize: '11px', lineHeight: 1.7, maxWidth: '520px' }}>{subtitle}</div>
        </div>
        {badge ? <DataScreenPhase2Chip label={badge} accentColor={badgeAccentColor} /> : null}
      </div>
    </div>
  );
}

export function DataScreenPhase2PanelFrame({
  title,
  subtitle,
  children,
  testId,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <article
      data-testid={testId}
      style={{
        ...phase2ZoneCardStyle,
        minHeight: '204px',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
      }}
    >
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#E6F5FF', fontSize: '13px', fontWeight: 700 }}>{title}</div>
        <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.52)', fontSize: '10px', lineHeight: 1.5 }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '14px 16px', overflow: 'auto' }}>{children}</div>
    </article>
  );
}

export function DataScreenPhase2Chip({
  label,
  accentColor,
  emphasized = false,
  background,
}: {
  label: string;
  accentColor: string;
  emphasized?: boolean;
  background?: string;
}) {
  return <span style={buildChipStyle(accentColor, emphasized, background)}>{label}</span>;
}

export function DataScreenPhase2StateMessage({
  tone = 'empty',
  title,
  description,
  compact = false,
}: DataScreenPhase2StateMessageProps) {
  const toneColor = tone === 'error' ? '#FF8A65' : tone === 'loading' ? '#FBBF24' : '#8AA4B8';
  return (
    <div
      style={{
        display: 'grid',
        gap: '6px',
        alignContent: compact ? 'start' : 'center',
        minHeight: compact ? undefined : '100%',
        padding: compact ? 0 : '20px 0',
      }}
    >
      <div style={{ color: toneColor, fontSize: '14px', fontWeight: 700 }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '12px', lineHeight: 1.7 }}>{description}</div>
    </div>
  );
}

export function DataScreenPhase2MicroLabel({
  label,
  accentColor = '#8CE7FF',
}: DataScreenPhase2MicroLabelProps) {
  return (
    <div
      style={{
        color: accentColor,
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        lineHeight: 1.3,
      }}
    >
      {label}
    </div>
  );
}

export const phase2ZoneCardStyle = {
  minHeight: 0,
  padding: '16px',
  borderRadius: '20px',
  border: '1px solid rgba(0, 212, 255, 0.14)',
  background: 'linear-gradient(180deg, rgba(7, 18, 34, 0.94), rgba(8, 14, 24, 0.9))',
  boxShadow: '0 18px 40px -28px rgba(0, 0, 0, 0.52), inset 0 0 0 1px rgba(255,255,255,0.02)',
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
} satisfies CSSProperties;

export const phase2SubtleCardStyle = {
  padding: '12px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
} satisfies CSSProperties;

export const phase2PreviewCardStyle = {
  padding: '10px 12px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
} satisfies CSSProperties;

export const phase2DetailPanelStyle = {
  padding: '14px 16px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
} satisfies CSSProperties;

export const phase2DetailSectionTitleStyle = {
  color: '#00D4FF',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.6px',
} satisfies CSSProperties;

export const phase2DetailListRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
} satisfies CSSProperties;

export const phase2DetailEmptyTextStyle = {
  marginTop: '10px',
  color: 'rgba(255,255,255,0.46)',
  fontSize: '12px',
  lineHeight: 1.7,
} satisfies CSSProperties;

function buildChipStyle(accentColor: string, emphasized: boolean, background?: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '28px',
    padding: '0 10px',
    borderRadius: '999px',
    border: `1px solid ${accentColor}33`,
    background: background || (emphasized ? `${accentColor}18` : 'rgba(255,255,255,0.03)'),
    color: accentColor,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };
}
'use client';

import { useDashboardTheme } from '@/contexts/DashboardThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({ title, value, change, icon, onClick }: StatCardProps) {
  const { theme } = useDashboardTheme();

  const cardStyle = {
    backgroundColor: theme.background.card,
    border: `1px solid ${theme.border.card}`,
    borderRadius: theme.card.borderRadius,
    boxShadow: theme.card.shadow,
    padding: theme.card.padding,
    backdropFilter: theme.card.glassEffect ? 'blur(10px)' : 'none',
  };

  return (
    <div
      style={cardStyle}
      className="cursor-pointer hover:scale-105 transition-transform"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p
            style={{
              color: theme.text.muted,
              fontSize: theme.font.size.sm,
              fontWeight: theme.font.weight.normal,
            }}
          >
            {title}
          </p>
          <p
            style={{
              color: theme.text.primary,
              fontSize: theme.font.size.xl,
              fontWeight: theme.font.weight.bold,
              marginTop: '0.5rem',
            }}
          >
            {value}
          </p>
          {change !== undefined && (
            <div
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span
                style={{
                  color: change >= 0 ? theme.colors.success : theme.colors.danger,
                  fontSize: theme.font.size.xs,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              </span>
              <span
                style={{
                  color: theme.text.muted,
                  fontSize: theme.font.size.xs,
                }}
              >
                较上月
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: '3rem',
              height: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.card.borderRadius,
              backgroundColor: `${theme.colors.primary}20`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

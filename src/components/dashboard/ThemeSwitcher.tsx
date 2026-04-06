'use client';

import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { ThemeType } from '@/lib/dashboard-themes';

interface ThemeOption {
  id: ThemeType;
  name: string;
  color: string;
}

const themeOptions: ThemeOption[] = [
  { id: 'modern-dark', name: '现代简约', color: '#1e293b' },
  { id: 'light-business', name: '浅色商务', color: '#f8fafc' },
  { id: 'tech-glass', name: '科技感', color: '#0f0c29' },
  { id: 'minimal-executive', name: '极简高管', color: '#0a0a0a' },
];

export function ThemeSwitcher() {
  const { themeType, setTheme, theme } = useDashboardTheme();

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          backgroundColor: theme.background.card,
          border: `1px solid ${theme.border.card}`,
          borderRadius: theme.card.borderRadius,
          padding: '0.75rem',
          backdropFilter: theme.card.glassEffect ? 'blur(10px)' : 'none',
        }}
      >
        <p
          style={{
            color: theme.text.secondary,
            fontSize: theme.font.size.xs,
            fontWeight: theme.font.weight.medium,
            marginBottom: '0.5rem',
          }}
        >
          切换主题
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {themeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.375rem',
                border: `2px solid ${
                  themeType === option.id ? theme.colors.primary : 'transparent'
                }`,
                backgroundColor: option.color,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              title={option.name}
            >
              {themeType === option.id && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: themeType === 'light-business' ? '#0f172a' : '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

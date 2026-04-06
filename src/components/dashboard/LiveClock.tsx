'use client';

import { useState, useEffect } from 'react';
import { techTheme } from '@/lib/tech-theme';

export function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    // 只在客户端挂载后设置时间，避免 Hydration 错误
    setTime(new Date());

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
    });
  };

  // 如果时间还没加载（服务器渲染或初始挂载），显示占位符
  if (!time) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 20px',
          backgroundColor: `${techTheme.background.card}60`,
          border: `1px solid ${techTheme.border.color}`,
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              color: techTheme.colors.primary,
              fontSize: techTheme.font.size['2xl'],
              fontWeight: techTheme.font.weight.bold,
              fontFamily: 'monospace',
              textShadow: `0 0 20px ${techTheme.colors.primary}60`,
              letterSpacing: '2px',
              minWidth: '120px',
            }}
          >
            --:--:--
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 20px',
        backgroundColor: `${techTheme.background.card}60`,
        border: `1px solid ${techTheme.border.color}`,
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* 时间 */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            color: techTheme.colors.primary,
            fontSize: techTheme.font.size['2xl'],
            fontWeight: techTheme.font.weight.bold,
            fontFamily: 'monospace',
            textShadow: `0 0 20px ${techTheme.colors.primary}60`,
            letterSpacing: '2px',
          }}
        >
          {formatTime(time)}
        </div>
      </div>

      {/* 分隔线 */}
      <div
        style={{
          width: '1px',
          height: '32px',
          background: `linear-gradient(to bottom, transparent, ${techTheme.border.color}, transparent)`,
        }}
      />

      {/* 日期 */}
      <div>
        <div
          style={{
            color: techTheme.text.secondary,
            fontSize: techTheme.font.size.sm,
            fontWeight: techTheme.font.weight.normal,
          }}
        >
          {formatDate(time)}
        </div>
      </div>

      {/* 脉冲指示器 */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: techTheme.colors.success,
          boxShadow: `0 0 10px ${techTheme.colors.success}`,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

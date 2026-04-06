'use client';

import { useState, useEffect } from 'react';
import { techTheme } from '@/lib/tech-theme';

interface RealTimeDataStreamProps {
  data?: Array<{ message: string; time: string; type?: 'info' | 'success' | 'warning' | 'error' }>;
}

export function RealTimeDataStream({ data = [] }: RealTimeDataStreamProps) {
  const [messages, setMessages] = useState<Array<{ message: string; time: string; type?: 'info' | 'success' | 'warning' | 'error' }>>(data);
  const [visibleIndex, setVisibleIndex] = useState(0);

  useEffect(() => {
    // 只在客户端初始化默认消息，避免 Hydration 错误
    if (messages.length === 0) {
      const defaultMessages: Array<{ message: string; time: string; type?: 'info' | 'success' | 'warning' | 'error' }> = [
        { message: '实时数据更新中...', time: new Date().toLocaleTimeString(), type: 'info' },
        { message: '全国项目数据同步完成', time: new Date().toLocaleTimeString(), type: 'success' },
        { message: '浙江省新增2个项目', time: new Date().toLocaleTimeString(), type: 'info' },
        { message: '客户数据同步中...', time: new Date().toLocaleTimeString(), type: 'info' },
      ];
      setMessages(defaultMessages);
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setVisibleIndex((prev) => (prev + 1) % messages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const displayMessages = messages.length > 0 ? messages : [];
  const currentMessage = displayMessages[visibleIndex] || { message: '加载中...', time: '', type: 'info' };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'success':
        return techTheme.colors.success;
      case 'warning':
        return techTheme.colors.warning;
      case 'error':
        return techTheme.colors.danger;
      default:
        return techTheme.colors.primary;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        backgroundColor: `${techTheme.background.card}60`,
        border: `1px solid ${techTheme.border.color}`,
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
      }}
    >
      {/* 指示器 */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: i === visibleIndex
                ? getTypeColor(currentMessage.type)
                : `${techTheme.border.color}`,
              boxShadow: i === visibleIndex ? `0 0 10px ${getTypeColor(currentMessage.type)}` : 'none',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* 消息内容 */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative' as const,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: `opacity ${techTheme.animation.duration.fast}`,
            opacity: 1,
          }}
        >
          <span
            style={{
              color: getTypeColor(currentMessage.type),
              fontSize: techTheme.font.size.xs,
              fontWeight: techTheme.font.weight.bold,
              whiteSpace: 'nowrap',
            }}
          >
            [{currentMessage.time}]
          </span>
          <span
            style={{
              color: techTheme.text.secondary,
              fontSize: techTheme.font.size.sm,
              whiteSpace: 'nowrap',
            }}
          >
            {currentMessage.message}
          </span>
        </div>

        {/* 滚动效果 */}
        <div
          style={{
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${techTheme.background.card}, transparent)`,
            animation: 'shimmer 3s infinite',
            pointerEvents: 'none' as const,
          }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

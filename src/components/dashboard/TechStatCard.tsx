'use client';

import { useState } from 'react';
import { techTheme } from '@/lib/tech-theme';
import { AnimatedNumber } from './AnimatedNumber';

interface TechStatCardProps {
  title: string;
  value: number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

export function TechStatCard({
  title,
  value,
  change,
  icon,
  trend,
  onClick,
}: TechStatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  // 获取趋势颜色
  const getTrendColor = () => {
    if (trend === 'up') return techTheme.colors.success;
    if (trend === 'down') return techTheme.colors.danger;
    return techTheme.colors.warning;
  };

  // 获取趋势图标
  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const cardStyle = {
    backgroundColor: techTheme.background.card,
    border: isHovered
      ? `1px solid ${techTheme.colors.primary}`
      : techTheme.card.border,
    borderRadius: techTheme.card.borderRadius,
    padding: techTheme.card.padding,
    boxShadow: isHovered ? techTheme.card.boxShadowHover : techTheme.card.boxShadow,
    backdropFilter: 'blur(10px)',
    cursor: 'pointer',
    transition: `all ${techTheme.animation.duration.normal} ${techTheme.animation.easing}`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  // 脉冲动画样式
  const pulseStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    borderRadius: techTheme.card.borderRadius,
    border: `2px solid ${techTheme.colors.primary}`,
    opacity: pulseActive ? 0 : 1,
    animation: pulseActive
      ? `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`
      : 'none',
    pointerEvents: 'none' as const,
  };

  const iconContainerStyle = {
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    backgroundColor: isHovered
      ? `${techTheme.colors.primary}30`
      : `${techTheme.colors.primary}20`,
    border: isHovered
      ? `1px solid ${techTheme.colors.primary}50`
      : 'none',
    transition: `all ${techTheme.animation.duration.normal} ${techTheme.animation.easing}`,
  };

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
            opacity: 0.5;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .shimmer-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          animation: shimmer 3s infinite;
          pointer-events: none;
        }
      `}</style>

      <div
        style={cardStyle}
        onClick={onClick}
        onMouseEnter={() => {
          setIsHovered(true);
          setPulseActive(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setPulseActive(false);
        }}
      >
        {/* 脉冲效果 */}
        <div style={pulseStyle} />
        {isHovered && <div className="shimmer-effect" />}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 左侧：标题和数值 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: techTheme.text.muted,
                fontSize: techTheme.font.size.sm,
                fontWeight: techTheme.font.weight.normal,
                marginBottom: '8px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </p>
            <AnimatedNumber value={value} duration={1500} />

            {change !== undefined && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    color: getTrendColor(),
                    fontSize: techTheme.font.size.sm,
                    fontWeight: techTheme.font.weight.bold,
                    textShadow: `0 0 10px ${getTrendColor()}50`,
                  }}
                >
                  {getTrendIcon()} {Math.abs(change)}%
                </span>
                <span
                  style={{
                    color: techTheme.text.muted,
                    fontSize: techTheme.font.size.xs,
                  }}
                >
                  较上月
                </span>
              </div>
            )}
          </div>

          {/* 右侧：图标 */}
          {icon && (
            <div
              style={{
                marginLeft: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={iconContainerStyle}>
                <div style={{ color: techTheme.colors.primary }}>
                  {icon}
                </div>
              </div>
              {/* 小指示灯 */}
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: techTheme.colors.success,
                  boxShadow: `0 0 10px ${techTheme.colors.success}`,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </div>
          )}
        </div>

        {/* 底部发光条 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: isHovered ? '100%' : '0%',
            height: '2px',
            background: `linear-gradient(90deg, ${techTheme.colors.primary}, ${techTheme.colors.secondary})`,
            transition: `width ${techTheme.animation.duration.normal} ${techTheme.animation.easing}`,
            boxShadow: `0 0 10px ${techTheme.colors.primary}`,
          }}
        />
      </div>
    </>
  );
}

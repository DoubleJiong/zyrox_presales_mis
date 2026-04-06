'use client';

import { useState, useEffect } from 'react';
import { techTheme } from '@/lib/tech-theme';
import { AnimatedNumber } from './AnimatedNumber';

interface TechStatusDistributionProps {
  data: Array<{ label: string; value: number; color?: string }>;
  total?: number;
}

export function TechStatusDistribution({
  data,
  total,
}: TechStatusDistributionProps) {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, animatedValue: 0 })));

  useEffect(() => {
    const animationDuration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setAnimatedData(
        data.map(item => ({
          ...item,
          animatedValue: item.value * easeOutQuart,
        }))
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [data]);

  const totalValue = total || data.reduce((sum, item) => sum + item.value, 0);

  const cardStyle = {
    backgroundColor: techTheme.background.card,
    border: techTheme.card.border,
    borderRadius: techTheme.card.borderRadius,
    padding: techTheme.card.padding,
    boxShadow: techTheme.card.boxShadow,
    backdropFilter: 'blur(10px)',
  };

  return (
    <div style={cardStyle}>
      <h3
        style={{
          color: techTheme.text.primary,
          fontSize: techTheme.font.size.lg,
          fontWeight: techTheme.font.weight.bold,
          marginBottom: '20px',
        }}
      >
        项目状态分布
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {animatedData.map((item, index) => {
          const color = item.color || techTheme.chart.colors[index % techTheme.chart.colors.length];
          const percentage = ((item.animatedValue / totalValue) * 100).toFixed(1);

          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* 标签 */}
              <div
                style={{
                  width: '80px',
                  color: techTheme.text.secondary,
                  fontSize: techTheme.font.size.sm,
                  fontWeight: techTheme.font.weight.medium,
                  flexShrink: 0,
                }}
              >
                {item.label}
              </div>

              {/* 进度条 */}
              <div
                style={{
                  flex: 1,
                  height: '8px',
                  backgroundColor: `${techTheme.border.color}40`,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative' as const,
                }}
              >
                {/* 背景网格 */}
                <div
                  style={{
                    position: 'absolute' as const,
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: `linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.05) 50%)`,
                    backgroundSize: '4px 100%',
                  }}
                />
                {/* 进度条 */}
                <div
                  style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                    borderRadius: '4px',
                    boxShadow: `0 0 10px ${color}60`,
                    position: 'relative' as const,
                    transition: `width ${techTheme.animation.duration.normal} ${techTheme.animation.easing}`,
                  }}
                >
                  {/* 发光效果 */}
                  <div
                    style={{
                      position: 'absolute' as const,
                      top: 0,
                      right: 0,
                      width: '20px',
                      height: '100%',
                      background: `linear-gradient(90deg, transparent, ${color})`,
                      filter: 'blur(4px)',
                    }}
                  />
                </div>
              </div>

              {/* 数值 */}
              <div
                style={{
                  width: '50px',
                  textAlign: 'right',
                  color: color,
                  fontSize: techTheme.font.size.sm,
                  fontWeight: techTheme.font.weight.bold,
                  flexShrink: 0,
                  textShadow: `0 0 10px ${color}60`,
                }}
              >
                <AnimatedNumber value={item.animatedValue} decimals={0} duration={1500} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 总计 */}
      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: `1px solid ${techTheme.border.color}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: techTheme.text.muted,
            fontSize: techTheme.font.size.sm,
          }}
        >
          项目总数
        </span>
        <span
          style={{
            color: techTheme.text.primary,
            fontSize: techTheme.font.size.lg,
            fontWeight: techTheme.font.weight.bold,
          }}
        >
          <AnimatedNumber value={totalValue} decimals={0} duration={1500} />
        </span>
      </div>
    </div>
  );
}

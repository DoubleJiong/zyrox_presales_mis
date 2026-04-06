'use client';

import { useEffect, useState, useRef } from 'react';
import { techTheme } from '@/lib/tech-theme';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 2000,
  suffix = '',
  prefix = '',
  decimals = 0,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(0);

  useEffect(() => {
    if (previousValue.current === value) return;

    setIsAnimating(true);
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();
    const diff = endValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 easeOutQuart 缓动函数
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + diff * easeOutQuart;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value, duration]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontWeight: techTheme.font.weight.bold,
        fontSize: techTheme.font.size['2xl'],
        color: isAnimating ? techTheme.colors.primary : techTheme.text.primary,
        textShadow: isAnimating ? techTheme.glow.primary : 'none',
        transition: `color ${techTheme.animation.duration.fast}, text-shadow ${techTheme.animation.duration.fast}`,
      }}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

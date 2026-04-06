'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 科幻面板组件
 * 基础容器组件，带有发光边框和顶部装饰线
 */

export interface SciFiPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否显示扫描线效果 */
  scanlines?: boolean;
  /** 是否显示角落装饰 */
  corners?: boolean;
  /** 是否启用玻璃态效果 */
  glass?: boolean;
  /** 是否启用呼吸发光动画 */
  breathe?: boolean;
  /** 面板主题色 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: {
    border: 'var(--sci-border)',
    glow: 'var(--sci-primary-glow)',
  },
  primary: {
    border: 'rgba(0, 212, 255, 0.5)',
    glow: 'rgba(0, 212, 255, 0.3)',
  },
  success: {
    border: 'rgba(0, 255, 136, 0.5)',
    glow: 'rgba(0, 255, 136, 0.3)',
  },
  warning: {
    border: 'rgba(255, 170, 0, 0.5)',
    glow: 'rgba(255, 170, 0, 0.3)',
  },
  danger: {
    border: 'rgba(255, 51, 102, 0.5)',
    glow: 'rgba(255, 51, 102, 0.3)',
  },
};

export const SciFiPanel = forwardRef<HTMLDivElement, SciFiPanelProps>(
  (
    {
      className,
      scanlines = false,
      corners = false,
      glass = false,
      breathe = false,
      variant = 'default',
      children,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded',
          glass ? 'sci-panel-glass' : 'sci-panel',
          corners && 'sci-border-corners-all',
          breathe && 'sci-breathe',
          className
        )}
        style={{
          borderColor: variantStyle.border,
        }}
        {...props}
      >
        {/* 顶部装饰线 */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${variantStyle.border}, transparent)`,
          }}
        />

        {/* 扫描线效果 */}
        {scanlines && <div className="sci-scanlines" />}

        {/* 内容 */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

SciFiPanel.displayName = 'SciFiPanel';

/**
 * 科幻卡片组件
 * 用于展示数据的小型容器
 */
export interface SciFiCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否启用悬停发光效果 */
  hoverGlow?: boolean;
  /** 卡片主题色 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** 是否显示强调背景 */
  accent?: boolean;
}

export const SciFiCard = forwardRef<HTMLDivElement, SciFiCardProps>(
  (
    {
      className,
      hoverGlow = true,
      variant = 'default',
      accent = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];

    return (
      <div
        ref={ref}
        className={cn(
          accent ? 'sci-card-accent' : 'sci-card',
          hoverGlow && 'sci-hover-glow',
          className
        )}
        style={{
          borderColor: variantStyle.border,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SciFiCard.displayName = 'SciFiCard';

/**
 * 科幻标题组件
 */
export interface SciFiTitleProps extends HTMLAttributes<HTMLDivElement> {
  /** 标题文本 */
  children: React.ReactNode;
  /** 是否显示发光效果 */
  glow?: boolean;
  /** 是否显示指示器 */
  indicator?: boolean;
  /** 图标 */
  icon?: React.ReactNode;
}

export const SciFiTitle = forwardRef<HTMLDivElement, SciFiTitleProps>(
  (
    { className, children, glow = false, indicator = false, icon, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(glow ? 'sci-title-glow' : 'sci-title', className)}
        {...props}
      >
        {indicator && <span className="sci-title-indicator" />}
        {icon}
        {children}
      </div>
    );
  }
);

SciFiTitle.displayName = 'SciFiTitle';

/**
 * 科幻状态指示器
 */
export interface SciFiStatusProps extends HTMLAttributes<HTMLSpanElement> {
  /** 状态类型 */
  status: 'online' | 'warning' | 'offline' | 'idle';
  /** 状态文本 */
  text?: string;
}

export const SciFiStatus = forwardRef<HTMLSpanElement, SciFiStatusProps>(
  ({ className, status, text, ...props }, ref) => {
    return (
      <span ref={ref} className={cn('sci-status', className)} {...props}>
        <span className={cn('sci-status-dot', status)} />
        {text && <span className="text-[var(--sci-text-secondary)]">{text}</span>}
      </span>
    );
  }
);

SciFiStatus.displayName = 'SciFiStatus';

/**
 * 科幻数字显示
 */
export interface SciFiNumberProps extends HTMLAttributes<HTMLSpanElement> {
  /** 数值 */
  value: number | string;
  /** 单位 */
  unit?: string;
  /** 大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示发光效果 */
  glow?: boolean;
  /** 颜色主题 */
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const SciFiNumber = forwardRef<HTMLSpanElement, SciFiNumberProps>(
  (
    {
      className,
      value,
      unit,
      size = 'md',
      glow = true,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const sizeClass = {
      sm: 'sci-number-sm',
      md: '',
      lg: 'sci-number-lg',
    }[size];

    const variantColors = {
      default: 'var(--sci-primary)',
      success: 'var(--sci-success)',
      warning: 'var(--sci-warning)',
      danger: 'var(--sci-danger)',
    };

    return (
      <span
        ref={ref}
        className={cn('sci-number', sizeClass, className)}
        style={{
          color: variantColors[variant],
          textShadow: glow ? `0 0 20px ${variantColors[variant]}50` : undefined,
        }}
        {...props}
      >
        {value}
        {unit && (
          <span className="ml-1 text-base font-normal text-[var(--sci-text-secondary)]">
            {unit}
          </span>
        )}
      </span>
    );
  }
);

SciFiNumber.displayName = 'SciFiNumber';

/**
 * 科幻进度条
 */
export interface SciFiProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 进度值 (0-100) */
  value: number;
  /** 是否显示动画 */
  animated?: boolean;
  /** 颜色主题 */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** 是否显示标签 */
  showLabel?: boolean;
}

export const SciFiProgress = forwardRef<HTMLDivElement, SciFiProgressProps>(
  (
    {
      className,
      value,
      animated = true,
      variant = 'default',
      showLabel = false,
      ...props
    },
    ref
  ) => {
    const variantColors = {
      default: 'var(--sci-primary)',
      success: 'var(--sci-success)',
      warning: 'var(--sci-warning)',
      danger: 'var(--sci-danger)',
    };

    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-1 text-xs text-[var(--sci-text-secondary)]">
            <span>进度</span>
            <span>{clampedValue}%</span>
          </div>
        )}
        <div className="sci-progress">
          <div
            className="sci-progress-bar"
            style={{
              width: `${clampedValue}%`,
              background: `linear-gradient(90deg, ${variantColors[variant]}80, ${variantColors[variant]})`,
            }}
          />
        </div>
      </div>
    );
  }
);

SciFiProgress.displayName = 'SciFiProgress';

/**
 * 科幻分隔线
 */
export const SciFiDivider = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('sci-divider', className)} {...props} />;
});

SciFiDivider.displayName = 'SciFiDivider';

/**
 * 科幻标签
 */
export interface SciFiTagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const SciFiTag = forwardRef<HTMLSpanElement, SciFiTagProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantStyles = {
      default: {
        background: 'rgba(0, 212, 255, 0.1)',
        borderColor: 'var(--sci-border)',
        color: 'var(--sci-primary)',
      },
      success: {
        background: 'rgba(0, 255, 136, 0.1)',
        borderColor: 'rgba(0, 255, 136, 0.3)',
        color: 'var(--sci-success)',
      },
      warning: {
        background: 'rgba(255, 170, 0, 0.1)',
        borderColor: 'rgba(255, 170, 0, 0.3)',
        color: 'var(--sci-warning)',
      },
      danger: {
        background: 'rgba(255, 51, 102, 0.1)',
        borderColor: 'rgba(255, 51, 102, 0.3)',
        color: 'var(--sci-danger)',
      },
    };

    const style = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={cn('sci-tag', className)}
        style={{
          background: style.background,
          borderColor: style.borderColor,
          color: style.color,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);

SciFiTag.displayName = 'SciFiTag';

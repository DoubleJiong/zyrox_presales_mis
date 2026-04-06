'use client';

import { forwardRef, HTMLAttributes, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { SciFiPanel, SciFiTitle, SciFiStatus } from './sci-fi-panel';
import { DataFlowParticles } from './data-flow-animation';

/**
 * 科幻大屏布局组件
 * 用于数据可视化大屏的整体布局
 */

export interface SciFiLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** 左侧面板内容 */
  leftPanel?: React.ReactNode;
  /** 右侧面板内容 */
  rightPanel?: React.ReactNode;
  /** 中央内容 */
  center?: React.ReactNode;
  /** 顶部标题栏内容 */
  header?: React.ReactNode;
  /** 底部状态栏内容 */
  footer?: React.ReactNode;
  /** 是否显示扫描线效果 */
  showScanner?: boolean;
  /** 是否显示网格背景 */
  showGrid?: boolean;
  /** 是否显示数据流动画背景 */
  showDataFlow?: boolean;
}

export const SciFiLayout = forwardRef<HTMLDivElement, SciFiLayoutProps>(
  (
    {
      className,
      leftPanel,
      rightPanel,
      center,
      header,
      footer,
      showScanner = true,
      showGrid = true,
      showDataFlow = false,
      children,
      ...props
    },
    ref
  ) => {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
      // 初始化时间，避免 hydration 错误
      setCurrentTime(new Date());
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          'min-h-screen w-full sci-bg-console text-[var(--sci-text-primary)]',
          showGrid && 'sci-bg-grid',
          className
        )}
        {...props}
      >
        {/* 数据流动画背景 */}
        {showDataFlow && (
          <div className="fixed inset-0 pointer-events-none opacity-30">
            <DataFlowParticles
              count={50}
              color="#00d4ff"
              showConnections
              connectionDistance={150}
            />
          </div>
        )}

        {/* 扫描线效果 */}
        {showScanner && <div className="sci-scanner" />}

        {/* 顶部标题栏 */}
        {header !== undefined ? (
          header
        ) : (
          <header className="h-16 border-b border-[var(--sci-border)] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--sci-primary)] sci-pulse" />
                <h1 className="text-lg font-bold tracking-wider text-[var(--sci-primary)] sci-text-glow">
                  正元智慧售前管理系统
                </h1>
              </div>
              <div className="h-4 w-px bg-[var(--sci-border)]" />
              <span className="text-sm text-[var(--sci-text-secondary)]">
                数据控制中心
              </span>
            </div>

            <div className="flex items-center gap-6">
              <SciFiStatus status="online" text="系统运行正常" />
              <div className="text-right">
                <div className="text-xs text-[var(--sci-text-dim)]">当前时间</div>
                <div className="text-sm font-mono text-[var(--sci-primary)]">
                  {currentTime?.toLocaleTimeString('zh-CN', {
                    hour12: false,
                  }) || '--:--:--'}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* 主体内容区 */}
        <main className="flex h-[calc(100vh-4rem-3rem)] gap-4 p-4">
          {/* 左侧面板 */}
          {leftPanel && (
            <aside className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
              {leftPanel}
            </aside>
          )}

          {/* 中央区域 */}
          <section className="flex-1 flex flex-col gap-4 overflow-hidden">
            {center || children}
          </section>

          {/* 右侧面板 */}
          {rightPanel && (
            <aside className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
              {rightPanel}
            </aside>
          )}
        </main>

        {/* 底部状态栏 */}
        {footer !== undefined ? (
          footer
        ) : (
          <footer className="h-12 border-t border-[var(--sci-border)] flex items-center justify-between px-6 text-xs text-[var(--sci-text-dim)]">
            <div className="flex items-center gap-4">
              <span>V1.2.0</span>
              <span>|</span>
              <span>数据更新时间: {currentTime?.toLocaleString('zh-CN') || '加载中...'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>CPU: 23%</span>
              <span>内存: 45%</span>
              <span>网络: 正常</span>
            </div>
          </footer>
        )}
      </div>
    );
  }
);

SciFiLayout.displayName = 'SciFiLayout';

/**
 * 大屏面板容器
 */
export interface SciFiLayoutPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** 面板标题 */
  title?: string;
  /** 标题图标 */
  icon?: React.ReactNode;
  /** 面板大小 */
  size?: 'sm' | 'md' | 'lg' | 'flex';
  /** 是否显示发光标题 */
  glowTitle?: boolean;
}

export const SciFiLayoutPanel = forwardRef<HTMLDivElement, SciFiLayoutPanelProps>(
  (
    {
      className,
      title,
      icon,
      size = 'flex',
      glowTitle = false,
      children,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-40',
      md: 'h-64',
      lg: 'h-96',
      flex: 'flex-1',
    };

    return (
      <SciFiPanel
        ref={ref}
        corners
        className={cn('flex flex-col', sizeStyles[size], className)}
        {...props}
      >
        {title && (
          <SciFiTitle glow={glowTitle} indicator icon={icon}>
            {title}
          </SciFiTitle>
        )}
        <div className="flex-1 p-4 overflow-auto">{children}</div>
      </SciFiPanel>
    );
  }
);

SciFiLayoutPanel.displayName = 'SciFiLayoutPanel';

/**
 * 数据网格组件
 * 用于展示多列数据
 */
export interface SciFiDataGridProps extends HTMLAttributes<HTMLDivElement> {
  /** 列数 */
  columns?: 2 | 3 | 4;
  /** 间距 */
  gap?: 'sm' | 'md' | 'lg';
}

export const SciFiDataGrid = forwardRef<HTMLDivElement, SciFiDataGridProps>(
  ({ className, columns = 2, gap = 'md', children, ...props }, ref) => {
    const gapStyles = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    };

    const columnStyles = {
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          columnStyles[columns],
          gapStyles[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SciFiDataGrid.displayName = 'SciFiDataGrid';

/**
 * 动态数字组件
 * 数字从0滚动到目标值
 */
export interface AnimatedNumberProps extends HTMLAttributes<HTMLSpanElement> {
  /** 目标数值 */
  value: number;
  /** 动画持续时间(毫秒) */
  duration?: number;
  /** 小数位数 */
  decimals?: number;
  /** 前缀 */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
  /** 格式化函数 */
  formatter?: (value: number) => string;
}

export const AnimatedNumber = forwardRef<HTMLSpanElement, AnimatedNumberProps>(
  (
    {
      className,
      value,
      duration = 1000,
      decimals = 0,
      prefix = '',
      suffix = '',
      formatter,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      const startTime = Date.now();
      const startValue = displayValue;
      const endValue = value;

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOut;

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, [value, duration]);

    const formattedValue = formatter 
      ? formatter(displayValue) 
      : displayValue.toFixed(decimals);

    return (
      <span ref={ref} className={cn('font-mono', className)} {...props}>
        {prefix}
        {formattedValue}
        {suffix}
      </span>
    );
  }
);

AnimatedNumber.displayName = 'AnimatedNumber';

/**
 * 脉冲点组件
 */
export interface PulseDotProps extends HTMLAttributes<HTMLSpanElement> {
  /** 颜色 */
  color?: string;
  /** 大小 */
  size?: 'sm' | 'md' | 'lg';
}

export const PulseDot = forwardRef<HTMLSpanElement, PulseDotProps>(
  ({ className, color, size = 'md', ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-block rounded-full sci-pulse',
          sizeStyles[size],
          className
        )}
        style={{
          backgroundColor: color || 'var(--sci-primary)',
          boxShadow: `0 0 10px ${color || 'var(--sci-primary)'}50`,
        }}
        {...props}
      />
    );
  }
);

PulseDot.displayName = 'PulseDot';

/**
 * 数据行组件
 */
export interface SciFiDataRowProps extends HTMLAttributes<HTMLDivElement> {
  /** 标签 */
  label: string;
  /** 值 */
  value: React.ReactNode;
  /** 是否显示发光效果 */
  glow?: boolean;
}

export const SciFiDataRow = forwardRef<HTMLDivElement, SciFiDataRowProps>(
  ({ className, label, value, glow = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between py-2 border-b border-[var(--sci-border-dim)] last:border-0',
          className
        )}
        {...props}
      >
        <span className="text-sm text-[var(--sci-text-secondary)]">{label}</span>
        <span
          className={cn(
            'font-mono',
            glow
              ? 'text-[var(--sci-primary)] sci-text-glow'
              : 'text-[var(--sci-text-primary)]'
          )}
        >
          {value}
        </span>
      </div>
    );
  }
);

SciFiDataRow.displayName = 'SciFiDataRow';

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 虚拟滚动组件
 * 用于大列表的高效渲染，只渲染可见区域的元素
 */

export interface VirtualScrollProps<T> {
  // 数据列表
  items: T[];
  // 每个项目的高度（像素）
  itemHeight: number;
  // 容器高度（像素）
  height: number;
  // 渲染项目的函数
  renderItem: (item: T, index: number) => React.ReactNode;
  // 额外渲染的项目数（用于滚动缓冲）
  overscan?: number;
  // 容器类名
  className?: string;
  // 空状态渲染
  emptyRenderer?: () => React.ReactNode;
  // 加载状态
  loading?: boolean;
  // 加载状态渲染
  loadingRenderer?: () => React.ReactNode;
  // 滚动事件回调
  onScroll?: (scrollTop: number) => void;
  // 项目键值获取函数
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 3,
  className,
  emptyRenderer,
  loading,
  loadingRenderer,
  onScroll,
  getItemKey,
}: VirtualScrollProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  // 计算可见范围
  const { startIndex, endIndex, visibleItems, totalHeight } = React.useMemo(() => {
    const total = items.length;
    const totalHeight = total * itemHeight;

    // 计算起始索引
    const start = Math.floor(scrollTop / itemHeight);
    // 计算结束索引
    const visibleCount = Math.ceil(height / itemHeight);
    const end = Math.min(start + visibleCount + overscan, total);

    // 应用 overscan
    const adjustedStart = Math.max(0, start - overscan);

    return {
      startIndex: adjustedStart,
      endIndex: end,
      visibleItems: items.slice(adjustedStart, end),
      totalHeight,
    };
  }, [items, itemHeight, height, scrollTop, overscan]);

  // 处理滚动事件
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // 渲染项目
  const renderItems = () => {
    return visibleItems.map((item, index) => {
      const actualIndex = startIndex + index;
      const key = getItemKey ? getItemKey(item, actualIndex) : actualIndex;
      const style = {
        position: 'absolute' as const,
        top: actualIndex * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      };

      return (
        <div key={key} style={style}>
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  };

  // 加载状态
  if (loading) {
    return (
      <div className={cn('relative overflow-auto', className)} style={{ height }}>
        {loadingRenderer ? loadingRenderer() : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    );
  }

  // 空状态
  if (items.length === 0) {
    return (
      <div className={cn('relative overflow-auto', className)} style={{ height }}>
        {emptyRenderer ? emptyRenderer() : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            暂无数据
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      {/* 总高度容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {renderItems()}
      </div>
    </div>
  );
}

/**
 * 虚拟表格组件
 * 用于大数据表格的高效渲染
 */

export interface VirtualTableColumn<T> {
  key: string;
  title: string;
  width?: number | string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface VirtualTableProps<T> {
  items: T[];
  columns: VirtualTableColumn<T>[];
  height: number;
  rowHeight?: number;
  overscan?: number;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  onRowClick?: (item: T, index: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyRenderer?: () => React.ReactNode;
}

export function VirtualTable<T>({
  items,
  columns,
  height,
  rowHeight = 48,
  overscan = 5,
  className,
  headerClassName,
  rowClassName,
  onRowClick,
  getItemKey,
  loading,
  emptyRenderer,
}: VirtualTableProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  // 计算可见范围
  const { startIndex, endIndex, visibleItems, totalHeight } = React.useMemo(() => {
    const total = items.length;
    const totalHeight = total * rowHeight;
    const start = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(height / rowHeight);
    const end = Math.min(start + visibleCount + overscan, total);
    const adjustedStart = Math.max(0, start - overscan);

    return {
      startIndex: adjustedStart,
      endIndex: end,
      visibleItems: items.slice(adjustedStart, end),
      totalHeight,
    };
  }, [items, rowHeight, height, scrollTop, overscan]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 加载状态
  if (loading) {
    return (
      <div className={cn('border rounded-lg overflow-hidden', className)}>
        <div className={cn('flex bg-muted/50 border-b', headerClassName)}>
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn('px-4 py-3 font-medium text-sm', col.className)}
              style={{ width: col.width }}
            >
              {col.title}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center" style={{ height: height - 48 }}>
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // 空状态
  if (items.length === 0) {
    return (
      <div className={cn('border rounded-lg overflow-hidden', className)}>
        <div className={cn('flex bg-muted/50 border-b', headerClassName)}>
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn('px-4 py-3 font-medium text-sm', col.className)}
              style={{ width: col.width }}
            >
              {col.title}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center" style={{ height: height - 48 }}>
          {emptyRenderer ? emptyRenderer() : (
            <span className="text-muted-foreground">暂无数据</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* 表头 */}
      <div className={cn('flex bg-muted/50 border-b', headerClassName)}>
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn('px-4 py-3 font-medium text-sm shrink-0', col.className)}
            style={{ width: col.width }}
          >
            {col.title}
          </div>
        ))}
      </div>

      {/* 表体 */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: height - 48 }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const key = getItemKey ? getItemKey(item, actualIndex) : actualIndex;
            const rowClass =
              typeof rowClassName === 'function'
                ? rowClassName(item, actualIndex)
                : rowClassName;

            return (
              <div
                key={key}
                className={cn(
                  'flex border-b hover:bg-muted/50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  rowClass
                )}
                style={{
                  position: 'absolute',
                  top: actualIndex * rowHeight,
                  left: 0,
                  right: 0,
                  height: rowHeight,
                }}
                onClick={() => onRowClick?.(item, actualIndex)}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={cn('px-4 py-2 text-sm shrink-0 flex items-center', col.className)}
                    style={{ width: col.width }}
                  >
                    {col.render
                      ? col.render(item, actualIndex)
                      : String((item as any)[col.key] ?? '')}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 虚拟列表 Hook
 * 返回虚拟滚动所需的状态和回调
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const { startIndex, endIndex, offsetY } = React.useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, itemCount);
    const adjustedStart = Math.max(0, start - overscan);

    return {
      startIndex: adjustedStart,
      endIndex: end,
      offsetY: adjustedStart * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const totalHeight = itemCount * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    handleScroll,
    scrollTop,
  };
}

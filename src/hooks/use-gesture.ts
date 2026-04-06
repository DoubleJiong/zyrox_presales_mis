'use client';

import { useRef, useCallback, useState } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // 最小滑动距离，默认 50px
}

interface SwipeState {
  startX: number;
  startY: number;
  isSwiping: boolean;
}

/**
 * 触摸滑动 Hook
 * 用于实现移动端滑动切换等功能
 */
export function useSwipe(config: SwipeConfig) {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = config;
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    isSwiping: false,
  });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      isSwiping: true,
    };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!stateRef.current.isSwiping) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;

    // 确保是水平滑动（水平距离大于垂直距离）
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // 向右滑动
          onSwipeRight?.();
        } else {
          // 向左滑动
          onSwipeLeft?.();
        }
      }
    }

    stateRef.current.isSwiping = false;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return {
    onTouchStart,
    onTouchEnd,
  };
}

/**
 * 下拉刷新 Hook
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const threshold = 80;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startYRef.current;

    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [isRefreshing]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startYRef.current = 0;
  }, [pullDistance, isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * 滚动检测 Hook
 * 用于检测滚动方向和位置
 */
export function useScrollDetection() {
  const [scrollInfo, setScrollInfo] = useState({
    isAtTop: true,
    isAtBottom: false,
    scrollDirection: 'up' as 'up' | 'down',
    scrollY: 0,
  });

  const lastScrollYRef = useRef(0);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const scrollY = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    setScrollInfo({
      isAtTop: scrollY <= 0,
      isAtBottom: scrollY + clientHeight >= scrollHeight - 10,
      scrollDirection: scrollY > lastScrollYRef.current ? 'down' : 'up',
      scrollY,
    });

    lastScrollYRef.current = scrollY;
  }, []);

  return {
    scrollInfo,
    onScroll,
  };
}

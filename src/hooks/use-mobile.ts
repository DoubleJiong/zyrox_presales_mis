'use client';

import { useState, useEffect } from 'react';

/**
 * 检测是否为移动端设备
 * @param breakpoint 断点宽度，默认 768px
 * @returns boolean 是否为移动端
 * 
 * 注意：服务端渲染时始终返回 false，客户端挂载后才会检测真实值
 * 使用时需要考虑 hydration 兼容性
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  // 初始值固定为 false，避免 hydration 不匹配
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 标记已挂载
    setMounted(true);
    
    // 初始检测
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // 首次检测
    checkMobile();

    // 监听窗口变化
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}

/**
 * 获取移动端状态和挂载状态
 * 用于需要处理 hydration 的场景
 */
export function useIsMobileWithMounted(breakpoint: number = 768): { isMobile: boolean; mounted: boolean } {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return { isMobile, mounted };
}

/**
 * 检测设备类型详细信息
 */
export function useDeviceType() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 0,
    height: 0,
    orientation: 'landscape' as 'portrait' | 'landscape',
    touchSupported: false,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * 检测是否支持触摸
 */
export function useTouchSupported(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return supported;
}

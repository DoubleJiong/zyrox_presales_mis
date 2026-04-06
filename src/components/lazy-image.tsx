'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * 图片懒加载组件
 * 支持占位符、响应式尺寸、加载动画
 */

export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  placeholder?: 'blur' | 'skeleton' | 'shimmer' | 'none';
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
}

// 生成简单的占位图数据 URL
function generateBlurDataURL(width = 10, height = 10): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL('image/png');
}

// 微光动画骨架屏
function ShimmerPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

// 简单骨架屏
function SkeletonPlaceholder({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse', className)} />;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  containerClassName,
  placeholder = 'skeleton',
  blurDataURL,
  quality = 75,
  priority = false,
  sizes,
  objectFit = 'cover',
  onLoad,
  onError,
  fallback,
}: LazyImageProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLDivElement>(null);

  // 检测元素是否进入视口
  React.useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  // 占位符渲染
  const renderPlaceholder = () => {
    if (placeholder === 'none') return null;
    if (placeholder === 'shimmer') return <ShimmerPlaceholder className="absolute inset-0" />;
    if (placeholder === 'skeleton') return <SkeletonPlaceholder className="absolute inset-0" />;
    return null;
  };

  // 错误状态渲染
  const renderError = () => {
    if (fallback) return fallback;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <svg
          className="w-12 h-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  };

  const objectFitClass = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
  }[objectFit];

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        !fill && 'inline-block',
        containerClassName
      )}
      style={!fill ? { width, height } : undefined}
    >
      {/* 占位符 */}
      {loading && !error && renderPlaceholder()}

      {/* 错误状态 */}
      {error && renderError()}

      {/* 图片 */}
      {isInView && !error && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          quality={quality}
          priority={priority}
          sizes={sizes}
          className={cn(
            'transition-opacity duration-300',
            loading ? 'opacity-0' : 'opacity-100',
            objectFitClass,
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          placeholder={blurDataURL ? 'blur' : undefined}
          blurDataURL={blurDataURL}
        />
      )}
    </div>
  );
}

/**
 * 头像图片组件
 * 自动处理加载失败，显示首字母头像
 */
export interface LazyAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function LazyAvatar({ src, name, size = 'md', className }: LazyAvatarProps) {
  const [error, setError] = React.useState(false);

  // 生成首字母头像颜色
  const getColorFromName = (name: string): string => {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // 获取首字母
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!src || error) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center text-white font-medium',
          avatarSizes[size],
          getColorFromName(name),
          className
        )}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', avatarSizes[size], className)}>
      <LazyImage
        src={src}
        alt={name}
        fill
        className="object-cover"
        onError={() => setError(true)}
        placeholder="skeleton"
      />
    </div>
  );
}

/**
 * 响应式图片组件
 * 根据屏幕尺寸自动选择最佳图片
 */
export interface ResponsiveImageProps {
  srcSet: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    default: string;
  };
  alt: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | '3/2' | '21/9';
  className?: string;
  containerClassName?: string;
  priority?: boolean;
}

export function ResponsiveImage({
  srcSet,
  alt,
  aspectRatio = '16/9',
  className,
  containerClassName,
  priority = false,
}: ResponsiveImageProps) {
  const { sm, md, lg, xl, default: defaultSrc } = srcSet;

  const sizes = [
    xl && '(min-width: 1280px) 1280px',
    lg && '(min-width: 1024px) 1024px',
    md && '(min-width: 768px) 768px',
    sm && '(min-width: 640px) 640px',
    '100vw',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      style={{ aspectRatio }}
    >
      <LazyImage
        src={defaultSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={cn('object-cover', className)}
        priority={priority}
        placeholder="shimmer"
      />
    </div>
  );
}

/**
 * 图片预加载 Hook
 */
export function useImagePreload(images: string[]) {
  const [loaded, setLoaded] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    images.forEach((src) => {
      // 使用全局 Image 构造函数
      const img = globalThis.Image ? new globalThis.Image() : null;
      if (img) {
        img.src = src;
        img.onload = () => {
          setLoaded((prev) => new Set(prev).add(src));
        };
        img.onerror = () => {
          setErrors((prev) => new Set(prev).add(src));
        };
      }
    });
  }, [images]);

  return { loaded, errors, isLoading: loaded.size + errors.size < images.length };
}

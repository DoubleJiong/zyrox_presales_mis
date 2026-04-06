'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * 网络节点连接动画组件
 * 用于展示数据节点之间的连接关系
 */
export interface NetworkNodesProps {
  /** 节点数据 */
  nodes?: Array<{
    id: string;
    x: number;  // 百分比位置
    y: number;
    label?: string;
    size?: number;
    color?: string;
  }>;
  /** 连接数据 */
  connections?: Array<{
    from: string;
    to: string;
    animated?: boolean;
  }>;
  /** 类名 */
  className?: string;
}

export function NetworkNodes({
  nodes = defaultNodes,
  connections = defaultConnections,
  className,
}: NetworkNodesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 绘制连接线
      connections.forEach((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);

        if (fromNode && toNode) {
          const x1 = (fromNode.x / 100) * rect.width;
          const y1 = (fromNode.y / 100) * rect.height;
          const x2 = (toNode.x / 100) * rect.width;
          const y2 = (toNode.y / 100) * rect.height;

          // 绘制静态连接线
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // 绘制动态数据流
          if (conn.animated) {
            const progress = (time % 100) / 100;
            const px = x1 + (x2 - x1) * progress;
            const py = y1 + (y2 - y1) * progress;

            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#00d4ff';
            ctx.fill();

            // 发光效果
            const glow = ctx.createRadialGradient(px, py, 0, px, py, 10);
            glow.addColorStop(0, 'rgba(0, 212, 255, 0.5)');
            glow.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
          }
        }
      });

      // 绘制节点
      nodes.forEach((node) => {
        const x = (node.x / 100) * rect.width;
        const y = (node.y / 100) * rect.height;
        const size = node.size || 8;
        const color = node.color || '#00d4ff';

        // 外圈发光
        const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        glow.addColorStop(0, `${color}40`);
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // 节点本体
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // 内圈
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // 标签
        if (node.label) {
          ctx.font = '12px monospace';
          ctx.fillStyle = 'rgba(232, 244, 255, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, x, y + size + 16);
        }
      });

      time += 0.5;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, connections]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full', className)}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// 默认节点数据
const defaultNodes: NetworkNodesProps['nodes'] = [
  { id: 'server', x: 50, y: 20, label: '数据中心', size: 12, color: '#00d4ff' },
  { id: 'db', x: 20, y: 50, label: '数据库', size: 8, color: '#00ff88' },
  { id: 'cache', x: 80, y: 50, label: '缓存', size: 8, color: '#ffaa00' },
  { id: 'api', x: 35, y: 80, label: 'API', size: 6, color: '#00d4ff' },
  { id: 'web', x: 65, y: 80, label: 'Web', size: 6, color: '#00d4ff' },
];

// 默认连接数据
const defaultConnections: NetworkNodesProps['connections'] = [
  { from: 'server', to: 'db', animated: true },
  { from: 'server', to: 'cache', animated: true },
  { from: 'server', to: 'api', animated: false },
  { from: 'server', to: 'web', animated: false },
  { from: 'api', to: 'db', animated: true },
  { from: 'web', to: 'cache', animated: true },
];

/**
 * 圆形进度环动画组件
 */
export interface CircularProgressProps {
  /** 进度值 (0-100) */
  value: number;
  /** 环大小 */
  size?: number;
  /** 线宽 */
  strokeWidth?: number;
  /** 颜色 */
  color?: string;
  /** 背景色 */
  bgColor?: string;
  /** 是否显示文字 */
  showText?: boolean;
  /** 动画持续时间 */
  duration?: number;
  /** 类名 */
  className?: string;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#00d4ff',
  bgColor = 'rgba(0, 212, 255, 0.2)',
  showText = true,
  duration = 1000,
  className,
}: CircularProgressProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const circle = progressRef.current;
    if (!circle) return;

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${circumference}`;
    circle.style.transition = `stroke-dashoffset ${duration}ms ease-out`;

    // 触发动画
    requestAnimationFrame(() => {
      circle.style.strokeDashoffset = `${offset}`;
    });
  }, [value, size, strokeWidth, duration]);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景环 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          ref={progressRef}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{
              fontSize: size / 4,
              color,
              textShadow: `0 0 10px ${color}`,
            }}
          >
            {value}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 加载动画组件
 */
export interface LoadingSpinnerProps {
  /** 大小 */
  size?: number;
  /** 颜色 */
  color?: string;
  /** 类型 */
  variant?: 'ring' | 'dots' | 'pulse';
  /** 文字 */
  text?: string;
  /** 类名 */
  className?: string;
}

export function LoadingSpinner({
  size = 40,
  color = '#00d4ff',
  variant = 'ring',
  text,
  className,
}: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: size / 4,
                height: size / 4,
                backgroundColor: color,
                animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                boxShadow: `0 0 ${size / 2}px ${color}`,
              }}
            />
          ))}
        </div>
        {text && (
          <span
            className="text-sm"
            style={{ color }}
          >
            {text}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div
          className="rounded-full sci-pulse"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            boxShadow: `0 0 ${size}px ${color}`,
          }}
        />
        {text && (
          <span
            className="text-sm"
            style={{ color }}
          >
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className="rounded-full border-2 border-t-transparent"
        style={{
          width: size,
          height: size,
          borderColor: color,
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
        }}
      />
      {text && (
        <span
          className="text-sm"
          style={{ color }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

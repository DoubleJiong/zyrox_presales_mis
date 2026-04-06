'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * 粒子配置
 */
interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  trail: { x: number; y: number }[];
}

export interface DataFlowParticlesProps {
  /** 粒子数量 */
  count?: number;
  /** 粒子颜色 */
  color?: string;
  /** 粒子大小范围 */
  sizeRange?: [number, number];
  /** 粒子速度范围 */
  speedRange?: [number, number];
  /** 是否显示轨迹 */
  showTrail?: boolean;
  /** 轨迹长度 */
  trailLength?: number;
  /** 流动方向 */
  direction?: 'left' | 'right' | 'up' | 'down' | 'random';
  /** 连接线 */
  showConnections?: boolean;
  /** 连接距离 */
  connectionDistance?: number;
  /** 类名 */
  className?: string;
}

/**
 * 数据流粒子效果组件
 * 模拟数据传输的动态效果
 */
export function DataFlowParticles({
  count = 50,
  color = '#00d4ff',
  sizeRange = [1, 3],
  speedRange = [0.5, 2],
  showTrail = true,
  trailLength = 5,
  direction = 'random',
  showConnections = false,
  connectionDistance = 100,
  className,
}: DataFlowParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  // 初始化粒子
  const initParticles = useCallback(
    (width: number, height: number) => {
      const particles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        const size =
          Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0];
        const speed =
          Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];

        let speedX = 0;
        let speedY = 0;

        switch (direction) {
          case 'left':
            speedX = -speed;
            break;
          case 'right':
            speedX = speed;
            break;
          case 'up':
            speedY = -speed;
            break;
          case 'down':
            speedY = speed;
            break;
          default:
            speedX = (Math.random() - 0.5) * speed * 2;
            speedY = (Math.random() - 0.5) * speed * 2;
        }

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          speedX,
          speedY,
          opacity: Math.random() * 0.5 + 0.5,
          color,
          trail: [],
        });
      }

      particlesRef.current = particles;
    },
    [count, color, sizeRange, speedRange, direction]
  );

  // 动画循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;

    // 绘制连接线
    if (showConnections) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity =
              (1 - distance / connectionDistance) * 0.3 * particles[i].opacity;
            ctx.beginPath();
            ctx.strokeStyle = `${color}${Math.floor(opacity * 255)
              .toString(16)
              .padStart(2, '0')}`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // 更新和绘制粒子
    particles.forEach((particle) => {
      // 更新位置
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      // 边界处理
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;

      // 更新轨迹
      if (showTrail) {
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > trailLength) {
          particle.trail.shift();
        }

        // 绘制轨迹
        if (particle.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y);

          for (let i = 1; i < particle.trail.length; i++) {
            ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
          }

          const gradient = ctx.createLinearGradient(
            particle.trail[0].x,
            particle.trail[0].y,
            particle.x,
            particle.y
          );
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(1, `${color}${Math.floor(particle.opacity * 128)
            .toString(16)
            .padStart(2, '0')}`);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = particle.size;
          ctx.stroke();
        }
      }

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `${color}${Math.floor(particle.opacity * 255)
        .toString(16)
        .padStart(2, '0')}`;
      ctx.fill();

      // 发光效果
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 3
      );
      glow.addColorStop(0, `${color}40`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [color, showConnections, connectionDistance, showTrail, trailLength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles(rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
    />
  );
}

/**
 * 数据包传输动画组件
 */
export interface DataPacketProps {
  /** 起点坐标 */
  from: { x: number; y: number };
  /** 终点坐标 */
  to: { x: number; y: number };
  /** 动画持续时间(ms) */
  duration?: number;
  /** 颜色 */
  color?: string;
  /** 数据包大小 */
  size?: number;
  /** 是否循环 */
  loop?: boolean;
  /** 循环间隔(ms) */
  loopInterval?: number;
  /** 完成回调 */
  onComplete?: () => void;
}

export function DataPacket({
  from,
  to,
  duration = 1000,
  color = '#00d4ff',
  size = 8,
  loop = false,
  loopInterval = 500,
  onComplete,
}: DataPacketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    let startTime: number | null = null;
    let isAnimating = true;

    const animate = (timestamp: number) => {
      if (!isAnimating) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // 计算当前位置
      const x = from.x + (to.x - from.x) * easeProgress;
      const y = from.y + (to.y - from.y) * easeProgress;

      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制路径
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = `${color}20`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制数据包轨迹
      const trailLength = 50;
      const trailProgress = Math.max(0, easeProgress - 0.1);
      const trailX = from.x + (to.x - from.x) * trailProgress;
      const trailY = from.y + (to.y - from.y) * trailProgress;

      const gradient = ctx.createLinearGradient(trailX, trailY, x, y);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `${color}80`);

      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = size / 2;
      ctx.stroke();

      // 绘制数据包
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 发光效果
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      glow.addColorStop(0, `${color}80`);
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();

        if (loop) {
          setTimeout(() => {
            startTime = null;
            animationRef.current = requestAnimationFrame(animate);
          }, loopInterval);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isAnimating = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [from, to, duration, color, size, loop, loopInterval, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

/**
 * 脉冲波纹效果组件
 */
export interface PulseWaveProps {
  /** 中心点 */
  center?: { x: number; y: number };
  /** 波纹数量 */
  waves?: number;
  /** 波纹颜色 */
  color?: string;
  /** 波纹最大半径 */
  maxRadius?: number;
  /** 动画持续时间(ms) */
  duration?: number;
  /** 波纹间隔(ms) */
  interval?: number;
  /** 是否循环 */
  loop?: boolean;
  /** 类名 */
  className?: string;
}

export function PulseWave({
  center = { x: 50, y: 50 },
  waves = 3,
  color = '#00d4ff',
  maxRadius = 100,
  duration = 2000,
  interval = 500,
  loop = true,
  className,
}: PulseWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const centerX = (center.x / 100) * canvas.width;
    const centerY = (center.y / 100) * canvas.height;
    const actualMaxRadius = Math.min(
      (maxRadius / 100) * Math.min(canvas.width, canvas.height),
      Math.min(canvas.width, canvas.height) / 2
    );

    const waveState: number[] = Array(waves).fill(0);
    let lastWaveTime = 0;
    let currentWave = 0;

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 触发新波纹
      if (timestamp - lastWaveTime > interval && waveState[currentWave] >= 1) {
        waveState[currentWave] = 0;
        currentWave = (currentWave + 1) % waves;
        lastWaveTime = timestamp;
      }

      // 绘制波纹
      waveState.forEach((progress, index) => {
        if (progress > 0 || (loop && index === currentWave)) {
          waveState[index] = Math.min(
            (waveState[index] + 1 / (duration / 16)) || 0.001,
            1
          );

          const radius = waveState[index] * actualMaxRadius;
          const opacity = 1 - waveState[index];

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}${Math.floor(opacity * 255 * 0.5)
            .toString(16)
            .padStart(2, '0')}`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // 内部填充
          const fillGradient = ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            radius
          );
          fillGradient.addColorStop(0, `${color}${Math.floor(opacity * 50)
            .toString(16)
            .padStart(2, '0')}`);
          fillGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = fillGradient;
          ctx.fill();
        }
      });

      // 绘制中心点
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      const centerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        20
      );
      centerGlow.addColorStop(0, `${color}80`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      if (loop || waveState.some((p) => p < 1 && p > 0)) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // 初始化第一个波纹
    waveState[0] = 0.001;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [center, waves, color, maxRadius, duration, interval, loop]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
    />
  );
}

/**
 * 数字滚动效果组件
 */
export interface NumberScrollProps {
  /** 目标数值 */
  value: number;
  /** 小数位数 */
  decimals?: number;
  /** 动画持续时间(ms) */
  duration?: number;
  /** 数字高度 */
  digitHeight?: number;
  /** 字体大小 */
  fontSize?: number;
  /** 颜色 */
  color?: string;
  /** 类名 */
  className?: string;
}

export function NumberScroll({
  value,
  decimals = 0,
  duration = 1000,
  digitHeight = 40,
  fontSize = 32,
  color = '#00d4ff',
  className,
}: NumberScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const digits = container.children;
    const startValue = prevValueRef.current;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (value - startValue) * easeProgress;
      const formattedValue = currentValue.toFixed(decimals).padStart(decimals + 1, '0');

      Array.from(digits).forEach((digit, index) => {
        const targetDigit = parseInt(formattedValue[index]) || 0;
        const digitEl = digit as HTMLElement;

        // 添加过渡动画
        digitEl.style.transition = `transform ${duration / 10}ms ease-out`;
        digitEl.style.transform = `translateY(${-targetDigit * digitHeight}px)`;
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, decimals, duration, digitHeight]);

  const digitCount = Math.max(value.toFixed(decimals).length, decimals + 1);
  const digits = Array(digitCount).fill(0);

  return (
    <div
      ref={containerRef}
      className={cn('flex overflow-hidden', className)}
      style={{ height: digitHeight }}
    >
      {digits.map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-start"
          style={{
            fontSize,
            color,
            fontFamily: 'monospace',
            height: digitHeight * 10,
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div
              key={num}
              style={{
                height: digitHeight,
                lineHeight: `${digitHeight}px`,
              }}
            >
              {num}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

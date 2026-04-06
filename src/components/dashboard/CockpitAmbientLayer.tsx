'use client';

import { useEffect, useState } from 'react';

interface CockpitAmbientLayerProps {
  active?: boolean;
  fullscreen?: boolean;
}

const STREAM_COLUMNS = [
  { left: '8%', duration: '18s', delay: '0s', lines: ['7F2A3BC1', 'D4E8C901', 'A1B3C5D7', '9E0F7A4C'] },
  { left: '20%', duration: '21s', delay: '1.5s', lines: ['1C9D84AF', '66A2E019', 'BD42AC71', 'F0B137CE'] },
  { left: '34%', duration: '19s', delay: '0.8s', lines: ['0AF183CD', '7D81EEA4', 'CC2198FA', '31D7AB0E'] },
  { left: '58%', duration: '24s', delay: '2.4s', lines: ['8AB701DC', '44F0C92B', 'E9D411AF', '15B8CE72'] },
  { left: '72%', duration: '20s', delay: '1.2s', lines: ['3F7A1BCD', 'D0E2AA18', 'B18CFA70', '4CE71D29'] },
  { left: '86%', duration: '23s', delay: '3.1s', lines: ['AA19F0C7', '72C4DE18', '1EAB93DF', 'CF4307BA'] },
];

export function CockpitAmbientLayer({ active = true, fullscreen = false }: CockpitAmbientLayerProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return (
    <div
      data-testid="data-screen-ambient-layer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: active ? 1 : 0,
        transition: 'opacity 320ms ease-out',
      }}
    >
      <style>
        {`
          .cockpit-ambient-shell {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at 18% 24%, rgba(0, 212, 255, 0.12), transparent 28%),
              radial-gradient(circle at 82% 18%, rgba(0, 255, 136, 0.08), transparent 22%),
              radial-gradient(circle at 50% 72%, rgba(255, 191, 36, 0.06), transparent 24%),
              linear-gradient(180deg, rgba(5, 10, 20, 0.16) 0%, rgba(5, 10, 20, 0.4) 100%);
          }
          .cockpit-ambient-grid {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(0, 212, 255, 0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.025) 1px, transparent 1px);
            background-size: 56px 56px;
            animation: cockpitGridMove 28s linear infinite;
          }
          .cockpit-ambient-vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, transparent 35%, rgba(4, 8, 16, 0.32) 100%);
          }
          .cockpit-ambient-scan {
            position: absolute;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.26), transparent);
            animation: cockpitScanLine 10s linear infinite;
          }
          .cockpit-ambient-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            width: min(84vw, 1100px);
            height: min(84vw, 1100px);
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.02) 32%, transparent 72%);
            animation: cockpitPulseRing 8s ease-in-out infinite;
          }
          .cockpit-ambient-stream {
            position: absolute;
            top: -12%;
            color: rgba(0, 212, 255, 0.14);
            font-family: "JetBrains Mono", monospace;
            font-size: 10px;
            line-height: 1.7;
            letter-spacing: 1.4px;
            white-space: pre;
            animation-name: cockpitDataStream;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            text-shadow: 0 0 12px rgba(0, 212, 255, 0.08);
          }
          @keyframes cockpitGridMove {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(56px, 56px, 0); }
          }
          @keyframes cockpitScanLine {
            0% { top: -2px; opacity: 0; }
            8% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          @keyframes cockpitPulseRing {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
            50% { transform: translate(-50%, -50%) scale(1.04); opacity: 0.34; }
          }
          @keyframes cockpitDataStream {
            0% { transform: translateY(-8%); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(112vh); opacity: 0; }
          }
        `}
      </style>

      <div className="cockpit-ambient-shell" style={{ opacity: fullscreen ? 1 : 0.9 }} />
      <div className="cockpit-ambient-grid" style={{ opacity: reduceMotion ? 0.45 : 0.78, animation: reduceMotion ? 'none' : undefined }} />
      {!reduceMotion && <div className="cockpit-ambient-scan" />}
      {!reduceMotion && <div className="cockpit-ambient-ring" style={{ opacity: fullscreen ? 0.42 : 0.28 }} />}
      {!reduceMotion && STREAM_COLUMNS.map((column) => (
        <div
          key={column.left}
          className="cockpit-ambient-stream"
          style={{
            left: column.left,
            animationDuration: column.duration,
            animationDelay: column.delay,
          }}
        >
          {column.lines.join('\n')}
        </div>
      ))}
      <div className="cockpit-ambient-vignette" />
    </div>
  );
}
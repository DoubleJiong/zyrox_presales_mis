'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DS_COLORS, DsPanel, STAGE_LABEL } from './DataScreenShell';
import type { RegionViewData } from '@/types/data-screen';

interface Props { data: RegionViewData | null }

const STAGE_COLORS: Record<string, string> = {
  opportunity:          DS_COLORS.primary,
  bidding_pending:      DS_COLORS.secondary,
  bidding:              DS_COLORS.secondary,
  solution_review:      DS_COLORS.secondary,
  contract_pending:     DS_COLORS.success,
  delivery_preparing:   DS_COLORS.success,
  delivering:           DS_COLORS.success,
  settlement:           DS_COLORS.success,
  archived:             DS_COLORS.muted,
  cancelled:            DS_COLORS.danger,
  suspended:            DS_COLORS.danger,
};

export function DataScreenProjectCarousel({ data }: Props) {
  const router = useRouter();
  const projects = data?.projectList ?? [];

  // scroll state
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);           // hover-pause
  const userScrollingRef = useRef(false);    // wheel/touch pause
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // speed: pixels per second
  const SPEED = 28;

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false;
    }, 2500);
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    if (projects.length === 0) return;
    let last = 0;
    let raf: number;
    const step = (ts: number) => {
      if (last === 0) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      if (!pausedRef.current && !userScrollingRef.current) {
        const el = containerRef.current;
        if (el) {
          el.scrollTop += SPEED * dt;
          // loop: when scrolled past halfway (duplicated list), reset to 0
          if (el.scrollTop >= el.scrollHeight / 2) {
            el.scrollTop = 0;
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [projects.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    userScrollingRef.current = true;
    el.scrollTop += e.deltaY;
    // loop boundary checks
    if (el.scrollTop < 0) el.scrollTop = 0;
    if (el.scrollTop >= el.scrollHeight / 2) el.scrollTop = el.scrollTop % (el.scrollHeight / 2);
    scheduleResume();
  }, [scheduleResume]);

  if (projects.length === 0) {
    return (
      <DsPanel title="项目列表">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DS_COLORS.muted, fontSize: 12 }}>
          暂无项目数据
        </div>
      </DsPanel>
    );
  }

  const doubled = [...projects, ...projects];

  return (
    <DsPanel title="项目列表">
      <style>{`
        @keyframes ds-row-pulse{0%,100%{opacity:1}50%{opacity:.65}}
        @keyframes ds-dot-blink{0%,100%{opacity:1;box-shadow:0 0 4px #f0a500}50%{opacity:.3;box-shadow:none}}
        .ds-proj-row{transition:background 0.18s,box-shadow 0.18s;}
        .ds-proj-row:hover{background:rgba(0,212,255,0.06)!important;box-shadow:inset 2px 0 0 #00d4ff;}
        .ds-carousel-scroll::-webkit-scrollbar{display:none;}
        .ds-carousel-scroll{scrollbar-width:none;-ms-overflow-style:none;}
      `}</style>
      <div
        ref={containerRef}
        className="ds-carousel-scroll"
        style={{ overflow: 'hidden', height: '100%', padding: '4px 8px' }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onWheel={handleWheel}
      >
        {doubled.map((p, idx) => {
          const stageColor = STAGE_COLORS[p.projectStage ?? ''] ?? DS_COLORS.muted;
          const isHighValue = p.amount !== undefined && p.amount !== null && Number(p.amount) >= 100;
          return (
            <div
              key={idx}
              className="ds-proj-row"
              onClick={() => router.push('/projects/' + p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 4px',
                borderBottom: '1px solid ' + DS_COLORS.border,
                cursor: 'pointer',
                borderLeft: `2px solid ${stageColor}55`,
                paddingLeft: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: DS_COLORS.muted,
                  minWidth: 18,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {(idx % projects.length) + 1}
              </span>
              {isHighValue && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: DS_COLORS.warning,
                  flexShrink: 0,
                  animation: 'ds-dot-blink 1.6s ease-in-out infinite',
                }} />
              )}
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: isHighValue ? 600 : 400,
                  color: isHighValue ? DS_COLORS.text : DS_COLORS.muted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: isHighValue ? `0 0 8px ${DS_COLORS.primary}66` : 'none',
                }}
              >
                {p.projectName}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: DS_COLORS.muted,
                  flexShrink: 0,
                  minWidth: 52,
                  textAlign: 'right',
                }}
              >
                {p.region ?? ''}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: stageColor,
                  background: stageColor + '22',
                  padding: '2px 6px',
                  borderRadius: 3,
                  flexShrink: 0,
                  minWidth: 44,
                  textAlign: 'center',
                  border: `1px solid ${stageColor}44`,
                }}
              >
                {STAGE_LABEL[p.projectStage ?? ''] ?? p.projectStage ?? ''}
              </span>
              {p.amount !== undefined && p.amount !== null && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: DS_COLORS.warning,
                    flexShrink: 0,
                    minWidth: 48,
                    textAlign: 'right',
                    textShadow: isHighValue ? '0 0 8px #f0a50066' : 'none',
                  }}
                >
                  {Number(p.amount).toFixed(0)}万
                </span>
              )}
            </div>
          );
        })}
      </div>
    </DsPanel>
  );
}
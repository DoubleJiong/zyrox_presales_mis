'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import type { PersonnelGraphNode, PersonnelGraphEdge } from '@/types/data-screen';
import { DS_COLORS, DsPanel, DsSkeleton } from './DataScreenShell';

interface Props {
  nodes: PersonnelGraphNode[];
  edges: PersonnelGraphEdge[];
  loading: boolean;
  selectedUserId: number | null;
  onPersonSelect: (userId: number | null) => void;
}

// Node category visual config
const NODE_CATEGORY: Record<string, { color: string; symbol: string; size: number; label: string }> = {
  person:   { color: DS_COLORS.primary,   symbol: 'circle',    size: 26, label: '人员' },
  project:  { color: DS_COLORS.success,   symbol: 'diamond',   size: 20, label: '项目' },
  solution: { color: DS_COLORS.secondary, symbol: 'roundRect', size: 18, label: '解决方案' },
};

export function DataScreenPersonnelGraph({
  nodes, edges, loading, selectedUserId, onPersonSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  const buildOption = useCallback(() => {
    const selectedNodeId = selectedUserId !== null ? `u:${selectedUserId}` : null;
    const connectedNodeIds = new Set<string>();
    if (selectedNodeId) {
      connectedNodeIds.add(selectedNodeId);
      for (const edge of edges) {
        if (edge.source === selectedNodeId) connectedNodeIds.add(edge.target);
        if (edge.target === selectedNodeId) connectedNodeIds.add(edge.source);
      }
    }

    const echartsNodes = nodes.map(n => {
      const cat = NODE_CATEGORY[n.nodeType];
      const uid = n.nodeType === 'person' ? parseInt(n.id.slice(2), 10) : null;
      const isSelected = uid !== null && uid === selectedUserId;
      const isContextNode = !selectedNodeId || connectedNodeIds.has(n.id);
      const nodeOverdue = n.nodeType === 'person' && (n.overdueTaskCount ?? 0) > 0;
      // Person nodes scale with project count (base 22 + up to 18 extra)
      const baseSize = n.nodeType === 'person'
        ? 22 + Math.min((n.projectCount ?? 0) * 3, 18)
        : cat.size;
      return {
        id: n.id,
        name: n.name,
        nodeType: n.nodeType,
        userId: uid,
        projectCount: n.projectCount,
        overdueTaskCount: n.overdueTaskCount,
        symbol: cat.symbol,
        symbolSize: isSelected ? baseSize * 1.5 : baseSize,
        value: isSelected ? 100 : (isContextNode ? 60 : 20),
        itemStyle: {
          color: cat.color,
          borderColor: isSelected
            ? DS_COLORS.warning
            : nodeOverdue
              ? DS_COLORS.danger
              : 'rgba(255,255,255,0.15)',
          borderWidth: isSelected ? 2.5 : nodeOverdue ? 2 : 1,
          shadowBlur: isSelected ? 16 : nodeOverdue ? 10 : 6,
          shadowColor: isSelected ? DS_COLORS.warning : nodeOverdue ? DS_COLORS.danger + '88' : cat.color + '66',
          opacity: isContextNode ? 1 : 0.2,
        },
        label: {
          show: n.nodeType === 'person' || nodes.length < 30,
          formatter: n.name.length > 8 ? n.name.slice(0, 8) + '…' : n.name,
          color: isContextNode ? DS_COLORS.text : DS_COLORS.muted,
          fontSize: 10,
          distance: 6,
          opacity: isContextNode ? 1 : 0.35,
        },
      };
    });

    const echartsEdges = edges.map(e => {
      const isSelectedEdge = selectedNodeId !== null && (e.source === selectedNodeId || e.target === selectedNodeId);
      const isContextEdge = !selectedNodeId || isSelectedEdge;
      return {
        source: e.source,
        target: e.target,
        lineStyle: {
          color: e.lineType === 'direct' ? DS_COLORS.primary + 'aa' : DS_COLORS.muted + '77',
          type: e.lineType === 'direct' ? 'solid' : 'dashed',
          width: isSelectedEdge ? 2.4 : (e.lineType === 'direct' ? 1.5 : 1),
          curveness: 0.08,
          opacity: isContextEdge ? 0.85 : 0.12,
        },
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(10,20,40,0.92)',
        borderColor: DS_COLORS.border,
        textStyle: { color: DS_COLORS.text, fontSize: 11 },
        formatter: (params: { dataType: string; name: string; data: { nodeType?: string; projectCount?: number; overdueTaskCount?: number } }) => {
          if (params.dataType === 'node') {
            const typeLabel = params.data.nodeType
              ? NODE_CATEGORY[params.data.nodeType]?.label ?? ''
              : '';
            let info = `<b>${params.name}</b><br/><span style="color:${DS_COLORS.muted}">${typeLabel}</span>`;
            if (params.data.nodeType === 'person') {
              const pc = params.data.projectCount ?? 0;
              const oc = params.data.overdueTaskCount ?? 0;
              info += `<br/>参与项目: ${pc}`;
              if (oc > 0) {
                info += `<br/><span style="color:${DS_COLORS.danger}">逾期任务: ${oc}</span>`;
              }
            }
            return info;
          }
          return '';
        },
      },
      legend: {
        data: Object.entries(NODE_CATEGORY).map(([, v]) => ({
          name: v.label,
          icon: v.symbol,
          itemStyle: { color: v.color },
        })),
        bottom: 4,
        right: 8,
        orient: 'horizontal',
        textStyle: { color: DS_COLORS.muted, fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          animation: true,
          animationDuration: 800,
          data: echartsNodes,
          edges: echartsEdges,
          roam: true,
          draggable: true,
          force: {
            repulsion: nodes.length > 60 ? 160 : 220,
            gravity: 0.08,
            edgeLength: [50, 140],
            layoutAnimation: true,
          },
          emphasis: {
            focus: 'adjacency',
            itemStyle: { shadowBlur: 20 },
          },
          lineStyle: {
            opacity: 0.7,
          },
          label: {
            show: true,
            position: 'right',
          },
        },
      ],
    };
  }, [nodes, edges, selectedUserId]);

  // Init + update chart
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let chart = chartRef.current;
    if (!chart) {
      chart = echarts.init(containerRef.current, null, { renderer: 'canvas' });
      chartRef.current = chart;

      chart.on('click', (params: { dataType: string; data: { nodeType?: string; userId?: number } }) => {
        if (params.dataType === 'node' && params.data.nodeType === 'person' && params.data.userId) {
          onPersonSelect(params.data.userId);
        }
      });
    }

    if (!loading && nodes.length > 0) {
      chart.setOption(buildOption(), { notMerge: true });
    } else if (loading) {
      chart.clear();
    } else {
      // empty state
      chart.setOption({
        backgroundColor: 'transparent',
        graphic: [{
          type: 'text',
          left: 'center',
          top: 'middle',
          style: { text: '暂无人员关系数据', fill: DS_COLORS.muted, fontSize: 13 },
        }],
      }, { notMerge: true });
    }
  }, [nodes, edges, loading, buildOption, onPersonSelect]);

  // Resize
  useEffect(() => {
    const ro = new ResizeObserver(() => chartRef.current?.resize());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Cleanup
  useEffect(() => () => { chartRef.current?.dispose(); chartRef.current = null; }, []);

  return (
    <DsPanel
      title="人员关系图谱"
      titleRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedUserId !== null && (
            <button
              onClick={() => onPersonSelect(null)}
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 3,
                border: '1px solid ' + DS_COLORS.border,
                background: 'transparent',
                color: DS_COLORS.muted,
                cursor: 'pointer',
              }}
            >
              返回团队态
            </button>
          )}
          <span style={{ fontSize: 10, color: DS_COLORS.muted }}>
            实线=直接负责&nbsp;&nbsp;虚线=参与协作&nbsp;&nbsp;{selectedUserId ? '已聚焦当前人员关联网络' : '点击人员节点查看画像'}
          </span>
        </div>
      }
      style={{ height: '100%' }}
    >
      {loading ? (
        <DsSkeleton />
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      )}
    </DsPanel>
  );
}

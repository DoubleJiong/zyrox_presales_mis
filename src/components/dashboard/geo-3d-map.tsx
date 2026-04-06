'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { cn } from '@/lib/utils';
import { loadChinaMap, provinceCenters } from '@/lib/geo-utils';

export interface Geo3DMapProps {
  /** 客户分布数据 */
  customerData?: Array<{
    name: string;
    value: number;
  }>;
  /** 销售数据 */
  salesData?: Array<{
    name: string;
    value: number;
  }>;
  /** 是否显示飞线 */
  showFlyLines?: boolean;
  /** 是否自动轮播 */
  autoPlay?: boolean;
  /** 轮播间隔(毫秒) */
  playInterval?: number;
  /** 类名 */
  className?: string;
}

/**
 * 3D地图可视化组件
 * 展示销售区域热力图与客户分布
 */
export function Geo3DMap({
  customerData = [],
  salesData = [],
  showFlyLines = true,
  autoPlay = true,
  playInterval = 3000,
  className,
}: Geo3DMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // 默认客户数据（示例）
  const defaultCustomerData = [
    { name: '北京', value: 156 },
    { name: '上海', value: 234 },
    { name: '广东', value: 312 },
    { name: '浙江', value: 198 },
    { name: '江苏', value: 187 },
    { name: '四川', value: 145 },
    { name: '湖北', value: 123 },
    { name: '山东', value: 167 },
    { name: '河南', value: 98 },
    { name: '福建', value: 134 },
    { name: '湖南', value: 112 },
    { name: '安徽', value: 89 },
    { name: '陕西', value: 76 },
    { name: '辽宁', value: 95 },
    { name: '重庆', value: 87 },
  ];

  const data = customerData.length > 0 ? customerData : defaultCustomerData;

  // 加载地图
  useEffect(() => {
    loadChinaMap().then((success) => {
      setMapLoaded(true);
    });
  }, []);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !mapLoaded) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current, 'dark');

    // 散点数据
    const scatterData = data
      .map((item) => {
        const coords = provinceCenters[item.name];
        if (coords) {
          return {
            name: item.name,
            value: [...coords, item.value] as [number, number, number],
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ name: string; value: [number, number, number] }>;

    // 飞线数据
    const flyLineData: Array<{ coords: [number, number][] }> = [];
    if (showFlyLines) {
      const center: [number, number] = [116.46, 39.92]; // 北京为中心
      data.slice(0, 8).forEach((item) => {
        const coords = provinceCenters[item.name];
        if (coords) {
          flyLineData.push({
            coords: [center, coords],
          });
        }
      });
    }

    const maxValue = Math.max(...data.map((d) => d.value));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(13, 21, 38, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.5)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f4ff',
        },
        formatter: (params: any) => {
          if (params.seriesType === 'effectScatter' || params.seriesType === 'scatter') {
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; color: #00d4ff; margin-bottom: 4px;">
                  ${params.name}
                </div>
                <div style="color: #8ba4c7;">
                  客户数: <span style="color: #00d4ff;">${params.value[2]}</span>
                </div>
              </div>
            `;
          }
          if (params.seriesType === 'map') {
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; color: #00d4ff; margin-bottom: 4px;">
                  ${params.name}
                </div>
              </div>
            `;
          }
          return '';
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxValue,
        inRange: {
          color: ['#0d1526', '#1a3a5c', '#2a5a8c', '#00d4ff'],
        },
        calculable: true,
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [104, 35],
        label: {
          show: false,
        },
        itemStyle: {
          areaColor: '#0d1526',
          borderColor: 'rgba(0, 212, 255, 0.3)',
          borderWidth: 1,
          shadowColor: 'rgba(0, 212, 255, 0.2)',
          shadowBlur: 10,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#1a3a5c',
            borderColor: 'rgba(0, 212, 255, 0.8)',
            borderWidth: 2,
          },
          label: {
            show: true,
            color: '#00d4ff',
            fontSize: 12,
          },
        },
        select: {
          itemStyle: {
            areaColor: '#2a5a8c',
          },
        },
      },
      series: [
        // 地图底色
        {
          name: '中国',
          type: 'map',
          map: 'china',
          geoIndex: 0,
          itemStyle: {
            areaColor: '#0d1526',
          },
          data: [],
        },
        // 散点标记 - 客户分布
        {
          name: '客户分布',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: (val: number[]) => {
            return Math.max(8, Math.min(25, val[2] / 15));
          },
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 3,
            period: 4,
          },
          label: {
            show: false,
          },
          itemStyle: {
            color: '#00d4ff',
            shadowBlur: 15,
            shadowColor: 'rgba(0, 212, 255, 0.6)',
          },
          emphasis: {
            itemStyle: {
              color: '#00ff88',
              shadowBlur: 20,
            },
          },
        },
        // 飞线效果
        ...(showFlyLines
          ? [
              {
                name: '数据流向',
                type: 'lines',
                coordinateSystem: 'geo',
                zlevel: 2,
                effect: {
                  show: true,
                  period: 4,
                  trailLength: 0.3,
                  symbol: 'arrow',
                  symbolSize: 6,
                  color: '#00d4ff',
                },
                lineStyle: {
                  color: 'rgba(0, 212, 255, 0.4)',
                  width: 1,
                  curveness: 0.3,
                },
                data: flyLineData,
              } as any,
            ]
          : []),
      ],
    };

    chartInstance.current.setOption(option);

    // 响应式调整
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // 自动轮播
    let currentIndex = 0;
    let playTimer: NodeJS.Timeout | null = null;

    if (autoPlay && scatterData.length > 0) {
      playTimer = setInterval(() => {
        chartInstance.current?.dispatchAction({
          type: 'showTip',
          seriesIndex: 1,
          dataIndex: currentIndex,
        });
        currentIndex = (currentIndex + 1) % scatterData.length;
      }, playInterval);
    }

    // 鼠标事件
    chartInstance.current.on('mouseover', (params: any) => {
      if (params.name) {
        setHoveredRegion(params.name);
      }
    });

    chartInstance.current.on('mouseout', () => {
      setHoveredRegion(null);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (playTimer) {
        clearInterval(playTimer);
      }
      chartInstance.current?.dispose();
    };
  }, [data, showFlyLines, autoPlay, playInterval, mapLoaded]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[var(--sci-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-sm text-[var(--sci-text-dim)]">加载地图中...</span>
          </div>
        </div>
      )}
      <div ref={chartRef} className="w-full h-full" />
      {/* 悬浮信息框 */}
      {hoveredRegion && (
        <div className="absolute top-4 left-4 px-3 py-2 bg-[rgba(13,21,38,0.9)] border border-[rgba(0,212,255,0.5)] rounded text-sm sci-border-glow">
          <span className="text-[var(--sci-primary)]">{hoveredRegion}</span>
        </div>
      )}
    </div>
  );
}

// 导出别名以兼容
export { Geo3DMap as GeoFiMap };
export type { Geo3DMapProps as GeoFiMapProps };

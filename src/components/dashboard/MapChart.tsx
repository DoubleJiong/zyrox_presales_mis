'use client';

import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';

type MapType = 'china' | 'zhejiang';

interface MapChartProps {
  mapType?: MapType;
  data?: Array<{ name: string; value: number }>;
  height?: string;
  onRegionClick?: (name: string, value: number) => void;
}

export function MapChart({
  mapType = 'china',
  data = [],
  height = '400px',
  onRegionClick,
}: MapChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { theme } = useDashboardTheme();
  const [geoJson, setGeoJson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 加载地图数据
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);
        const mapFile = mapType === 'china'
          ? '/china-provinces.geojson'
          : '/zhejiang-province.geojson';

        const response = await fetch(mapFile);
        const jsonData = await response.json();
        setGeoJson(jsonData);

        // 注册地图
        echarts.registerMap(mapType, jsonData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load map data:', error);
        setLoading(false);
      }
    };

    loadMapData();
  }, [mapType]);

  // 地图配置
  const getOption = () => {
    const chartColors = theme.chart.colors;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = params.value || 0;
          return `${params.name}<br/>项目数: ${value}`;
        },
        backgroundColor: theme.background.card,
        borderColor: theme.border.color,
        textStyle: {
          color: theme.text.primary,
        },
      },
      visualMap: {
        min: 0,
        max: Math.max(...data.map((d) => d.value), 10),
        left: 'left',
        bottom: 'bottom',
        text: ['高', '低'],
        inRange: {
          color: [chartColors[0], chartColors[1], chartColors[2]],
        },
        textStyle: {
          color: theme.text.secondary,
        },
        calculable: true,
      },
      geo: {
        map: mapType,
        roam: true,
        zoom: 1.2,
        label: {
          show: true,
          color: theme.text.secondary,
          fontSize: 10,
        },
        itemStyle: {
          areaColor: theme.chart.glow
            ? 'rgba(59, 130, 246, 0.3)'
            : 'rgba(51, 65, 85, 0.3)',
          borderColor: theme.border.color,
          borderWidth: 1,
          shadowColor: theme.chart.glow ? theme.colors.primary : 'transparent',
          shadowBlur: theme.chart.glow ? 10 : 0,
        },
        emphasis: {
          label: {
            show: true,
            color: theme.text.primary,
          },
          itemStyle: {
            areaColor: theme.colors.primary,
            shadowBlur: 20,
            shadowColor: theme.chart.glow ? theme.colors.primary : 'transparent',
          },
        },
      },
      series: [
        {
          name: '项目分布',
          type: 'map',
          geoIndex: 0,
          data: data,
        },
      ],
    };
  };

  // 处理地图点击事件
  const onEvents = {
    click: (params: any) => {
      if (onRegionClick && params.name) {
        onRegionClick(params.name, params.value || 0);
      }
    },
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-muted-foreground">加载地图数据...</div>
      </div>
    );
  }

  return (
    <ReactECharts
      ref={chartRef}
      option={getOption()}
      style={{ height, width: '100%' }}
      onEvents={onEvents}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}

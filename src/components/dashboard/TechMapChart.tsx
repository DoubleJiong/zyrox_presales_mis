'use client';

import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { techTheme } from '@/lib/tech-theme';
import { MapDataType, MapRegionData, MapDataConfig, MapHighlightMode } from '@/lib/map-types';

type MapType = 'china' | 'zhejiang';

interface TechMapChartProps {
  mapType: MapType;
  title: string;
  data: MapRegionData[];
  currentDataType?: MapDataType;
  onDataTypeChange?: (type: MapDataType) => void;
  onRegionClick: (data: MapRegionData) => void;
  onDrillDown?: (regionName: string) => void; // 新增：下钻回调
  height?: string;
  showDetailPanel?: boolean;
  selectedRegion?: MapRegionData | null;
  onCloseDetail?: () => void;
  highlightMode?: MapHighlightMode | null; // 新增高亮模式
  highlightRegions?: string[]; // 需要高亮的区域名称列表
  regionBrightness?: Record<string, number>; // 各区域的亮度值
  showViewportToolbar?: boolean;
  onRequestExpand?: () => void;
}

export function TechMapChart({
  mapType,
  title,
  data,
  currentDataType,
  onDataTypeChange,
  onRegionClick,
  onDrillDown,
  height = '400px',
  showDetailPanel = false,
  selectedRegion,
  onCloseDetail,
  highlightMode = null,
  highlightRegions = [],
  regionBrightness = {},
  showViewportToolbar = false,
  onRequestExpand,
}: TechMapChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapRenderVersion, setMapRenderVersion] = useState(0);

  // 获取当前数据类型的值
  const getCurrentValue = (item: MapRegionData) => {
    switch (currentDataType) {
      case MapDataType.CUSTOMER_COUNT:
      case MapDataType.CUSTOMER_COUNT_HEATMAP:
        return item.customerCount;
      case MapDataType.PROJECT_COUNT:
      case MapDataType.PROJECT_COUNT_HEATMAP:
        return item.projectCount;
      case MapDataType.PROJECT_AMOUNT:
      case MapDataType.BUDGET:
      case MapDataType.CONTRACT_AMOUNT:
        if (currentDataType === MapDataType.BUDGET) return (item as any).budget || 0;
        if (currentDataType === MapDataType.CONTRACT_AMOUNT) return (item as any).contractAmount || 0;
        return item.projectAmount;
      case MapDataType.ALERT_COUNT:
        return (item.hasCustomerAlert ? 1 : 0) + (item.hasProjectAlert ? 1 : 0);
      case MapDataType.ONGOING_PROJECT_AMOUNT:
        return item.ongoingProjectAmount;
      case MapDataType.SOLUTION_USAGE:
        return (item as any).solutionUsage || 0;
      case MapDataType.PRE_SALES_ACTIVITY:
        return (item as any).preSalesActivity || 0;
      default:
        return 0;
    }
  };

  // 判断是否是热力图类型
  const isHeatmapType = (type?: MapDataType): boolean => {
    if (!type) return false;
    return [
      MapDataType.CUSTOMER_COUNT_HEATMAP,
      MapDataType.PROJECT_COUNT_HEATMAP,
      MapDataType.BUDGET,
      MapDataType.CONTRACT_AMOUNT,
      MapDataType.PRE_SALES_ACTIVITY,
      MapDataType.SOLUTION_USAGE,
    ].includes(type);
  };

  // 获取当前配置
  const getCurrentConfig = (): MapDataConfig => {
    switch (currentDataType) {
      case MapDataType.CUSTOMER_COUNT:
      case MapDataType.CUSTOMER_COUNT_HEATMAP:
        return {
          type: MapDataType.CUSTOMER_COUNT_HEATMAP,
          label: '客户总数',
          unit: '家',
          color: '#4facfe',
        };
      case MapDataType.PROJECT_COUNT:
        return {
          type: MapDataType.PROJECT_COUNT,
          label: '项目数量',
          unit: '个',
          color: techTheme.colors.secondary,
        };
      case MapDataType.PROJECT_COUNT_HEATMAP:
        return {
          type: MapDataType.PROJECT_COUNT_HEATMAP,
          label: '项目总数',
          unit: '个',
          color: '#fee140',
        };
      case MapDataType.PROJECT_AMOUNT:
        return {
          type: MapDataType.PROJECT_AMOUNT,
          label: '项目金额',
          unit: '万',
          color: techTheme.colors.success,
        };
      case MapDataType.ALERT_COUNT:
        return {
          type: MapDataType.ALERT_COUNT,
          label: '预警数量',
          unit: '个',
          color: techTheme.colors.danger,
        };
      case MapDataType.ONGOING_PROJECT_AMOUNT:
        return {
          type: MapDataType.ONGOING_PROJECT_AMOUNT,
          label: '在途金额',
          unit: '万',
          color: techTheme.colors.warning,
        };
      case MapDataType.SOLUTION_USAGE:
        return {
          type: MapDataType.SOLUTION_USAGE,
          label: '方案引用',
          unit: '次',
          color: '#4facfe',
        };
      case MapDataType.PRE_SALES_ACTIVITY:
        return {
          type: MapDataType.PRE_SALES_ACTIVITY,
          label: '售前活动',
          unit: '人次',
          color: '#00f2fe',
        };
      case MapDataType.BUDGET:
        return {
          type: MapDataType.BUDGET,
          label: '资金预算',
          unit: '万',
          color: '#fa709a',
        };
      case MapDataType.PROJECT_COUNT_HEATMAP:
        return {
          type: MapDataType.PROJECT_COUNT_HEATMAP,
          label: '项目数',
          unit: '个',
          color: '#fee140',
        };
      case MapDataType.CONTRACT_AMOUNT:
        return {
          type: MapDataType.CONTRACT_AMOUNT,
          label: '中标金额',
          unit: '万',
          color: '#ff6b9d',
        };
      default:
        return {
          type: MapDataType.CUSTOMER_COUNT,
          label: '客户数量',
          unit: '个',
          color: techTheme.colors.primary,
        };
    }
  };

  const config = getCurrentConfig();
  const maxValue = Math.max(...data.map((d) => getCurrentValue(d)), 10);

  const getGeoLayout = () => {
    if (mapType === 'china') {
      return {
        layoutCenter: ['50%', '60%'] as [string, string],
        layoutSize: '150%',
        zoom: 1,
      };
    }

    return {
      layoutCenter: ['50%', '58%'] as [string, string],
      layoutSize: '170%',
      zoom: 1,
    };
  };

  const syncZoomLevel = () => {
    const chart = chartRef.current?.getEchartsInstance();
    const option = chart?.getOption() as { geo?: Array<{ zoom?: number }> } | undefined;
    const nextZoom = option?.geo?.[0]?.zoom;

    if (typeof nextZoom === 'number' && Number.isFinite(nextZoom)) {
      setZoomLevel(Number(nextZoom.toFixed(2)));
    }
  };

  const applyZoomLevel = (nextZoom: number) => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) {
      return;
    }

    const safeZoom = Number(Math.max(0.8, Math.min(8, nextZoom)).toFixed(2));
    chart.setOption({
      geo: {
        zoom: safeZoom,
      },
    });
    setZoomLevel(safeZoom);
  };

  const resetViewport = () => {
    setZoomLevel(1);
    setMapRenderVersion((current) => current + 1);
  };

  // 加载地图数据
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);

        const mapFile = mapType === 'china'
          ? '/china-provinces.geojson'
          : '/zhejiang-cities.geojson';

        console.log(`Loading map: ${mapFile}`);
        const response = await fetch(mapFile);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${mapFile}: ${response.status}`);
        }

        const jsonData = await response.json();
        console.log(`Map data loaded, features: ${jsonData.features?.length}`);

        setGeoJson(jsonData);

        // 注册地图
        echarts.registerMap(mapType, jsonData);
        console.log(`Map registered: ${mapType}`);

        setLoading(false);
        setZoomLevel(1);
      } catch (error) {
        console.error('Failed to load map data:', error);
        setLoading(false);
      }
    };

    loadMapData();
  }, [mapType]);

  // 生成散点数据（圆点）
  const generateScatterData = () => {
    return data.map((item) => {
      const value = getCurrentValue(item);
      const coordinates = getRegionCoordinates(item.name, mapType);

      // 根据高亮模式调整样式
      let itemStyle: any = {
        color: config.color,
        shadowBlur: value / maxValue * 20 + 5,
        shadowColor: config.color,
      };

      // 如果有亮度值，根据亮度调整
      if (highlightMode && regionBrightness[item.name] !== undefined) {
        const brightness = regionBrightness[item.name];
        const opacity = brightness / 100;
        itemStyle = {
          color: config.color,
          opacity: Math.max(0.2, Math.min(1, opacity)),
          shadowBlur: (brightness / 100) * 25 + 5,
          shadowColor: config.color,
        };
      }

      return {
        name: item.name,
        value: [...coordinates, value],
        itemStyle,
        label: {
          show: false,
        },
        regionData: item,
      };
    });
  };

  // 生成预警标记数据
  const generateAlertData = () => {
    return data
      .filter((item) => item.hasCustomerAlert || item.hasProjectAlert)
      .map((item) => {
        const coordinates = getRegionCoordinates(item.name, mapType);
        return {
          name: item.name,
          value: coordinates,
          itemStyle: {
            color: techTheme.colors.danger,
            shadowBlur: 20,
            shadowColor: techTheme.colors.danger,
          },
          label: {
            show: true,
            formatter: '!',
            color: techTheme.colors.danger,
            fontSize: 24,
            fontWeight: 'bold',
            shadowBlur: 10,
            shadowColor: techTheme.colors.danger,
          },
          regionData: item,
        };
      });
  };

  // 获取区域坐标
  const getRegionCoordinates = (name: string, mapType: MapType): [number, number] => {
    const chinaCoords: Record<string, [number, number]> = {
      '北京': [116.4074, 39.9042],
      '上海': [121.4737, 31.2304],
      '浙江': [120.1536, 30.2875],
      '江苏': [118.7674, 32.0416],
      '广东': [113.2644, 23.1291],
      '山东': [117.0009, 36.6758],
      '河南': [113.6654, 34.7579],
      '湖北': [114.2986, 30.5844],
      '四川': [104.0665, 30.5723],
      '福建': [119.2965, 26.0745],
      '湖南': [112.9388, 28.2282],
      '安徽': [117.2272, 31.8206],
      '江西': [115.8922, 28.6765],
      '重庆': [106.5516, 29.5630],
      '陕西': [108.9480, 34.2632],
      '天津': [117.2009, 39.0842],
      '河北': [114.5025, 38.0455],
      '山西': [112.5492, 37.8570],
      '内蒙古': [111.7492, 40.8426],
      '辽宁': [123.4295, 41.7968],
      '吉林': [125.3245, 43.8868],
      '黑龙江': [126.5340, 45.8038],
      '广西': [108.3201, 22.8240],
      '海南': [110.3312, 20.0177],
      '贵州': [106.7135, 26.5783],
      '云南': [102.7123, 25.0406],
      '西藏': [91.1172, 29.6469],
      '甘肃': [103.8236, 36.0581],
      '青海': [101.7782, 36.6171],
      '宁夏': [106.2586, 38.4721],
      '新疆': [87.6168, 43.8256],
    };

    const zhejiangCoords: Record<string, [number, number]> = {
      '杭州市': [120.1551, 30.2741],
      '宁波市': [121.5439, 29.8683],
      '温州市': [120.6994, 27.9943],
      '绍兴市': [120.5800, 30.0293],
      '嘉兴市': [120.7555, 30.7469],
      '金华市': [119.6495, 29.0791],
      '台州市': [121.4208, 28.6563],
      '湖州市': [120.0868, 30.8944],
      '衢州市': [118.8595, 28.9701],
      '丽水市': [119.9218, 28.4519],
      '舟山市': [122.2072, 29.9853],
    };

    return mapType === 'china'
      ? chinaCoords[name] || [116.4074, 39.9042]
      : zhejiangCoords[name] || [120.1551, 30.2741];
  };

  const getOption = () => {
    // 确保地图数据已加载并注册
    // 安全检查：确保 echarts 和相关方法可用
    if (loading || !geoJson) {
      return {
        title: {
          text: loading ? '加载中...' : '地图未加载',
          left: 'center',
          top: 'center',
          textStyle: {
            color: techTheme.text.secondary,
            fontSize: 16,
          },
        },
      };
    }

    // 安全检查地图是否已注册
    try {
      const registeredMap = echarts.getMap?.(mapType);
      if (!registeredMap) {
        console.warn(`Map ${mapType} not registered, attempting to register...`);
        echarts.registerMap(mapType, geoJson);
      }
    } catch (error) {
      console.error('Error checking/ registering map:', error);
      return {
        title: {
          text: '地图加载失败',
          left: 'center',
          top: 'center',
          textStyle: {
            color: techTheme.text.secondary,
            fontSize: 16,
          },
        },
      };
    }

    // 根据高亮模式计算地图样式
    let geoItemStyle: any = {
      areaColor: `${techTheme.colors.primary}08`,
      borderColor: `${techTheme.colors.primary}30`,
      borderWidth: 1.5,
    };

    let geoEmphasis: any = {
      label: {
        show: true,
        color: techTheme.text.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textShadowColor: techTheme.background.card,
        textShadowBlur: 4,
      },
      itemStyle: {
        areaColor: `${config.color}40`,
        borderColor: config.color,
        borderWidth: 3,
        shadowBlur: 25,
        shadowColor: config.color,
      },
    };

    // 如果有高亮模式，修改地图样式
    if (highlightMode && regionBrightness) {
      geoItemStyle.areaColor = `${techTheme.colors.primary}05`;
      geoItemStyle.borderColor = `${techTheme.colors.primary}20`;
    }

    // 生成地图区域数据（用于点亮模式）
    const mapData = data.map((item) => {
      let itemStyle: any = {
        areaColor: geoItemStyle.areaColor,
        borderColor: geoItemStyle.borderColor,
        borderWidth: geoItemStyle.borderWidth,
      };

      // 检查是否需要点亮
      if (highlightMode && highlightRegions.includes(item.name)) {
        itemStyle.areaColor = `${techTheme.colors.danger}40`;
        itemStyle.borderColor = techTheme.colors.danger;
        itemStyle.borderWidth = 3;
        itemStyle.shadowBlur = 20;
        itemStyle.shadowColor = techTheme.colors.danger;
      }

      // 如果有亮度值，根据亮度调整颜色透明度
      if (regionBrightness[item.name] !== undefined) {
        const brightness = regionBrightness[item.name];
        const opacity = brightness / 100;
        itemStyle.areaColor = `${config.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
      }

      return {
        name: item.name,
        itemStyle,
      };
    });

    const geoLayout = getGeoLayout();

    return {
      backgroundColor: 'transparent',
      // 性能优化配置
      animation: true,
      animationThreshold: 8,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      animationDelay: 0,
      animationDurationUpdate: 300,
      animationEasingUpdate: 'cubicOut',
      animationDelayUpdate: 0,
      blendMode: 'source-over',
      hoverLayerThreshold: 3000,
      useUTC: false,
      renderMode: 'auto',
      progressive: 200,
      progressiveThreshold: 3000,
      // 增量渲染
      progressiveChunkMode: 'mod',
      
      title: {
        text: title,
        left: 'left',
        top: 10,
        textStyle: {
          color: techTheme.text.primary,
          fontSize: parseInt(techTheme.font.size.lg),
          fontWeight: techTheme.font.weight.bold,
        },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: `${techTheme.background.card}98`,
        borderColor: config.color,
        borderWidth: 2,
        padding: [18, 20],
        textStyle: {
          color: techTheme.text.primary,
          fontSize: 14,
        },
        extraCssText: 'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 212, 255, 0.15);',
        formatter: (params: any) => {
          const unit = config.unit;
          
          // 处理不同类型的系列
          let value = 0;
          let regionData = null;
          
          if (params.seriesType === 'map') {
            // map 类型：value 是直接数值
            value = params.value ?? 0;
            regionData = params.data?.regionData;
          } else if (params.seriesType === 'scatter' || params.seriesType === 'effectScatter') {
            // scatter 类型：value 是数组 [lon, lat, val]
            value = params.value?.[2] ?? 0;
            regionData = params.data.regionData;
          }
          
          const safeValue = (value === undefined || value === null || isNaN(value)) ? 0 : value;
          
          // 如果没有区域数据，返回简单的显示
          if (!regionData) {
            return `
              <div style="padding: 12px 16px; min-width: 200px; background: rgba(10, 15, 26, 0.98);">
                <div style="color: ${config.color}; font-weight: 700; font-size: 16px; margin-bottom: 8px;">
                  ${params.name}
                </div>
                <div style="color: ${techTheme.text.primary}; font-size: 24px; font-weight: 700;">
                  ${safeValue.toLocaleString()} ${unit}
                </div>
              </div>
            `;
          }

          else {
            const budget = regionData?.budget || 0;
            const contractAmount = regionData?.contractAmount || 0;
            const completionRate = budget > 0 ? ((contractAmount / budget) * 100).toFixed(1) : '0';

            // 计算项目转化率
            const conversionRate = regionData?.projectCount > 0 ? ((regionData.ongoingProjectAmount / regionData.projectAmount) * 100).toFixed(1) : '0';

            return `
          <div style="padding: 18px; min-width: 320px; background: rgba(10, 15, 26, 0.98);">
          <div style="
          color: ${techTheme.text.primary};
          margin-bottom: 14px;
          font-weight: 700;
          font-size: 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid ${config.color};
          display: flex;
          justify-content: space-between;
          align-items: center;
          ">
          <span>${params.name}</span>
          <span style="font-size: 12px; background: ${config.color}30; color: ${config.color}; padding: 4px 10px; border-radius: 4px;">
          ${config.label}
          </span>
          </div>

          <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px;">
          <div style="color: ${config.color}; font-weight: 700; font-size: 32px; text-shadow: 0 0 20px ${config.color};">
          ${safeValue.toLocaleString()}
          </div>
          <div style="color: ${techTheme.text.secondary}; font-size: 15px; font-weight: 500;">
          ${unit}
          </div>
          </div>

          <div style="margin-bottom: 14px;">
          <div style="color: ${techTheme.text.secondary}; font-size: 13px; margin-bottom: 8px; font-weight: 600;">
          👥 客户数据
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
          <div style="color: ${techTheme.text.primary};">
          <span style="color: #00A8CC;">●</span> 总客户数
          <span style="float: right; color: #00A8CC; font-weight: 600;">${regionData?.customerCount || 0}</span>
          </div>
          <div style="color: ${techTheme.text.primary};">
          <span style="color: #CC5577;">●</span> 活跃客户
          <span style="float: right; color: #CC5577; font-weight: 600;">${Math.floor((regionData?.customerCount || 0) * 0.7)}</span>
          </div>
          </div>
          </div>

          <div style="margin-bottom: 14px;">
          <div style="color: ${techTheme.text.secondary}; font-size: 13px; margin-bottom: 8px; font-weight: 600;">
          📊 项目数据
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
          <div style="color: ${techTheme.text.primary};">
          <span style="color: #00CC6A;">●</span> 项目总数
          <span style="float: right; color: #00CC6A; font-weight: 600;">${regionData?.projectCount || 0}</span>
          </div>
          <div style="color: ${techTheme.text.primary};">
          <span style="color: #CCAA00;">●</span> 在途项目
          <span style="float: right; color: #CCAA00; font-weight: 600;">${regionData?.ongoingProjectAmount || 0}万</span>
          </div>
          <div style="color: ${techTheme.text.primary};">
          <span style="color: #8866BB;">●</span> 项目总金额
          <span style="float: right; color: #8866BB; font-weight: 600;">${regionData?.projectAmount || 0}万</span>
          </div>
          <div style="color: ${techTheme.text.primary};">
          <span style="color: #009999;">●</span> 转化率
          <span style="float: right; color: #009999; font-weight: 600;">${conversionRate}%</span>
          </div>
          </div>
          </div>

          <div style="padding: 12px; background: rgba(0, 168, 204, 0.08); border-radius: 8px; border-left: 4px solid ${config.color};">
          <div style="color: ${techTheme.text.secondary}; font-size: 13px; margin-bottom: 8px; font-weight: 600;">
          💰 财务数据
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
          <div style="color: ${techTheme.text.primary};">
          <span>资金预算</span>
          <span style="float: right; color: #00CC6A; font-weight: 600;">${budget}万</span>
          </div>
          <div style="color: ${techTheme.text.primary};">
          <span>已签约</span>
          <span style="float: right; color: #00A8CC; font-weight: 600;">${contractAmount}万</span>
          </div>
          <div style="color: ${techTheme.text.primary}; grid-column: span 2;">
          <span>完成率</span>
          <span style="float: right; color: ${parseFloat(completionRate) >= 80 ? '#00CC6A' : parseFloat(completionRate) >= 50 ? '#CCAA00' : '#CC3333'}; font-weight: 700;">
          ${completionRate}%
          </span>
          </div>
          </div>
          </div>
          </div>
          `;
          }
        },
      },
      // 热力图视觉映射配置
      ...(isHeatmapType(currentDataType) ? [{
        show: true,
        min: 0,
        max: maxValue,
        left: 'right',
        bottom: '5%',
        text: ['高', '低'],
        calculable: true,
        inRange: {
          // 绿 -> 黄 -> 橙 -> 红 渐变
          color: ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
        },
        textStyle: {
          color: techTheme.text.primary,
          fontSize: 12,
        },
        backgroundColor: 'rgba(10, 15, 26, 0.8)',
        borderColor: techTheme.colors.primary,
        borderWidth: 1,
        padding: [5, 10],
      }] : []),
      geo: {
        map: mapType,
        roam: true,
        zoom: geoLayout.zoom,
        layoutCenter: geoLayout.layoutCenter,
        layoutSize: geoLayout.layoutSize,
        label: {
          show: true,
          color: techTheme.text.primary,
          fontSize: 11,
          fontWeight: 500,
          fontFamily: '"JetBrains Mono", monospace',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowBlur: 3,
        },
        itemStyle: geoItemStyle,
        emphasis: geoEmphasis,
        select: {
          label: {
          show: true,
          color: techTheme.text.primary,
          },
          itemStyle: {
          areaColor: `${config.color}20`,
          borderColor: config.color,
          borderWidth: 2.5,
          shadowBlur: 20,
          shadowColor: config.color,
          },
        },
      },
      series: [
        // 地图区域系列（用于处理区域点击和 tooltip）
        {
          name: '地图区域',
          type: 'map',
          geoIndex: 0,
          data: data.map(item => ({
          name: item.name,
          value: getCurrentValue(item),
          regionData: item,
          })),
          emphasis: {
          itemStyle: {
          areaColor: `${config.color}30`,
          borderColor: config.color,
          borderWidth: 2,
          shadowBlur: 15,
          shadowColor: config.color,
          },
          label: {
          show: true,
          color: config.color,
          fontWeight: 'bold',
          },
          },
          select: {
          itemStyle: {
          areaColor: `${config.color}20`,
          borderColor: config.color,
          borderWidth: 2.5,
          shadowBlur: 20,
          shadowColor: config.color,
          },
          label: {
          show: true,
          color: config.color,
          fontWeight: 'bold',
          },
          },
          zlevel: 0,
          silent: false,
        },
        // 散点图（圆点）
        {
          name: '数据分布',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: generateScatterData(),
          symbolSize: (data: any) => {
            const value = data[2];
            // 热力图模式下使用较大的点
            if (isHeatmapType(currentDataType)) {
              return (value / maxValue) * 40 + 20;
            }
            const size = (value / maxValue) * 35 + 12;
            return size;
          },
          showEffectOn: isHeatmapType(currentDataType) ? 'none' : 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 4,
            period: 3,
            number: 2,
          },
          label: {
            show: false,
          },
          // 热力图模式下使用固定颜色，由 visualMap 控制
          itemStyle: isHeatmapType(currentDataType) ? {
            color: '#fff',
          } : undefined,
          zlevel: 1,
          animationDuration: 2000,
          animationEasing: 'cubicOut',
        },
        // 预警标记
        ...(generateAlertData().length > 0
          ? [
          {
          name: '预警',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: generateAlertData(),
          symbolSize: 30,
          showEffectOn: 'render',
          rippleEffect: {
          brushType: 'stroke',
          scale: 4,
          period: 4,
          },
          label: {
          show: true,
          formatter: '!',
          color: techTheme.colors.danger,
          fontSize: 24,
          fontWeight: 'bold',
          shadowBlur: 15,
          shadowColor: techTheme.colors.danger,
          },
          itemStyle: {
          color: 'transparent',
          },
          zlevel: 2,
          animationDuration: 1500,
          animationEasing: 'cubicOut',
          } as const,
          ]
          : []),
      ],
    };
  };

  // 处理点击事件
  const onEvents = {
    click: (params: any) => {
      if (params.data && params.data.regionData) {
        onRegionClick(params.data.regionData);
        
        // 如果是全国视图且点击了省份，触发下钻
        if (mapType === 'china' && onDrillDown) {
          onDrillDown(params.data.regionData.name);
        }
      } else if (params.name) {
        const regionData = data.find(d => d.name === params.name);
        if (regionData) {
          onRegionClick(regionData);
          
          // 如果是全国视图且点击了省份，触发下钻
          if (mapType === 'china' && onDrillDown) {
          onDrillDown(params.name);
          }
        }
      }
    },
    georoam: () => {
      syncZoomLevel();
    },
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          gap: '16px',
        }}
      >
        <div
          style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${techTheme.colors.primary}30`,
          borderTopColor: techTheme.colors.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
          to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: techTheme.text.muted, fontSize: techTheme.font.size.sm }}>
          加载地图数据...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        height: '100%',
        position: 'relative',
        isolation: 'isolate',
        zIndex: 2,
      }}
    >
      {showViewportToolbar ? (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '8px',
              borderRadius: '14px',
              background: 'rgba(5, 12, 24, 0.76)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => applyZoomLevel(zoomLevel + 0.2)}
              title="放大地图"
              style={toolbarButtonStyle}
            >
              放大
            </button>
            <button
              type="button"
              onClick={() => applyZoomLevel(zoomLevel - 0.2)}
              title="缩小地图"
              style={toolbarButtonStyle}
            >
              缩小
            </button>
            <button
              type="button"
              onClick={resetViewport}
              title="还原地图视角"
              style={toolbarButtonStyle}
            >
              还原
            </button>
            {onRequestExpand ? (
              <button
                type="button"
                onClick={onRequestExpand}
                title="放大查看地图"
                style={toolbarButtonStyle}
              >
                详细查看
              </button>
            ) : null}
          </div>

          <div
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              background: 'rgba(5, 12, 24, 0.72)',
              border: '1px solid rgba(0, 212, 255, 0.16)',
              color: 'rgba(232,246,255,0.72)',
              fontSize: '11px',
              pointerEvents: 'none',
            }}
          >
            滚轮缩放 拖动平移 当前 {zoomLevel.toFixed(1)}x
          </div>
        </div>
      ) : null}

      {/* 地图容器 */}
      <div style={{ flex: 1, height }}>
        <ReactECharts
          key={`${mapType}-${mapRenderVersion}`} // 使用key强制重新创建组件
          ref={chartRef}
          option={getOption()}
          style={{ height, width: '100%' }}
          onEvents={onEvents}
          notMerge={true}
          lazyUpdate={true}
          showLoading={loading}
          loadingOption={{
          text: '加载中...',
          color: techTheme.colors.primary,
          textColor: techTheme.text.primary,
          maskColor: 'rgba(10, 15, 26, 0.8)',
          zlevel: 0,
          }}
        />
      </div>

      {/* 固定在右侧的详情面板 */}
      {showDetailPanel && selectedRegion && (
        <div
          style={{
          width: '280px',
          backgroundColor: `${techTheme.background.card}95`,
          border: `2px solid ${config.color}`,
          borderRadius: '12px',
          padding: '16px',
          boxShadow: `0 0 40px ${config.color}40`,
          backdropFilter: 'blur(10px)',
          overflowY: 'auto',
          maxHeight: height,
          }}
        >
          {/* 关闭按钮 */}
          <div
          style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${techTheme.border.color}`,
          }}
          >
          <h4
          style={{
          color: techTheme.text.primary,
          fontSize: techTheme.font.size.md,
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          {selectedRegion.name}
          </h4>
          {onCloseDetail && (
          <button
          onClick={onCloseDetail}
          style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'transparent',
          border: `1px solid ${techTheme.border.color}`,
          color: techTheme.text.muted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          transition: `all ${techTheme.animation.duration.fast}`,
          }}
          onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `${techTheme.colors.danger}30`;
          e.currentTarget.style.borderColor = techTheme.colors.danger;
          e.currentTarget.style.color = techTheme.colors.danger;
          }}
          onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = techTheme.border.color;
          e.currentTarget.style.color = techTheme.text.muted;
          }}
          >
          ×
          </button>
          )}
          </div>

          {/* 数据项 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 客户数 */}
          <div
          style={{
          padding: '12px',
          backgroundColor: `${techTheme.colors.primary}15`,
          border: `1px solid ${techTheme.colors.primary}40`,
          borderRadius: '8px',
          }}
          >
          <div
          style={{
          color: techTheme.text.secondary,
          fontSize: techTheme.font.size.xs,
          marginBottom: '4px',
          }}
          >
          客户数量
          </div>
          <div
          style={{
          color: techTheme.colors.primary,
          fontSize: techTheme.font.size.lg,
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          {selectedRegion.customerCount} 个
          </div>
          </div>

          {/* 项目数 */}
          <div
          style={{
          padding: '12px',
          backgroundColor: `${techTheme.colors.secondary}15`,
          border: `1px solid ${techTheme.colors.secondary}40`,
          borderRadius: '8px',
          }}
          >
          <div
          style={{
          color: techTheme.text.secondary,
          fontSize: techTheme.font.size.xs,
          marginBottom: '4px',
          }}
          >
          项目数量
          </div>
          <div
          style={{
          color: techTheme.colors.secondary,
          fontSize: techTheme.font.size.lg,
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          {selectedRegion.projectCount} 个
          </div>
          </div>

          {/* 项目金额 */}
          <div
          style={{
          padding: '12px',
          backgroundColor: `${techTheme.colors.success}15`,
          border: `1px solid ${techTheme.colors.success}40`,
          borderRadius: '8px',
          }}
          >
          <div
          style={{
          color: techTheme.text.secondary,
          fontSize: techTheme.font.size.xs,
          marginBottom: '4px',
          }}
          >
          项目金额
          </div>
          <div
          style={{
          color: techTheme.colors.success,
          fontSize: techTheme.font.size.lg,
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          {selectedRegion.projectAmount} 万
          </div>
          </div>

          {/* 在途项目金额 */}
          <div
          style={{
          padding: '12px',
          backgroundColor: `${techTheme.colors.warning}15`,
          border: `1px solid ${techTheme.colors.warning}40`,
          borderRadius: '8px',
          }}
          >
          <div
          style={{
          color: techTheme.text.secondary,
          fontSize: techTheme.font.size.xs,
          marginBottom: '4px',
          }}
          >
          在途项目金额
          </div>
          <div
          style={{
          color: techTheme.colors.warning,
          fontSize: techTheme.font.size.lg,
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          {selectedRegion.ongoingProjectAmount} 万
          </div>
          </div>

          {/* 预警信息 */}
          {(selectedRegion.hasCustomerAlert || selectedRegion.hasProjectAlert || selectedRegion.hasUserAlert) && selectedRegion.alertInfo && (
          <div
          style={{
          padding: '12px',
          backgroundColor: `${techTheme.colors.danger}15`,
          border: `1px solid ${techTheme.colors.danger}40`,
          borderRadius: '8px',
          }}
          >
          <div
          style={{
          color: techTheme.colors.danger,
          fontSize: techTheme.font.size.xs,
          marginBottom: '8px',
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          预警信息 ({selectedRegion.alertInfo?.length || 0})
          </div>
          {selectedRegion.alertInfo?.map((alert, index) => {
          const alertColor = alert.level === 'high' ? techTheme.colors.danger : techTheme.colors.warning;
          return (
          <div
          key={index}
          style={{
          padding: '8px',
          backgroundColor: `${alertColor}15`,
          borderRadius: '4px',
          marginBottom: index < (selectedRegion.alertInfo?.length! - 1) ? '8px' : '0',
          fontSize: techTheme.font.size.xs,
          }}
          >
          <div
          style={{
          color: techTheme.text.primary,
          marginBottom: '4px',
          fontWeight: techTheme.font.weight.medium,
          }}
          >
          {alert.message}
          </div>
          <div
          style={{
          color: alertColor,
          fontWeight: techTheme.font.weight.bold,
          }}
          >
          {alert.level === 'high' ? '严重' : '重要'} · {alert.type === 'customer' ? '客户' : alert.type === 'user' ? '用户' : '项目'}预警
          </div>
          </div>
          );
          })}
          </div>
          )}

          {/* 无预警提示 */}
          {!selectedRegion.hasCustomerAlert && !selectedRegion.hasProjectAlert && !selectedRegion.hasUserAlert && (
          <div
          style={{
          padding: '16px',
          textAlign: 'center',
          color: techTheme.text.muted,
          fontSize: techTheme.font.size.xs,
          border: `1px dashed ${techTheme.border.color}`,
          borderRadius: '8px',
          }}
          >
          暂无预警信息
          </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.04)',
  color: '#E8F6FF',
  borderRadius: '10px',
  padding: '7px 10px',
  fontSize: '11px',
  cursor: 'pointer',
  minWidth: '64px',
};

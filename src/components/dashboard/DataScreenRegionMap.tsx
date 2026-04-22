'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { DS_COLORS, DsPanel, DsSkeleton } from './DataScreenShell';
import type { RegionViewData } from '@/types/data-screen';

interface Props {
  data: RegionViewData | null;
  selectedRegion: string | null;
  onRegionChange: (region: string | null) => void;
}

type MapMode    = 'count' | 'customers' | 'opportunity';

const MODE_LABELS: Record<MapMode, string> = {
  count:       '项目数',
  customers:   '客户数',
  opportunity: '商机金额',
};

/** drillLevel: 'nation' | 'zhejiang' | 'province-{name}' */
const PROVINCE_ADCODES: Record<string, string> = {
  '北京': '110000', '天津': '120000', '河北': '130000', '山西': '140000',
  '内蒙古': '150000', '辽宁': '210000', '吉林': '220000', '黑龙江': '230000',
  '上海': '310000', '江苏': '320000', '安徽': '340000', '福建': '350000',
  '江西': '360000', '山东': '370000', '河南': '410000', '湖北': '420000',
  '湖南': '430000', '广东': '440000', '广西': '450000', '海南': '460000',
  '重庆': '500000', '四川': '510000', '贵州': '520000', '云南': '530000',
  '西藏': '540000', '陕西': '610000', '甘肃': '620000', '青海': '630000',
  '宁夏': '640000', '新疆': '650000',
};

function getGeoFile(level: string): string {
  if (level === 'nation')   return '/china-provinces.geojson';
  if (level === 'zhejiang') return '/geojson/provinces/330000.geojson';
  if (level.startsWith('province-')) {
    const name   = level.slice(9);
    const adcode = PROVINCE_ADCODES[name];
    // Use locally bundled GeoJSON (public/geojson/provinces/{adcode}.geojson)
    if (adcode) return `/geojson/provinces/${adcode}.geojson`;
  }
  return '/china-provinces.geojson';
}

function getGeoName(level: string): string {
  if (level === 'nation')   return 'china';
  if (level === 'zhejiang') return 'zhejiang-cities';
  if (level.startsWith('province-')) return level;
  return 'china';
}

/** Compute bounding-box centroid from a GeoJSON feature */
function featureCentroid(feature: { geometry: { type: string; coordinates: unknown } }): [number, number] | null {
  try {
    const geom = feature.geometry;
    const rings: number[][] = [];
    if (geom.type === 'Polygon') {
      rings.push(...(geom.coordinates as number[][][])[0]);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of (geom.coordinates as number[][][][])) rings.push(...poly[0]);
    }
    if (rings.length === 0) return null;
    const lons = rings.map(c => c[0]);
    const lats = rings.map(c => c[1]);
    return [
      (Math.min(...lons) + Math.max(...lons)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ];
  } catch {
    return null;
  }
}

export function DataScreenRegionMap({ data, selectedRegion, onRegionChange }: Props) {
  const ref                         = useRef<HTMLDivElement>(null);
  const [mode, setMode]             = useState<MapMode>('count');
  const [drillLevel, setDrillLevel] = useState<string>('nation');
  const chartRef                    = useRef<echarts.ECharts | null>(null);

  function drillBack() {
    setDrillLevel('nation');
    onRegionChange(null);
  }

  useEffect(() => {
    if (!ref.current) return;

    let chart = echarts.getInstanceByDom(ref.current);
    if (!chart) chart = echarts.init(ref.current, 'dark');
    chart.getDom().style.background = 'transparent';

    const regionData = data?.regionMap ?? [];
    const geoName    = getGeoName(drillLevel);
    const animated   = drillLevel !== 'nation'; // animate on drill-down

    const mapData = regionData.map(d => {
      let value: number;
      if (mode === 'count')            value = Number(d.projectCount)      || 0;
      else if (mode === 'customers')   value = Number(d.customerCount)     || 0;
      else                             value = Number(d.opportunityAmount) || 0;
      return {
        name:     d.region,
        value,
        selected: d.region === selectedRegion,
      };
    });

    // Rich HTML tooltip card
    function tooltipFormatter(p: { name?: string }) {
      const name = p.name ?? '';
      const rd   = regionData.find(
        r => r.region === name ||
             name.includes(r.region ?? '') ||
             (r.region ?? '').includes(name),
      );
      if (!rd) return `<div style="padding:8px 10px;font-size:12px;color:${DS_COLORS.text}"><b>${name}</b><br/><span style="color:${DS_COLORS.muted}">暂无数据</span></div>`;
      const winPct  = rd.opportunityAmount > 0 ? Math.round((rd.wonAmount / rd.opportunityAmount) * 100) : 0;
      const winRate = rd.opportunityAmount > 0 ? winPct + '%' : '—';
      const barW    = Math.min(100, winPct);
      const row = (label: string, val: string, color?: string) =>
        `<tr><td style="color:${DS_COLORS.muted};padding-right:10px;padding-bottom:2px">${label}</td>` +
        `<td style="font-weight:700;color:${color ?? DS_COLORS.text}">${val}</td></tr>`;
      return (
        `<div style="min-width:175px;padding:8px 10px;font-family:inherit">` +
        `<div style="font-size:13px;font-weight:700;color:${DS_COLORS.primary};padding-bottom:5px;margin-bottom:7px;border-bottom:1px solid ${DS_COLORS.border}">${name}</div>` +
        (rd.subsidiaryName ? `<div style="font-size:11px;color:${DS_COLORS.muted};margin-bottom:5px">管辖: <b style="color:${DS_COLORS.text}">${rd.subsidiaryName}</b></div>` : '') +
        `<table style="font-size:11px;border-collapse:collapse;width:100%">` +
        row('项目数', String(rd.projectCount), DS_COLORS.primary) +
        row('客户数', String(rd.customerCount)) +
        row('商机金额', rd.opportunityAmount.toFixed(0) + ' 万', DS_COLORS.warning) +
        row('中标金额', rd.wonAmount.toFixed(0) + ' 万', DS_COLORS.success) +
        `<tr><td style="color:${DS_COLORS.muted};padding-right:10px;padding-bottom:2px">中标率</td><td>` +
        `<span style="display:inline-block;width:50px;height:5px;background:rgba(0,212,255,0.15);border-radius:3px;vertical-align:middle;margin-right:5px">` +
        `<span style="display:inline-block;width:${barW}%;height:5px;background:${DS_COLORS.success};border-radius:3px"></span></span>` +
        `<b style="color:${DS_COLORS.success}">${winRate}</b></td></tr>` +
        row('售前工时', rd.presalesHours + ' h') +
        `</table>` +
        `<div style="margin-top:7px;font-size:10px;color:${DS_COLORS.muted};text-align:right">双击下钻省级 · 单击筛选 →</div>` +
        `</div>`
      );
    }

    function render(geoMap: NonNullable<ReturnType<typeof echarts.getMap>> | null) {
      if (!chart) return;

      const isDrilled = drillLevel !== 'nation';

      // Find current province summary (used when drilled)
      let provRd: typeof regionData[0] | undefined;
      if (isDrilled) {
        const shortName = drillLevel === 'zhejiang' ? '浙江'
          : drillLevel.startsWith('province-') ? drillLevel.slice(9) : '';
        provRd = regionData.find(r =>
          r.region === shortName ||
          r.region === shortName + '省' ||
          r.region === shortName + '市' ||
          (r.region ?? '').startsWith(shortName),
        );
      }

      // Build effectScatter centroids from GeoJSON features
      const scatterData: [number, number, number][] = [];
      if (geoMap) {
        const features = (geoMap as unknown as { geoJSON?: { features?: unknown[] } }).geoJSON?.features ?? [];
        for (const feat of features) {
          const f  = feat as { properties?: { name?: string }; geometry: { type: string; coordinates: unknown } };
          const rn = f.properties?.name ?? '';
          const rd = regionData.find(
            r => r.region === rn ||
                 rn.includes(r.region ?? '') ||
                 (r.region ?? '').includes(rn),
          );
          if (!rd || rd.projectCount === 0) continue;
          const pt = featureCentroid(f);
          if (pt) scatterData.push([pt[0], pt[1], rd.projectCount]);
        }
      }

      // Log-scale transform: sparse provinces stay visible
      // When drilled, remap entries to GeoJSON feature names so ECharts choropleth matches correctly
      const logData = (isDrilled && geoMap)
        ? (() => {
            const features = (geoMap as unknown as { geoJSON?: { features?: unknown[] } }).geoJSON?.features ?? [];
            return features.map(feat => {
              const f  = feat as { properties?: { name?: string } };
              const rn = f.properties?.name ?? '';
              const rd = regionData.find(r =>
                r.region === rn || rn.includes(r.region ?? '') || (r.region ?? '').includes(rn));
              const raw = rd
                ? (mode === 'count' ? Number(rd.projectCount)
                  : mode === 'customers' ? Number(rd.customerCount)
                  : Number(rd.opportunityAmount)) || 0
                : 0;
              return { name: rn, value: Math.log1p(raw), selected: false };
            });
          })()
        : mapData.map(d => ({ ...d, value: Math.log1p(Number(d.value)) }));
      const logMax = Math.max(...logData.map(d => Number(d.value)), 0.001);

      // Flight lines: HQ (Hangzhou) → top-8 cities/provinces with projects
      const HQ: [number, number] = [120.153, 30.287];
      const topScatter  = [...scatterData].sort((a, b) => b[2] - a[2]).slice(0, 8);
      const linesData   = topScatter.map(s => ({ coords: [HQ, [s[0], s[1]] as [number, number]] }));

      // Top-3 get golden highlight
      const top3Keys    = new Set(topScatter.slice(0, 3).map(s => `${s[0].toFixed(2)},${s[1].toFixed(2)}`));
      const scatterItems = scatterData
        .filter(s => s[2] >= 1)
        .map(s => ({
          value: s,
          itemStyle: { color: top3Keys.has(`${s[0].toFixed(2)},${s[1].toFixed(2)}`) ? DS_COLORS.warning : DS_COLORS.success },
        }));

      // Province aggregate graphic overlay (shown when drilled)
      const graphicElements: object[] = isDrilled && provRd ? [
        {
          type: 'group', top: 60, right: 20, bounding: 'raw',
          children: [
            { type: 'rect', shape: { x: 0, y: 0, width: 158, height: 128, r: [4] },
              style: { fill: 'rgba(10,20,40,0.90)', stroke: DS_COLORS.border, lineWidth: 1 } },
            { type: 'text', style: { text: provRd.region ?? '', x: 10, y: 14,
              fill: DS_COLORS.primary, fontSize: 13, fontWeight: 'bold' } },
            { type: 'text', style: { text: `项目数    ${provRd.projectCount}`, x: 10, y: 38,
              fill: DS_COLORS.primary, fontSize: 11 } },
            { type: 'text', style: { text: `客户数    ${provRd.customerCount}`, x: 10, y: 57,
              fill: DS_COLORS.text, fontSize: 11 } },
            { type: 'text', style: { text: `商机金额  ${Number(provRd.opportunityAmount).toFixed(0)} 万`, x: 10, y: 76,
              fill: DS_COLORS.warning, fontSize: 11 } },
            { type: 'text', style: { text: `中标金额  ${Number(provRd.wonAmount).toFixed(0)} 万`, x: 10, y: 95,
              fill: DS_COLORS.success, fontSize: 11 } },
            { type: 'text', style: { text: `售前工时  ${provRd.presalesHours} h`, x: 10, y: 114,
              fill: DS_COLORS.muted, fontSize: 11 } },
          ],
        },
      ] : [];

      chart.setOption({
        animation: true,
        animationType: animated ? 'scale' : 'expansion',
        animationDuration: animated ? 500 : 800,
        animationDelay:    animated ? (idx: number) => idx * 25 : 0,
        animationEasing:   'cubicOut',
        backgroundColor: 'transparent',
        geo: [{
          map: geoName,
          roam: true,
          silent: false,
          zlevel: 0,
          itemStyle: {
            areaColor: '#0d2a45',
            borderColor: 'rgba(0,212,255,0.25)',
            borderWidth: 0.6,
          },
          emphasis: {
            itemStyle: { areaColor: DS_COLORS.accent + '55' },
          },
        }],
        tooltip: {
          trigger: 'item',
          formatter: tooltipFormatter,
          backgroundColor: 'rgba(10,20,40,0.92)',
          borderColor: DS_COLORS.border,
          borderWidth: 1,
          padding: 0,
          textStyle: { color: DS_COLORS.text, fontSize: 11 },
          extraCssText: 'border-radius:6px;box-shadow:0 4px 24px rgba(0,0,0,0.6)',
        },
        graphic: graphicElements,
        visualMap: {
          show: true,
          min: 0,
          max: logMax,
          left: 'left',
          top: 'bottom',
          text: ['多', '少'],
          splitNumber: 5,
          calculable: false,
          inRange: { color: ['#0a2a4a', '#0d4f80', '#1077b0', '#00aadd', '#00d4ff'] },
          textStyle: { color: DS_COLORS.muted, fontSize: 9 },
        },
        series: [
          {
            type: 'map',
            map: geoName,
            name: MODE_LABELS[mode],
            geoIndex: 0,
            roam: false,
            selectedMode: 'single',
            data: logData,
            emphasis: {
              label: { show: true, fontSize: 11, color: DS_COLORS.text, fontWeight: 600 },
              itemStyle: { areaColor: DS_COLORS.accent + '99', borderColor: DS_COLORS.accent, borderWidth: 1.5 },
            },
            itemStyle: {
              borderColor: 'rgba(0,212,255,0.3)',
              borderWidth: 0.8,
            },
            select: {
              itemStyle: { areaColor: DS_COLORS.warning + 'cc' },
              label: { show: true, fontSize: 11, color: '#000', fontWeight: 700 },
            },
          },
          {
            type: 'lines',
            coordinateSystem: 'geo',
            geoIndex: 0,
            data: linesData,
            zlevel: 2,
            silent: true,
            polyline: false,
            lineStyle: { color: DS_COLORS.primary, opacity: 0.3, width: 1, curveness: 0.3 },
            effect: { show: true, period: 5, symbol: 'arrow', symbolSize: 4, color: DS_COLORS.primary, opacity: 0.65 },
          },
          {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            geoIndex: 0,
            data: scatterItems,
            zlevel: 3,
            silent: true,
            symbolSize: (val: number[]) => Math.min(26, 5 + Math.sqrt(Number(val[2])) * 2.8),
            showEffectOn: 'render',
            rippleEffect: { brushType: 'stroke', scale: 5, period: 4 },
            label: { show: false },
          },
        ],
      }, { notMerge: true });
    }

    const existingMap = echarts.getMap(geoName);
    if (existingMap) {
      render(existingMap);
    } else {
      fetch(getGeoFile(drillLevel))
        .then(r => r.json())
        .then(geo => {
          echarts.registerMap(geoName, geo);
          render(echarts.getMap(geoName));
        })
        .catch(() => render(null));
    }

    // Click / double-click detection via timestamps.
    // ECharts dblclick is unreliable when React re-renders dispose the chart
    // between the two clicks. Instead we track timestamps in the single click
    // handler — two clicks on the same area within 350 ms = double-click.
    // Double-click = map drill-down only (NOT a data filter, so no onRegionChange).
    let clickTimer: ReturnType<typeof setTimeout> | null = null;
    let lastClickTime = 0;
    let lastClickName = '';

    chart.off('click');
    chart.on('click', (p: { name?: string }) => {
      const name = p.name ?? '';
      if (!name) return;

      const now = Date.now();
      const isDblClick = now - lastClickTime < 350 && lastClickName === name;
      lastClickTime = now;
      lastClickName = name;

      if (isDblClick) {
        // Cancel any pending single-click action
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        // Drill down / back — does NOT call onRegionChange (map zoom, not data filter)
        if (drillLevel !== 'nation') {
          drillBack();
        } else {
          // GeoJSON names include suffix (浙江省/天津市/内蒙古自治区); strip it
          const shortName = name
            .replace(/维吾尔自治区$|壮族自治区$|回族自治区$|自治区$|省$|市$/, '')
            .trim();
          if (shortName === '浙江') {
            setDrillLevel('zhejiang');
          } else if (PROVINCE_ADCODES[shortName]) {
            setDrillLevel('province-' + shortName);
          }
        }
        return;
      }

      // Single click: debounce so a quick second click can cancel it
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickTimer = null;
        // Strip province suffix so it matches DB region values (e.g. "浙江省" → "浙江")
        const regionCode = name
          .replace(/维吾尔自治区$|壮族自治区$|回族自治区$|自治区$|省$|市$/, '')
          .trim();
        onRegionChange(regionCode === selectedRegion ? null : regionCode);
      }, 280);
    });

    chart.off('dblclick'); // no-op; detection is handled above via timestamps
    chartRef.current = chart;

    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => chart?.resize());
    });
    ro.observe(ref.current!);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
      if (clickTimer) clearTimeout(clickTimer);
      chart?.dispose();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode, selectedRegion, onRegionChange, drillLevel]);

  const modeKeys = Object.keys(MODE_LABELS) as MapMode[];

  return (
    <DsPanel
      title="区域地图"
      titleRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(drillLevel === 'zhejiang' || drillLevel.startsWith('province-')) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
              <span
                style={{ color: DS_COLORS.muted, cursor: 'pointer' }}
                onClick={drillBack}
              >全国</span>
              <span style={{ color: DS_COLORS.muted }}>›</span>
              <span style={{ color: DS_COLORS.warning, fontWeight: 600 }}>
                {drillLevel === 'zhejiang' ? '浙江' : drillLevel.slice(9)}
              </span>
              <button
                onClick={drillBack}
                style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  marginLeft: 2,
                  border: '1px solid ' + DS_COLORS.border,
                  borderRadius: 3,
                  background: 'transparent',
                  color: DS_COLORS.muted,
                  cursor: 'pointer',
                }}
              >
                ↩ 返回
              </button>
            </span>
          )}
          {drillLevel === 'nation' && selectedRegion && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
              <span style={{ color: DS_COLORS.muted }}>全国</span>
              <span style={{ color: DS_COLORS.muted }}>›</span>
              <span style={{ color: DS_COLORS.warning, fontWeight: 600 }}>{selectedRegion}</span>
            </span>
          )}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              onClick={() => chartRef.current?.setOption({ geo: [{ zoom: 1, center: undefined }] })}
              title="重置地图视角"
              style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, border: '1px solid ' + DS_COLORS.border, background: 'transparent', color: DS_COLORS.muted, cursor: 'pointer' }}
            >复位</button>
            {modeKeys.map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  fontSize: 9,
                  padding: '1px 6px',
                  borderRadius: 3,
                  border: '1px solid ' + (mode === m ? DS_COLORS.primary : DS_COLORS.border),
                  background: mode === m ? DS_COLORS.primary + '33' : 'transparent',
                  color: mode === m ? DS_COLORS.primary : DS_COLORS.muted,
                  cursor: 'pointer',
                }}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {!data ? <DsSkeleton /> : <div ref={ref} style={{ width: '100%', height: '100%' }} />}
    </DsPanel>
  );
}
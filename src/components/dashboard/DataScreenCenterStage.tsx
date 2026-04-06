'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { HeavyModulePlaceholder } from '@/components/dashboard/DataScreenChrome';
import { MapDataType, MapRegionData } from '@/lib/map-types';

const LazyTechMapChart = dynamic(
  () => import('@/components/dashboard/TechMapChart').then((module) => ({ default: module.TechMapChart })),
  {
    ssr: false,
    loading: () => <HeavyModulePlaceholder title="地图载入中" subtitle="正在准备区域热力与下钻视图" />,
  }
);

const LazyRegionDetailPanel = dynamic(
  () => import('@/components/dashboard/DataPanels').then((module) => ({ default: module.RegionDetailPanel })),
  {
    ssr: false,
  }
);

interface DataScreenCenterStageProps {
  currentMapType: 'province-outside' | 'zhejiang';
  currentMapData: MapRegionData[];
  currentDataType: MapDataType;
  showMapPlaceholder: boolean;
  onDrillDown: (regionName: string) => void;
}

export function DataScreenCenterStage({
  currentMapType,
  currentMapData,
  currentDataType,
  showMapPlaceholder,
  onDrillDown,
}: DataScreenCenterStageProps) {
  const [selectedRegion, setSelectedRegion] = useState<MapRegionData | null>(null);

  useEffect(() => {
    setSelectedRegion(null);
  }, [currentMapType]);

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {showMapPlaceholder ? (
        <HeavyModulePlaceholder title="地图载入中" subtitle="正在按需初始化热力图与区域联动" />
      ) : (
        <LazyTechMapChart
          key={currentMapType}
          mapType={currentMapType === 'province-outside' ? 'china' : 'zhejiang'}
          title=""
          data={currentMapData}
          currentDataType={currentDataType}
          onRegionClick={setSelectedRegion}
          onDrillDown={(regionName) => {
            setSelectedRegion(null);
            onDrillDown(regionName);
          }}
          height="100%"
          showDetailPanel={false}
          selectedRegion={null}
          onCloseDetail={() => {}}
          highlightMode={null}
          highlightRegions={[]}
          regionBrightness={{}}
        />
      )}

      {selectedRegion && <LazyRegionDetailPanel regionData={selectedRegion} onClose={() => setSelectedRegion(null)} />}
    </div>
  );
}
import type { HeatmapRegionData } from '@/hooks/use-data-screen-optimized';
import { PROVINCES, ZHEJIANG_CITIES } from '@/lib/data-screen-utils';
import { MapDataType, MapRegionData } from '@/lib/map-types';

export type DataScreenMapType = 'province-outside' | 'zhejiang';
export type DataScreenHeatmapMode = 'customer' | 'project' | 'budget' | 'contract' | 'activity' | 'solution';

export function convertToMapRegionData(regions: HeatmapRegionData[]): MapRegionData[] {
  return regions.map((region) => ({
    name: region.name,
    customerCount: region.customerCount,
    projectCount: region.projectCount,
    projectAmount: region.projectAmount,
    ongoingProjectAmount: region.ongoingProjectAmount,
    hasCustomerAlert: region.hasCustomerAlert,
    hasProjectAlert: region.hasProjectAlert,
    hasUserAlert: region.hasUserAlert,
    solutionUsage: region.solutionUsage,
    preSalesActivity: region.preSalesActivity,
    budget: region.budget,
    contractAmount: region.contractAmount,
  }));
}

export function getDefaultProvinceData(): MapRegionData[] {
  return PROVINCES.map(createEmptyRegionData);
}

export function getZhejiangMapData(): MapRegionData[] {
  return ZHEJIANG_CITIES.map(createEmptyRegionData);
}

export function getCurrentMapData(currentMapType: DataScreenMapType, heatmapRegionData: MapRegionData[]): MapRegionData[] {
  if (currentMapType === 'province-outside') {
    return heatmapRegionData.length > 0 ? heatmapRegionData : getDefaultProvinceData();
  }

  return heatmapRegionData.length > 0 ? mergeZhejiangRegionData(heatmapRegionData) : getZhejiangMapData();
}

export function getMapDataTypeByHeatmapMode(heatmapMode: DataScreenHeatmapMode): MapDataType {
  switch (heatmapMode) {
    case 'customer':
      return MapDataType.CUSTOMER_COUNT_HEATMAP;
    case 'project':
      return MapDataType.PROJECT_COUNT_HEATMAP;
    case 'budget':
      return MapDataType.BUDGET;
    case 'contract':
      return MapDataType.CONTRACT_AMOUNT;
    case 'activity':
      return MapDataType.PRE_SALES_ACTIVITY;
    case 'solution':
      return MapDataType.SOLUTION_USAGE;
    default:
      return MapDataType.CUSTOMER_COUNT_HEATMAP;
  }
}

function createEmptyRegionData(name: string): MapRegionData {
  return {
    name,
    customerCount: 0,
    projectCount: 0,
    projectAmount: 0,
    ongoingProjectAmount: 0,
    solutionUsage: 0,
    preSalesActivity: 0,
    budget: 0,
    contractAmount: 0,
  };
}

function normalizeRegionName(name: string) {
  return name.replace(/省|市/g, '').trim();
}

function mergeZhejiangRegionData(regions: MapRegionData[]): MapRegionData[] {
  const regionMap = new Map(regions.map((region) => [normalizeRegionName(region.name), region]));

  return ZHEJIANG_CITIES.map((city) => {
    const matchedRegion = regionMap.get(normalizeRegionName(city));
    if (!matchedRegion) {
      return createEmptyRegionData(city);
    }

    return {
      ...createEmptyRegionData(city),
      ...matchedRegion,
      name: city,
    };
  });
}
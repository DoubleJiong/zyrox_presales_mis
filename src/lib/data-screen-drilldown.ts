export type DataScreenDrilldownObjectType = 'region' | 'personnel-item' | 'project' | 'customer' | 'solution' | 'risk';

export interface DataScreenDrilldownAction {
  label: string;
  href: string;
}

export interface DataScreenDrilldownBadge {
  label: string;
  accentColor?: string;
  backgroundColor?: string;
}
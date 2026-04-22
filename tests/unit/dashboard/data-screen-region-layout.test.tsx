// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock next/navigation (useRouter used in DataScreenProjectCarousel)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/data-screen',
}));

// Stub out ECharts-heavy child components so jsdom doesn't need canvas
vi.mock('@/components/dashboard/DataScreenLeftCharts', () => ({
  DataScreenLeftCharts: () => <div data-testid="mock-left-charts" />,
}));
vi.mock('@/components/dashboard/DataScreenFunnelChart', () => ({
  DataScreenFunnelChart: () => <div data-testid="mock-funnel" />,
}));
vi.mock('@/components/dashboard/DataScreenSubsidiaryChart', () => ({
  DataScreenSubsidiaryChart: () => <div data-testid="mock-subsidiary" />,
}));
vi.mock('@/components/dashboard/DataScreenBottomCharts', () => ({
  DataScreenBottomCharts: () => <div data-testid="mock-bottom-charts" />,
}));
vi.mock('@/components/dashboard/DataScreenRegionMap', () => ({
  DataScreenRegionMap: () => <div data-testid="mock-region-map" />,
}));
vi.mock('@/components/dashboard/DataScreenKPIBar', () => ({
  DataScreenKPIBar: () => <div data-testid="mock-kpi-bar" />,
}));
vi.mock('@/components/dashboard/DataScreenProjectCarousel', () => ({
  DataScreenProjectCarousel: () => <div data-testid="mock-carousel" />,
}));

// Mock the data hook so no real API call is made
vi.mock('@/components/dashboard/DataScreenShell', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/dashboard/DataScreenShell')>();
  return {
    ...mod,
    useRegionViewData: () => ({ data: null, loading: false, error: null }),
  };
});

import { DataScreenRegionLayout } from '@/components/dashboard/DataScreenRegionLayout';

describe('DataScreenRegionLayout', () => {
  it('renders region view shell with tab bar, KPI bar, map stage, and bottom charts', () => {
    render(<DataScreenRegionLayout />);

    expect(screen.getByTestId('data-screen-region-layout')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-kpi-bar')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-region-map-stage')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-bottom-charts')).toBeInTheDocument();

    // Tab bar
    expect(screen.getByText('区域视图')).toBeInTheDocument();
    expect(screen.getByText('人员视图')).toBeInTheDocument();
    expect(screen.getByText('解决方案视图')).toBeInTheDocument();

    // Disabled tabs have tooltip
    const personTab = screen.getByText('人员视图').closest('div');
    expect(personTab).toHaveAttribute('title', '即将上线');
  });
});
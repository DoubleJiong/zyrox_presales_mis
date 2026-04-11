// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataScreenTopicProjectRiskDrawer } from '@/components/dashboard/DataScreenTopicProjectRiskDrawer';

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DrawerDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
  DrawerHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DrawerTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
}));

describe('DataScreenTopicProjectRiskDrawer', () => {
  it('renders the lightweight project risk topic drawer', () => {
    render(
      <DataScreenTopicProjectRiskDrawer
        project={{ projectId: 23, projectName: '智算中心建设', region: '杭州', stage: 'execution', riskLevel: 'high', score: 87, amount: 1200000, winProbability: 68, reason: '招标窗口收紧' }}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('data-screen-topic-project-risk-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('data-screen-topic-project-risk-title')).toHaveTextContent('智算中心建设 风险专题下钻');
    expect(screen.getByText('风险原因')).toBeInTheDocument();
    expect(screen.getByText('风险指标')).toBeInTheDocument();
    expect(screen.getByText('查看项目详情')).toBeInTheDocument();
  });
});
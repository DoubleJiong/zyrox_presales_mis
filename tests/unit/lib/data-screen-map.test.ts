import { describe, expect, it } from 'vitest';
import { getCurrentMapData } from '../../../src/lib/data-screen-map';

describe('data-screen map helpers', () => {
  it('keeps fetched Zhejiang city data instead of falling back to zero placeholders', () => {
    const data = getCurrentMapData('zhejiang', [
      {
        name: '杭州',
        customerCount: 5,
        projectCount: 3,
        projectAmount: 120,
        ongoingProjectAmount: 70,
        solutionUsage: 2,
        preSalesActivity: 4,
        budget: 120,
        contractAmount: 66,
      },
    ]);

    const hangzhou = data.find((item) => item.name === '杭州市');
    const ningbo = data.find((item) => item.name === '宁波市');

    expect(hangzhou).toMatchObject({
      name: '杭州市',
      customerCount: 5,
      projectCount: 3,
      projectAmount: 120,
      contractAmount: 66,
    });
    expect(ningbo).toMatchObject({
      name: '宁波市',
      customerCount: 0,
      projectCount: 0,
    });
  });
});
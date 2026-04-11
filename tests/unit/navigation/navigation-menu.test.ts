import { describe, expect, it } from 'vitest';

import { navItemsConfig } from '../../../src/components/navigation-menu';
import { PERMISSIONS } from '../../../src/lib/permissions';

describe('navigation menu config', () => {
  it('guards the data-screen entry with the datascreen view permission', () => {
    const dataScreenItem = navItemsConfig.find((item) => item.href === '/data-screen');

    expect(dataScreenItem).toBeDefined();
    expect(dataScreenItem?.requiredPermissions).toEqual([PERMISSIONS.DATASCREEN_VIEW]);
  });
});
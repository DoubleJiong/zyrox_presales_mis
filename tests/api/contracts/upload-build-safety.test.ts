import { describe, expect, it, vi } from 'vitest';

const storageConstructor = vi.fn(() => ({
  uploadFile: vi.fn(),
  generatePresignedUrl: vi.fn(),
}));

vi.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: unknown) => handler,
}));

vi.mock('coze-coding-dev-sdk', () => ({
  S3Storage: storageConstructor,
}));

vi.mock('pdf-to-img', () => ({
  pdf: vi.fn(),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn(),
}));

describe('contracts upload build safety', () => {
  it('does not initialize storage or pdf handlers during module import', async () => {
    const routeModule = await import('../../../src/app/api/contracts/upload/route');

    expect(routeModule.runtime).toBe('nodejs');
    expect(storageConstructor).not.toHaveBeenCalled();
  });
});
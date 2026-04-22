'use client';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm text-center">
            <h2 className="text-xl font-semibold mb-2">系统发生错误</h2>
            <p className="mt-2 text-sm text-muted-foreground mb-6">
              页面加载时遇到了严重问题，请尝试刷新。如果问题持续存在，请联系管理员。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  border: '1px solid #e2e8f0', borderRadius: '6px',
                  background: '#fff', padding: '6px 14px', fontSize: '14px',
                  fontWeight: 500, cursor: 'pointer',
                }}
              >
                重试
              </button>
              <a
                href="/"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  borderRadius: '6px', background: '#1d4ed8', color: '#fff',
                  padding: '6px 14px', fontSize: '14px', fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                回到首页
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
'use client';

export default function GlobalError({
  error: _error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">系统发生错误</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              页面加载失败，请重试。如果问题持续存在，请联系管理员。
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
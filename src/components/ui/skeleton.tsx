import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

// 基础骨架屏
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      style={style}
    />
  );
}

// 文本骨架屏
export function SkeletonText({ 
  lines = 3, 
  className 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// 头像骨架屏
export function SkeletonAvatar({ 
  size = 'md' 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return <Skeleton className={cn('rounded-full', sizeMap[size])} />;
}

// 卡片骨架屏
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <SkeletonText lines={2} />
        <div className="flex items-center space-x-2 pt-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

// 表格行骨架屏
export function SkeletonTableRow({ 
  columns = 5,
  className 
}: { 
  columns?: number; 
  className?: string;
}) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// 表格骨架屏
export function SkeletonTable({ 
  rows = 5, 
  columns = 5,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-md border', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 列表项骨架屏
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center space-x-4 p-4', className)}>
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

// 列表骨架屏
export function SkeletonList({ 
  items = 5,
  className 
}: { 
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn('divide-y rounded-lg border', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

// 统计卡片骨架屏
export function SkeletonStatCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="mt-4 flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// 图表骨架屏
export function SkeletonChart({ 
  height = 'h-64',
  className 
}: { 
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className={cn('relative w-full', height)}>
        {/* 模拟条形图 */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full px-4 pb-8">
          {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
            <Skeleton key={i} className="w-8" style={{ height: `${h}%` }} />
          ))}
        </div>
        {/* 模拟X轴 */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around px-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}

// 仪表盘骨架屏
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* 统计卡片行 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* 表格 */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}

// 表单骨架屏
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// 详情页骨架屏
export function SkeletonDetail() {
  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* 标签/状态区 */}
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>

      {/* 内容区 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonCard className="h-64" />
        </div>
        <div>
          <SkeletonCard className="h-64" />
        </div>
      </div>
    </div>
  );
}

// 侧边栏骨架屏
export function SkeletonSidebar() {
  return (
    <div className="w-64 space-y-4 p-4">
      {/* Logo */}
      <Skeleton className="h-8 w-32 mx-auto" />
      
      {/* 导航项 */}
      <div className="space-y-2 mt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// 页头骨架屏
export function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between h-16 px-4 border-b">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <SkeletonAvatar size="sm" />
      </div>
    </div>
  );
}

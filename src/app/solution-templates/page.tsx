import { SolutionTemplateManager } from '@/components/solution/solution-template-manager';

export default function SolutionTemplatesPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">方案模板管理</h1>
        <p className="text-muted-foreground mt-1">
          管理可复用的方案模板，支持基于现有方案创建模板，快速启动新项目
        </p>
      </div>
      <SolutionTemplateManager />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, PencilLine } from 'lucide-react';

import { ProjectBidding } from '@/components/project/project-bidding';
import { Button } from '@/components/ui/button';

export default function EditBiddingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = Number(id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">无效的投标项目编号。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/bidding/${projectId}`}>
          <Button variant="ghost" size="icon" aria-label="返回投标详情">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <PencilLine className="h-6 w-6" />
            编辑投标
          </h1>
          <p className="text-muted-foreground">维护投标信息，保存后沿用当前治理后的项目状态链。</p>
        </div>
      </div>

      <ProjectBidding projectId={projectId} defaultEditing />
    </div>
  );
}
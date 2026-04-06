'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, FileText, PencilLine } from 'lucide-react';

import { ProjectBidding } from '@/components/project/project-bidding';
import { Button } from '@/components/ui/button';

export default function BiddingDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/bidding">
            <Button variant="ghost" size="icon" aria-label="返回投标管理">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileText className="h-6 w-6" />
              投标详情
            </h1>
            <p className="text-muted-foreground">查看项目投标信息与结果归档情况。</p>
          </div>
        </div>
        <Link href={`/bidding/${projectId}/edit`}>
          <Button>
            <PencilLine className="mr-2 h-4 w-4" />
            编辑投标
          </Button>
        </Link>
      </div>

      <ProjectBidding projectId={projectId} />
    </div>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, FolderOpen, Gavel } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectBidding } from '@/components/project/project-bidding';
import { apiClient } from '@/lib/api-client';
import { resolveEffectiveProjectStage } from '@/lib/project-display';
import { getStageLabel } from '@/lib/utils/project-colors';

interface ProjectOption {
  id: number;
  projectName: string;
  projectCode: string;
  customerName: string | null;
  projectStage: string | null;
  status: string;
  bidResult?: string | null;
}

const ELIGIBLE_STAGES = new Set([
  'opportunity',
  'bidding_pending',
  'bidding',
  'solution_review',
  'contract_pending',
]);

export default function CreateBiddingPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      try {
        const { data: result } = await apiClient.get<{ projects: ProjectOption[] } | { data: { projects: ProjectOption[] } }>(
          '/api/projects?page=1&pageSize=200'
        );
        const payload = (result as any).data || result;
        const list = Array.isArray(payload?.projects) ? payload.projects : [];

        if (!active) {
          return;
        }

        setProjects(list);

        const initialProjectId = searchParams.get('projectId');
        if (initialProjectId && list.some((project) => String(project.id) === initialProjectId)) {
          setSelectedProjectId(initialProjectId);
          return;
        }

        const firstEligible = list.find((project) => ELIGIBLE_STAGES.has(resolveEffectiveProjectStage(project)));
        if (firstEligible) {
          setSelectedProjectId(String(firstEligible.id));
        }
      } catch (error) {
        console.error('Failed to load projects for bidding creation:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [searchParams]);

  const eligibleProjects = useMemo(
    () => projects.filter((project) => ELIGIBLE_STAGES.has(resolveEffectiveProjectStage(project))),
    [projects]
  );

  const selectedProject = eligibleProjects.find((project) => String(project.id) === selectedProjectId) || null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bidding">
          <Button variant="ghost" size="icon" aria-label="返回投标管理">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新建投标</h1>
          <p className="text-muted-foreground">选择项目后直接填写投标信息，保存后自动纳入投标管理。</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            选择项目
          </CardTitle>
          <CardDescription>仅显示仍可进入投标链路的项目，避免把已归档或已取消项目重新拉回流程。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>投标项目</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={loading || eligibleProjects.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? '加载项目中...' : '请选择项目'} />
              </SelectTrigger>
              <SelectContent>
                {eligibleProjects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.projectName} · {project.projectCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProject ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <FolderOpen className="h-4 w-4" />
                {selectedProject.projectName}
              </div>
              <div className="mt-2 text-muted-foreground">
                {selectedProject.projectCode}
                {selectedProject.customerName ? ` · ${selectedProject.customerName}` : ''}
              </div>
              <div className="mt-2 text-muted-foreground">
                当前项目阶段：{getStageLabel(resolveEffectiveProjectStage(selectedProject))}
              </div>
              <div className="mt-3">
                <Link href={`/projects/${selectedProject.id}`} className="inline-flex items-center text-primary hover:underline">
                  查看项目详情
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : !loading ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              当前没有可进入投标链路的项目。请先在项目管理中创建项目，或将项目推进到可投标阶段。
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedProject ? <ProjectBidding projectId={selectedProject.id} defaultEditing /> : null}
    </div>
  );
}
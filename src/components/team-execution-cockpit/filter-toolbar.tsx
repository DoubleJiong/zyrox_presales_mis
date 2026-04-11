'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  TEAM_EXECUTION_FOCUS_OPTIONS,
  TEAM_EXECUTION_TIME_RANGE_OPTIONS,
  TEAM_EXECUTION_VIEW_OPTIONS,
  type TeamExecutionFilters,
  type TeamExecutionFocus,
  type TeamExecutionTimeRange,
  type TeamExecutionView,
} from '@/lib/team-execution-cockpit/filters';

interface TeamExecutionFilterToolbarProps {
  filters: TeamExecutionFilters;
  pending?: boolean;
  onViewChange: (view: TeamExecutionView) => void;
  onRangeChange: (range: TeamExecutionTimeRange) => void;
  onFocusChange: (focus: TeamExecutionFocus) => void;
  onKeywordApply: (keyword: string) => void;
  onReset: () => void;
}

export function TeamExecutionFilterToolbar({
  filters,
  pending = false,
  onViewChange,
  onRangeChange,
  onFocusChange,
  onKeywordApply,
  onReset,
}: TeamExecutionFilterToolbarProps) {
  const [keyword, setKeyword] = useState(filters.q);

  useEffect(() => {
    setKeyword(filters.q);
  }, [filters.q]);

  const submitKeyword = () => {
    onKeywordApply(keyword);
  };

  return (
    <Card data-testid="team-execution-filter-toolbar" className="border-cyan-500/15 bg-slate-950/60 text-slate-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <SlidersHorizontal className="h-5 w-5 text-cyan-300" />
          顶部控制区
        </CardTitle>
        <CardDescription className="text-slate-400">
          当前已接通统一 URL 查询协议。后续首屏接口、风险榜和各视角 API 将直接复用这套参数结构。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-200">视角切换</div>
          <ToggleGroup
            type="single"
            value={filters.view}
            onValueChange={(value) => {
              if (value) {
                onViewChange(value as TeamExecutionView);
              }
            }}
            variant="outline"
            className="flex w-full flex-wrap gap-2"
          >
            {TEAM_EXECUTION_VIEW_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                data-testid={`team-execution-view-${option.value}`}
                className="rounded-full border-slate-700 bg-slate-900/70 text-slate-200 data-[state=on]:border-cyan-400/60 data-[state=on]:bg-cyan-500/15 data-[state=on]:text-cyan-100"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_auto]">
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">时间范围</div>
            <Select value={filters.range} onValueChange={(value) => onRangeChange(value as TeamExecutionTimeRange)}>
              <SelectTrigger data-testid="team-execution-range-trigger" className="border-slate-700 bg-slate-900/70 text-slate-100">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_EXECUTION_TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} data-testid={`team-execution-range-${option.value}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">快速筛选</div>
            <Select value={filters.focus} onValueChange={(value) => onFocusChange(value as TeamExecutionFocus)}>
              <SelectTrigger data-testid="team-execution-focus-trigger" className="border-slate-700 bg-slate-900/70 text-slate-100">
                <SelectValue placeholder="选择快速筛选" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_EXECUTION_FOCUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} data-testid={`team-execution-focus-${option.value}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">关键词搜索</div>
            <div className="flex gap-2">
              <Input
                data-testid="team-execution-keyword-input"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    submitKeyword();
                  }
                }}
                placeholder="搜索人员、项目、客户、方案"
                className="border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
              />
              <Button data-testid="team-execution-keyword-apply" type="button" onClick={submitKeyword} disabled={pending} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-end gap-2 lg:justify-end">
            <Button data-testid="team-execution-reset" type="button" variant="outline" onClick={onReset} disabled={pending} className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800">
              <X className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
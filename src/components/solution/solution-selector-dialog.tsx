'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { apiClient } from '@/lib/api-client';
import { 
  Search, 
  Star, 
  FileText, 
  Building2, 
  Check, 
  Loader2,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubScheme {
  id: number;
  subSchemeName: string;
  subSchemeType: string;
  version: string;
}

interface Solution {
  id: number;
  solutionCode: string;
  solutionName: string;
  version: string;
  industry: string | null;
  scenario: string | null;
  solutionTypeId: number | null;
  isTemplate: boolean;
  rating: string | null;
  tags: string[] | null;
  viewCount: number;
  templateUsageCount?: number;
  authorName?: string;
  subSchemes?: SubScheme[];
  selectedSubScheme?: SubScheme | null;
}

interface DictOption {
  value: string;
  label: string;
}

interface PaginatedApiResult<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      total: number;
      totalPages: number;
    };
  };
}

interface SolutionSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (solution: Solution, usageType: string) => void;
  projectId: number;
  projectIndustry?: string;
  loading?: boolean;
  existingSolutionIds?: number[]; // 已关联的解决方案ID列表
}

export function SolutionSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  projectId,
  projectIndustry,
  loading: externalLoading,
  existingSolutionIds = [],
}: SolutionSelectorDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [recommendedSolutions, setRecommendedSolutions] = useState<Solution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [selectedSubScheme, setSelectedSubScheme] = useState<SubScheme | null>(null);
  const [usageType, setUsageType] = useState('reference');
  const [typeFilter, setTypeFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 5; // 每页5条，紧凑显示
  
  // 字典选项
  const [solutionTypeOptions, setSolutionTypeOptions] = useState<DictOption[]>([]);

  // 加载字典选项
  const loadDictionaryOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/dictionary/options?categories=solution_type');
      const data = await response.json();
      if (data.success) {
        if (data.data.solution_type) {
          setSolutionTypeOptions(data.data.solution_type);
        }
      }
    } catch (error) {
      console.error('Failed to load dictionary options:', error);
    }
  }, []);

  const fetchSolutions = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'approved,published');
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      
      if (searchTerm) {
        params.set('keyword', searchTerm);
      }
      
      if (typeFilter !== 'all') {
        params.set('solutionTypeId', typeFilter);
      }
      
      if (industryFilter !== 'all') params.set('industry', industryFilter);

      const { data: result } = await apiClient.get<PaginatedApiResult<Solution[]>>(`/api/solutions?${params.toString()}`);

      setSolutions(result.data || []);
      setTotal(result.meta?.pagination?.total || 0);
      setTotalPages(result.meta?.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch solutions:', error);
      toast({ title: '获取方案列表失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, industryFilter, toast]);

  const fetchRecommendedSolutions = useCallback(async () => {
    if (!projectIndustry) return;
    
    try {
      const params = new URLSearchParams();
      params.set('industry', projectIndustry);
      params.set('status', 'approved,published');
      params.set('isTemplate', 'true');
      params.set('pageSize', '3');

      const { data: result } = await apiClient.get<PaginatedApiResult<Solution[]>>(
        `/api/solutions?${params.toString()}`
      );
      setRecommendedSolutions(result.data || []);
    } catch (error) {
      console.error('Failed to fetch recommended solutions:', error);
    }
  }, [projectIndustry]);

  useEffect(() => {
    if (open) {
      loadDictionaryOptions();
      fetchRecommendedSolutions();
      // 重置状态
      setSelectedSolution(null);
      setSelectedSubScheme(null);
      setSearchTerm('');
      setUsageType('reference');
      setTypeFilter('all');
      setIndustryFilter('all');
      setCurrentPage(1);
      fetchSolutions(1);
    }
  }, [open, loadDictionaryOptions, fetchRecommendedSolutions]);

  const handleSearch = () => {
    fetchSolutions(1);
  };

  const handlePageChange = (page: number) => {
    fetchSolutions(page);
  };

  const handleConfirm = () => {
    if (selectedSolution) {
      onSelect(
        {
          ...selectedSolution,
          selectedSubScheme,
        },
        usageType
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            从方案库选择方案
          </DialogTitle>
          <DialogDescription>
            搜索并选择解决方案关联到当前项目
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* 搜索区域 - 分两行布局 */}
          <div className="flex-shrink-0 space-y-2">
            {/* 第一行：搜索框 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="solution-selector-search-input"
                  placeholder="搜索方案名称、简介、场景或子方案名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
            </div>
            {/* 第二行：筛选条件 + 搜索按钮 */}
            <div className="flex gap-2 items-center">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-28 flex-shrink-0">
                  <SelectValue placeholder="方案类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {solutionTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-28 flex-shrink-0">
                  <SelectValue placeholder="行业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部行业</SelectItem>
                  <SelectItem value="高等教育">高等教育</SelectItem>
                  <SelectItem value="职业教育">职业教育</SelectItem>
                  <SelectItem value="基础教育">基础教育</SelectItem>
                  <SelectItem value="企业">企业</SelectItem>
                  <SelectItem value="政府">政府</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button
                data-testid="solution-selector-search-button"
                onClick={handleSearch}
                disabled={loading}
                size="sm"
                className="flex-shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '搜索'}
              </Button>
            </div>
          </div>

          {/* 列表区域 */}
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {/* 推荐方案 */}
            {recommendedSolutions.filter(s => !existingSolutionIds.includes(s.id)).length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                  <Star className="h-3 w-3 text-yellow-500" />
                  推荐方案（基于项目行业匹配）
                </div>
                <div className="space-y-1">
                  {recommendedSolutions.filter(s => !existingSolutionIds.includes(s.id)).map((solution) => (
                    <SolutionCard
                      key={solution.id}
                      solution={solution}
                      selected={selectedSolution?.id === solution.id}
                      onClick={() => setSelectedSolution(solution)}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 全部方案 */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                全部方案（共 {total} 个{existingSolutionIds.length > 0 ? `，已排除 ${existingSolutionIds.length} 个已关联方案` : ''}）
              </div>
              <div className="space-y-1">
                {solutions.filter(s => !existingSolutionIds.includes(s.id)).map((solution) => (
                  <SolutionCard
                    key={solution.id}
                    solution={solution}
                    selected={selectedSolution?.id === solution.id}
                    onClick={() => setSelectedSolution(solution)}
                    compact
                  />
                ))}
                {solutions.filter(s => !existingSolutionIds.includes(s.id)).length === 0 && !loading && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {existingSolutionIds.length > 0 ? '所有匹配的方案都已关联到当前项目' : '暂无匹配的解决方案'}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* 分页 - 独立区域 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-2 border-t flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className="h-7 w-7 p-0 text-xs"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 选择关联类型 - 紧凑布局 */}
          {selectedSolution && (
            <Card className="bg-muted/30 flex-shrink-0">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  搜索始终以解决方案为主，子方案仅作为当前方案下的可选挂接项。
                </div>
                <div className="text-sm font-medium mb-2">选择关联类型</div>
                <RadioGroup value={usageType} onValueChange={setUsageType} className="flex gap-4 flex-wrap">
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="reference" id="reference" />
                    <Label htmlFor="reference" className="cursor-pointer text-sm">
                      参考方案
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="implementation" id="implementation" />
                    <Label htmlFor="implementation" className="cursor-pointer text-sm">
                      实施方案
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="customization" id="customization" />
                    <Label htmlFor="customization" className="cursor-pointer text-sm">
                      定制方案
                    </Label>
                  </div>
                </RadioGroup>
                
                {/* 子方案选择 */}
                {selectedSolution.subSchemes && selectedSolution.subSchemes.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium mb-2">选择关联子方案（可选）</div>
                    <Select 
                      value={selectedSubScheme?.id?.toString() || 'none'} 
                      onValueChange={(v) => {
                        if (v === 'none') {
                          setSelectedSubScheme(null);
                        } else {
                          const sub = selectedSolution.subSchemes?.find(s => s.id.toString() === v);
                          setSelectedSubScheme(sub || null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择要关联的子方案（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不选择子方案</SelectItem>
                        {selectedSolution.subSchemes.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            {sub.subSchemeName} (v{sub.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            size="sm"
            onClick={handleConfirm} 
            disabled={!selectedSolution || externalLoading}
          >
            {externalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确定关联
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 方案卡片子组件 - 紧凑版本
function SolutionCard({
  solution,
  selected,
  onClick,
  compact = false,
}: {
  solution: Solution;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <Card
      data-testid="solution-card"
      data-solution-name={solution.solutionName}
      className={`cursor-pointer transition-all ${
        selected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
          : 'hover:bg-accent hover:border-primary/50'
      } ${compact ? 'p-0' : ''}`}
      onClick={onClick}
    >
      <CardContent className={`${compact ? 'p-2' : 'p-3'} flex items-center gap-2`}>
        <div className={`flex-shrink-0 rounded bg-primary/10 flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
          <FileText className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>{solution.solutionName}</span>
            {solution.isTemplate && (
              <Badge variant="secondary" className="text-xs h-4 px-1">模板</Badge>
            )}
            {selected && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className={`flex items-center gap-2 text-muted-foreground ${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
            <span>v{solution.version}</span>
            {solution.industry && (
              <span className="flex items-center gap-0.5">
                <Building2 className="h-3 w-3" />
                {solution.industry}
              </span>
            )}
            {solution.rating && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                {solution.rating}
              </span>
            )}
          </div>
          {solution.subSchemes && solution.subSchemes.length > 0 && (
            <div className={`text-muted-foreground ${compact ? 'text-[11px] mt-1' : 'text-xs mt-2'}`}>
              子方案: {solution.subSchemes.slice(0, 3).map((sub) => sub.subSchemeName).join(' / ')}
              {solution.subSchemes.length > 3 ? ` 等 ${solution.subSchemes.length} 个` : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

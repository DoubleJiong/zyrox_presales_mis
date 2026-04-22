/**
 * Shared data type definitions for data-screen region view.
 * Keep this file import-free to avoid any server/client boundary issues.
 * Field names match what the API route returns exactly.
 */

export type KpiTrendEntry = {
  dir: 'up' | 'down' | 'flat';
  delta: number; // absolute change vs previous calendar month
};

export type RegionViewData = {
  kpi: {
    totalCustomers: number;
    totalProjects: number;
    opportunityAmount: number;
    wonAmount: number;
    totalContracts: number;
    contractAmount: number;
    presalesHours: number;
    winRate: number;
    // sub-info fields (optional)
    opportunityCount?: number;
    wonCount?: number;
    contractAmountAvg?: number;
    presalesHeadcount?: number;
    activeProjectCount?: number;
  };
  kpiTrend?: {
    totalCustomers:    KpiTrendEntry;
    totalProjects:     KpiTrendEntry;
    presalesHours:     KpiTrendEntry;
    wonAmount:         KpiTrendEntry;
    winRate:           KpiTrendEntry;
  };
  stageDistribution: Array<{ stage: string; count: number }>;
  industryDistribution: Array<{ industry: string; count: number }>;
  customerTypeDistribution: Array<{ customerType: string; count: number }>;
  projectTypeScatter: Array<{
    projectType: string;
    projectTypeName?: string;
    count: number;
    avgContractAmount: number;
    totalAmount: number;
  }>;
  regionMap: Array<{
    region: string;
    customerCount: number;
    projectCount: number;
    opportunityAmount: number;
    wonAmount: number;
    presalesHours: number;
    subsidiaryName?: string;
  }>;
  funnelData: {
    stages: string[];
    counts: number[];
    amounts: number[];
    rates: number[];
  };
  projectList: Array<{
    id: number;
    projectName: string;
    projectStage: string;
    amount: number;
    region: string | null;
  }>;
  subsidiaryStats: Array<{
    subsidiaryName: string;
    projectCount: number;
    wonAmount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    newProjects: number;
    wonAmount: number;
  }>;
  presalesService: Array<{
    month: string;
    serviceTypeName: string;

    hours: number;
  }>;
};

// ─── Personnel View ───────────────────────────────────────────────────────────

export type PersonnelGraphNode = {
  id: string;           // 'u:{userId}' | 'p:{projectId}' | 's:{solutionId}'
  name: string;
  nodeType: 'person' | 'project' | 'solution';
  /** person nodes only: number of active projects */
  projectCount?: number;
  /** person nodes only: tasks past due date in pending/in_progress */
  overdueTaskCount?: number;
};

export type PersonnelGraphEdge = {
  source: string;
  target: string;
  lineType: 'direct' | 'indirect';
};

export type PersonCurrentTask = {
  id: number;
  kind: 'task' | 'todo';
  title: string;
  priority: string;       // urgent, high, medium, low
  status: string;         // pending, in_progress
  dueDate: string | null; // ISO date string
  relatedName: string | null;
  taskType: string | null;
};

export type PersonDetail = {
  userId: number;
  realName: string;
  roleCode: string;
  roleName: string;
  department: string | null;
  position: string | null;
  baseLocation: string | null;
  avatar: string | null;
  bio: string | null;
  skills: unknown;
  expertise: unknown;
  certifications: unknown;
  projectCount: number;
  solutionCount: number;
  wonAmount: number;        // 万元
  presalesHours: number;
  recentProjects: Array<{ id: number; projectName: string; projectStage: string; bidResult: string | null }>;
  solutions: Array<{ id: number; solutionName: string; role: string }>;
  currentTasks: PersonCurrentTask[];
  upcomingSchedules: Array<{ id: number; title: string; startDate: string; startTime: string | null; type: string | null }>;
  worklogTrend: Array<{ week: string; hours: number }>;
};

export type PersonnelViewData = {
  kpi: {
    solutionEngineerCount: number;
    hqPresalesCount: number;
    regionalPresalesCount: number;
    businessSupportCount: number;
    hqPerCapitaOutput: number;      // 万元
    regionalPerCapitaOutput: number;
    hqPerCapitaProjects: number;
    regionalPerCapitaProjects: number;
  };
  graphData: {
    nodes: PersonnelGraphNode[];
    edges: PersonnelGraphEdge[];
  };
  projectManhourRanking: Array<{
    projectId: number;
    projectName: string;
    totalHours: number;
    memberCount: number;
  }>;
  hqPerCapitaList: Array<{
    userId: number;
    displayName: string;
    projectCount: number;
    wonAmount: number;    // 万元
  }>;
  regionalPerCapitaList: Array<{
    userId: number;
    displayName: string;
    region: string | null;
    projectCount: number;
    wonAmount: number;    // 万元
  }>;
  personDetail?: PersonDetail;
};
// types/index.ts
// Comprehensive TypeScript interfaces for Skylark Drones Monday.com BI Agent

export interface MondayColumnValue {
  id: string;
  type?: string;
  text?: string | null;
  value?: string | null;
}

export interface MondayColumn {
  id: string;
  title: string;
  type?: string;
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
  created_at?: string;
  updated_at?: string;
}

export interface MondayBoard {
  id: string;
  name: string;
  columns: MondayColumn[];
  items_page?: {
    cursor?: string | null;
    items: MondayItem[];
  };
}

export interface MondayBoardResponse {
  data?: {
    boards?: MondayBoard[];
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    extensions?: Record<string, unknown>;
  }>;
}

// Normalized Deal Entity
export interface DealItem {
  id: string;
  name: string;
  dealStage: string;
  rawDealStage?: string;
  dealValue: number | null;
  dealValueFormatted: string;
  region: string;
  priority: string;
  ownerCode: string;
  clientCode: string;
  closingDate: string | null;
  closingDateRaw?: string | null;
  productDeal: string;
  sectorService: string;
  createdDate: string | null;
  
  // Derived flags for fast BI filtering
  isWon: boolean;
  isLost: boolean;
  isOpen: boolean;
  isHighPriority: boolean;
  isDelayedOrOverdue: boolean;
  rawValues: Record<string, string | null>;
}

// Normalized Work Order Entity (Project Execution / Operations)
export interface WorkOrderItem {
  id: string;
  name: string;
  clientCode: string;
  sectorService: string;
  value: number | null;
  valueFormatted: string;
  status: string; // "Completed" | "In-Progress" | "Delayed" | "Blocked" | "Yet to Start"
  startDate: string | null;
  targetDate: string | null;
  actualDate: string | null;
  delayReason: string | null;
  isDelayed: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  rawValues: Record<string, string | null>;
}

// Data Quality Reporting
export interface DataQualityIssue {
  field: string;
  missingCount: number;
  unparseableCount: number;
  totalRecords: number;
  percentageComplete: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DataQualityReport {
  totalDeals: number;
  totalWorkOrders: number;
  missingDealValues: number;
  missingClosingDates: number;
  missingSectors: number;
  missingStages: number;
  unmappedColumns: string[];
  columnMappings: {
    deals: Record<string, string>;
    workOrders: Record<string, string>;
  };
  issues: DataQualityIssue[];
  dataHealthScore: number; // 0 to 100
  caveats: string[];
}

// Analytics Aggregate Models
export interface StageMetric {
  stage: string;
  count: number;
  value: number;
  percentageOfTotal: number;
}

export interface SectorMetric {
  sector: string;
  dealCount: number;
  dealValue: number;
  wonCount: number;
  wonValue: number;
  openCount: number;
  openValue: number;
  workOrderCount?: number;
  workOrderValue?: number;
  delayedWorkOrders?: number;
}

export interface RegionMetric {
  region: string;
  count: number;
  value: number;
  wonValue: number;
}

export interface PriorityMetric {
  priority: string;
  count: number;
  value: number;
}

export interface OwnerMetric {
  owner: string;
  dealCount: number;
  dealValue: number;
  wonCount: number;
  wonValue: number;
  openCount: number;
  openValue: number;
}

export interface PipelineAnalytics {
  totalPipelineValue: number;
  openPipelineValue: number;
  wonPipelineValue: number;
  lostPipelineValue: number;
  
  totalDealsCount: number;
  openDealsCount: number;
  wonDealsCount: number;
  lostDealsCount: number;
  delayedDealsCount: number;
  highPriorityDealsCount: number;
  
  winRateByCount: number;
  winRateByValue: number;
  averageDealSize: number;
  
  stages: StageMetric[];
  sectors: SectorMetric[];
  regions: RegionMetric[];
  priorities: PriorityMetric[];
  owners: OwnerMetric[];
  
  delayedDeals: DealItem[];
  highPriorityRisks: DealItem[];
  
  // Work order operational metrics (if work order board is connected)
  totalWorkOrdersCount?: number;
  totalWorkOrdersValue?: number;
  delayedWorkOrdersCount?: number;
  delayedWorkOrdersValue?: number;
  completedWorkOrdersCount?: number;
  inProgressWorkOrdersCount?: number;
}

// Chat Messages & Interactions
export interface ChatSource {
  title: string;
  type: 'deals' | 'work_orders' | 'analytics';
  count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metricsSnapshot?: Partial<PipelineAnalytics>;
  dataQualityCaveats?: string[];
  isLeadershipUpdate?: boolean;
  suggestedFollowUps?: string[];
}

export interface FilterState {
  stage?: string;
  sector?: string;
  priority?: string;
  region?: string;
  owner?: string;
  search?: string;
}

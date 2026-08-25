// lib/analytics.ts
// Business Intelligence & Analytics Engine for Skylark Drones

import {
  DealItem,
  WorkOrderItem,
  PipelineAnalytics,
  StageMetric,
  SectorMetric,
  RegionMetric,
  PriorityMetric,
  OwnerMetric,
  FilterState,
} from '@/types';

/**
 * Computes deep pipeline & operational business analytics dynamically from normalized Monday.com items.
 */
export function computePipelineAnalytics(
  deals: DealItem[],
  workOrders: WorkOrderItem[] = []
): PipelineAnalytics {
  let totalPipelineValue = 0;
  let openPipelineValue = 0;
  let wonPipelineValue = 0;
  let lostPipelineValue = 0;

  let totalDealsCount = deals.length;
  let openDealsCount = 0;
  let wonDealsCount = 0;
  let lostDealsCount = 0;
  let delayedDealsCount = 0;
  let highPriorityDealsCount = 0;

  const stageMap: Record<string, { count: number; value: number }> = {};
  const sectorMap: Record<
    string,
    {
      dealCount: number;
      dealValue: number;
      wonCount: number;
      wonValue: number;
      openCount: number;
      openValue: number;
    }
  > = {};
  const regionMap: Record<string, { count: number; value: number; wonValue: number }> = {};
  const priorityMap: Record<string, { count: number; value: number }> = {};
  const ownerMap: Record<
    string,
    { dealCount: number; dealValue: number; wonCount: number; wonValue: number; openCount: number; openValue: number }
  > = {};

  const delayedDeals: DealItem[] = [];
  const highPriorityRisks: DealItem[] = [];

  // Iterate over deals
  for (const deal of deals) {
    const val = deal.dealValue || 0;
    totalPipelineValue += val;

    if (deal.isWon) {
      wonDealsCount++;
      wonPipelineValue += val;
    } else if (deal.isLost) {
      lostDealsCount++;
      lostPipelineValue += val;
    } else {
      openDealsCount++;
      openPipelineValue += val;
    }

    if (deal.isDelayedOrOverdue) {
      delayedDealsCount++;
      delayedDeals.push(deal);
    }

    if (deal.isHighPriority) {
      highPriorityDealsCount++;
      if (deal.isOpen) {
        highPriorityRisks.push(deal);
      }
    }

    // Stage Aggregation
    const stageKey = deal.dealStage;
    if (!stageMap[stageKey]) {
      stageMap[stageKey] = { count: 0, value: 0 };
    }
    stageMap[stageKey].count++;
    stageMap[stageKey].value += val;

    // Sector Aggregation
    const sectorKey = deal.sectorService;
    if (!sectorMap[sectorKey]) {
      sectorMap[sectorKey] = {
        dealCount: 0,
        dealValue: 0,
        wonCount: 0,
        wonValue: 0,
        openCount: 0,
        openValue: 0,
      };
    }
    sectorMap[sectorKey].dealCount++;
    sectorMap[sectorKey].dealValue += val;
    if (deal.isWon) {
      sectorMap[sectorKey].wonCount++;
      sectorMap[sectorKey].wonValue += val;
    } else if (deal.isOpen) {
      sectorMap[sectorKey].openCount++;
      sectorMap[sectorKey].openValue += val;
    }

    // Region Aggregation
    const regionKey = deal.region;
    if (!regionMap[regionKey]) {
      regionMap[regionKey] = { count: 0, value: 0, wonValue: 0 };
    }
    regionMap[regionKey].count++;
    regionMap[regionKey].value += val;
    if (deal.isWon) {
      regionMap[regionKey].wonValue += val;
    }

    // Priority Aggregation
    const priorityKey = deal.priority;
    if (!priorityMap[priorityKey]) {
      priorityMap[priorityKey] = { count: 0, value: 0 };
    }
    priorityMap[priorityKey].count++;
    priorityMap[priorityKey].value += val;

    // Owner Aggregation
    const ownerKey = deal.ownerCode;
    if (!ownerMap[ownerKey]) {
      ownerMap[ownerKey] = {
        dealCount: 0,
        dealValue: 0,
        wonCount: 0,
        wonValue: 0,
        openCount: 0,
        openValue: 0,
      };
    }
    ownerMap[ownerKey].dealCount++;
    ownerMap[ownerKey].dealValue += val;
    if (deal.isWon) {
      ownerMap[ownerKey].wonCount++;
      ownerMap[ownerKey].wonValue += val;
    } else if (deal.isOpen) {
      ownerMap[ownerKey].openCount++;
      ownerMap[ownerKey].openValue += val;
    }
  }

  // Work Orders Aggregations (Operational Backlog)
  let totalWorkOrdersCount = workOrders.length;
  let totalWorkOrdersValue = 0;
  let delayedWorkOrdersCount = 0;
  let delayedWorkOrdersValue = 0;
  let completedWorkOrdersCount = 0;
  let inProgressWorkOrdersCount = 0;

  const woSectorMap: Record<string, { count: number; value: number; delayedCount: number }> = {};

  for (const wo of workOrders) {
    const val = wo.value || 0;
    totalWorkOrdersValue += val;

    if (wo.isCompleted) {
      completedWorkOrdersCount++;
    } else if (wo.isDelayed) {
      delayedWorkOrdersCount++;
      delayedWorkOrdersValue += val;
    } else if (wo.isInProgress) {
      inProgressWorkOrdersCount++;
    }

    const secKey = wo.sectorService;
    if (!woSectorMap[secKey]) {
      woSectorMap[secKey] = { count: 0, value: 0, delayedCount: 0 };
    }
    woSectorMap[secKey].count++;
    woSectorMap[secKey].value += val;
    if (wo.isDelayed) {
      woSectorMap[secKey].delayedCount++;
    }
  }

  // Calculate Win Rates & Averages
  const closedCount = wonDealsCount + lostDealsCount;
  const winRateByCount = closedCount > 0 ? Math.round((wonDealsCount / closedCount) * 100) : 0;
  const closedValue = wonPipelineValue + lostPipelineValue;
  const winRateByValue = closedValue > 0 ? Math.round((wonPipelineValue / closedValue) * 100) : 0;
  const averageDealSize =
    totalDealsCount > 0 ? Math.round(totalPipelineValue / totalDealsCount) : 0;

  // Transform Stage Metrics
  const stages: StageMetric[] = Object.entries(stageMap)
    .map(([stage, m]) => ({
      stage,
      count: m.count,
      value: m.value,
      percentageOfTotal: totalPipelineValue > 0 ? Math.round((m.value / totalPipelineValue) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Transform Sector Metrics with Cross-Board Correlation
  const allSectorKeys = new Set([...Object.keys(sectorMap), ...Object.keys(woSectorMap)]);
  const sectors: SectorMetric[] = Array.from(allSectorKeys)
    .map((sector) => {
      const dm = sectorMap[sector] || {
        dealCount: 0,
        dealValue: 0,
        wonCount: 0,
        wonValue: 0,
        openCount: 0,
        openValue: 0,
      };
      const wom = woSectorMap[sector] || { count: 0, value: 0, delayedCount: 0 };

      return {
        sector,
        dealCount: dm.dealCount,
        dealValue: dm.dealValue,
        wonCount: dm.wonCount,
        wonValue: dm.wonValue,
        openCount: dm.openCount,
        openValue: dm.openValue,
        workOrderCount: wom.count,
        workOrderValue: wom.value,
        delayedWorkOrders: wom.delayedCount,
      };
    })
    .sort((a, b) => b.dealValue - a.dealValue);

  // Regions
  const regions: RegionMetric[] = Object.entries(regionMap)
    .map(([region, m]) => ({
      region,
      count: m.count,
      value: m.value,
      wonValue: m.wonValue,
    }))
    .sort((a, b) => b.value - a.value);

  // Priorities
  const priorities: PriorityMetric[] = Object.entries(priorityMap)
    .map(([priority, m]) => ({
      priority,
      count: m.count,
      value: m.value,
    }))
    .sort((a, b) => b.value - a.value);

  // Owners
  const owners: OwnerMetric[] = Object.entries(ownerMap)
    .map(([owner, m]) => ({
      owner,
      dealCount: m.dealCount,
      dealValue: m.dealValue,
      wonCount: m.wonCount,
      wonValue: m.wonValue,
      openCount: m.openCount,
      openValue: m.openValue,
    }))
    .sort((a, b) => b.dealValue - a.dealValue);

  return {
    totalPipelineValue,
    openPipelineValue,
    wonPipelineValue,
    lostPipelineValue,
    totalDealsCount,
    openDealsCount,
    wonDealsCount,
    lostDealsCount,
    delayedDealsCount,
    highPriorityDealsCount,
    winRateByCount,
    winRateByValue,
    averageDealSize,
    stages,
    sectors,
    regions,
    priorities,
    owners,
    delayedDeals,
    highPriorityRisks,
    totalWorkOrdersCount,
    totalWorkOrdersValue,
    delayedWorkOrdersCount,
    delayedWorkOrdersValue,
    completedWorkOrdersCount,
    inProgressWorkOrdersCount,
  };
}

/**
 * Multi-dimensional filter engine for deals
 */
export function filterDeals(deals: DealItem[], filters: FilterState): DealItem[] {
  return deals.filter((deal) => {
    if (filters.stage && filters.stage !== 'ALL') {
      if (deal.dealStage.toLowerCase() !== filters.stage.toLowerCase()) return false;
    }
    if (filters.sector && filters.sector !== 'ALL') {
      if (deal.sectorService.toLowerCase() !== filters.sector.toLowerCase()) return false;
    }
    if (filters.priority && filters.priority !== 'ALL') {
      if (deal.priority.toLowerCase() !== filters.priority.toLowerCase()) return false;
    }
    if (filters.region && filters.region !== 'ALL') {
      if (deal.region.toLowerCase() !== filters.region.toLowerCase()) return false;
    }
    if (filters.owner && filters.owner !== 'ALL') {
      if (deal.ownerCode.toLowerCase() !== filters.owner.toLowerCase()) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const match =
        deal.name.toLowerCase().includes(q) ||
        deal.clientCode.toLowerCase().includes(q) ||
        deal.sectorService.toLowerCase().includes(q) ||
        deal.productDeal.toLowerCase().includes(q) ||
        deal.ownerCode.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

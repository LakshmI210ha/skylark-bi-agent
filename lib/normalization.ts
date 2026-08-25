// lib/normalization.ts
// Robust, resilient data normalization for Monday.com deals and work orders

import {
  MondayItem,
  MondayColumn,
  DealItem,
  WorkOrderItem,
  DataQualityReport,
  DataQualityIssue,
} from '@/types';

// ==========================================
// 1. FUZZY COLUMN MATCHING
// ==========================================
// Detects real-world messy Monday.com column titles flexibly using regex heuristics

interface ColumnMappingRules {
  [key: string]: RegExp[];
}

const DEAL_COLUMN_PATTERNS: ColumnMappingRules = {
  name: [/^(deal\s*name|deal\s*title|deal|item\s*name|name|opportunity)$/i, /deal/i],
  dealStage: [/^(deal\s*stage|stage|funnel\s*stage|pipeline\s*stage|status)$/i, /stage/i, /status/i],
  dealValue: [
    /^(deal\s*value|value|amount|deal\s*size|pipeline\s*value|deal\s*value\s*\(inr\)|inr\s*value|revenue|contract\s*value)$/i,
    /value/i,
    /amount/i,
    /inr/i,
  ],
  region: [/^(region|territory|geography|geo|location|country|area)$/i, /region/i, /location/i],
  priority: [/^(priority|deal\s*priority|urgency|importance)$/i, /priority/i],
  ownerCode: [
    /^(owner\s*code|owner|sales\s*rep|spoc|lead\s*owner|account\s*exec|assigned\s*to)$/i,
    /owner/i,
    /spoc/i,
  ],
  clientCode: [/^(client\s*code|client|account|customer|company\s*code|account\s*name)$/i, /client/i, /account/i],
  closingDate: [
    /^(closing\s*date|close\s*date|target\s*close|expected\s*close|expected\s*closing\s*date|due\s*date|deadline)$/i,
    /close/i,
    /closing/i,
    /deadline/i,
  ],
  productDeal: [/^(product\s*deal|product|service|offering|solution|product\s*line)$/i, /product/i, /solution/i],
  sectorService: [
    /^(sector\/service|sector|industry|vertical|domain|sector\s*name|business\s*unit)$/i,
    /sector/i,
    /industry/i,
  ],
  createdDate: [
    /^(created\s*date|creation\s*date|created\s*at|date\s*created|open\s*date)$/i,
    /created/i,
  ],
};

const WORK_ORDER_COLUMN_PATTERNS: ColumnMappingRules = {
  name: [/^(work\s*order\s*(#|no|name|title)?|project\s*name|wo\s*#|item\s*name|name)$/i, /order/i, /project/i],
  clientCode: [/^(client\s*code|client|customer|account)$/i, /client/i],
  sectorService: [/^(sector\/service|sector|industry|vertical|domain)$/i, /sector/i, /industry/i],
  value: [/^(value|project\s*value|order\s*value|amount|cost)$/i, /value/i, /amount/i],
  status: [/^(status|execution\s*status|project\s*status|state)$/i, /status/i, /state/i],
  startDate: [/^(start\s*date|commencement\s*date|kickoff)$/i, /start/i],
  targetDate: [/^(target\s*date|expected\s*completion|target\s*completion\s*date|due\s*date|deadline)$/i, /target/i, /due/i],
  actualDate: [/^(actual\s*date|actual\s*completion\s*date|completion\s*date|delivered\s*date)$/i, /actual/i, /completion/i],
  delayReason: [/^(delay\s*reason|delay\s*remarks|blockers|delay\s*notes|comments)$/i, /delay/i, /blocker/i],
};

export function detectColumnMapping(
  columns: MondayColumn[],
  patterns: ColumnMappingRules
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedColumnIds = new Set<string>();

  // Pass 1: Exact / High-confidence pattern matches
  for (const [targetKey, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (mapping[targetKey]) break;
      const found = columns.find(
        (col) => !usedColumnIds.has(col.id) && regex.test(col.title.trim())
      );
      if (found) {
        mapping[targetKey] = found.id;
        usedColumnIds.add(found.id);
        break;
      }
    }
  }

  // Pass 2: ID-based match fallback (e.g. if column id itself is 'deal_stage' or 'status')
  for (const [targetKey, regexList] of Object.entries(patterns)) {
    if (!mapping[targetKey]) {
      const found = columns.find(
        (col) => !usedColumnIds.has(col.id) && regexList.some((r) => r.test(col.id))
      );
      if (found) {
        mapping[targetKey] = found.id;
        usedColumnIds.add(found.id);
      }
    }
  }

  return mapping;
}

// ==========================================
// 2. VALUE EXTRACTION UTILITY
// ==========================================
export function getColumnText(item: MondayItem, columnId?: string): string | null {
  if (!columnId) return null;
  const colVal = item.column_values?.find((c) => c.id === columnId);
  if (!colVal) return null;

  if (colVal.text !== undefined && colVal.text !== null && colVal.text.trim() !== '') {
    return colVal.text.trim();
  }

  // Handle JSON value field if text is empty
  if (colVal.value) {
    try {
      const parsed = JSON.parse(colVal.value);
      if (typeof parsed === 'string') return parsed.trim();
      if (typeof parsed === 'number') return String(parsed);
      if (parsed.label) return String(parsed.label).trim();
      if (parsed.date) return String(parsed.date).trim();
      if (parsed.text) return String(parsed.text).trim();
      if (parsed.value) return String(parsed.value).trim();
    } catch {
      // Not JSON string, return raw value
      return String(colVal.value).trim();
    }
  }

  return null;
}

// ==========================================
// 3. CURRENCY & NUMBER PARSING
// ==========================================
export function parseNumberSafely(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^(n\/a|null|nil|none|-|tbd|\?)$/i.test(trimmed)) {
    return null;
  }

  // Check for Indian and international multiplier words/suffixes
  let multiplier = 1;
  const cleanStr = trimmed.replace(/,/g, '').replace(/[₹$€£\s]/g, '');

  if (/cr(ore)?s?$/i.test(cleanStr)) {
    multiplier = 10000000;
  } else if (/l(akh)?s?$/i.test(cleanStr)) {
    multiplier = 100000;
  } else if (/k$/i.test(cleanStr)) {
    multiplier = 1000;
  } else if (/m(illion)?$/i.test(cleanStr)) {
    multiplier = 1000000;
  } else if (/b(illion)?$/i.test(cleanStr)) {
    multiplier = 1000000000;
  }

  // Extract raw numeric part
  const numericMatch = cleanStr.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numericMatch) return null;

  const num = parseFloat(numericMatch[0]);
  if (isNaN(num)) return null;

  return Math.round(num * multiplier);
}

export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0 (Unspecified)';
  }
  
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==========================================
// 4. DATE PARSER
// ==========================================
export function parseDateSafely(value: string | null | undefined): {
  iso: string | null;
  display: string | null;
  timestamp: number | null;
} {
  if (!value) return { iso: null, display: null, timestamp: null };
  const trimmed = value.trim();
  if (!trimmed || /^(n\/a|null|nil|none|-|tbd|\?)$/i.test(trimmed)) {
    return { iso: null, display: null, timestamp: null };
  }

  // 1. Check Excel Serial Number (e.g. 45123)
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    const excelEpoch = new Date(1899, 11, 30);
    const targetDate = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(targetDate.getTime())) {
      return {
        iso: targetDate.toISOString().split('T')[0],
        display: targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        timestamp: targetDate.getTime(),
      };
    }
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return {
        iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        display: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        timestamp: d.getTime(),
      };
    }
  }

  // 3. Standard Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return {
      iso: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      timestamp: d.getTime(),
    };
  }

  // Preserve as unparseable display text instead of discarding
  return { iso: null, display: trimmed, timestamp: null };
}

// ==========================================
// 5. SECTOR NORMALIZATION
// ==========================================
const SECTOR_ALIASES: Record<string, string> = {
  energy: 'Energy',
  power: 'Energy',
  renewables: 'Energy',
  solar: 'Energy',
  wind: 'Energy',
  'oil & gas': 'Energy',
  'oil and gas': 'Energy',
  thermal: 'Energy',
  'renewables & energy': 'Energy',
  'energy & utilities': 'Energy',

  infra: 'Infrastructure',
  infrastructure: 'Infrastructure',
  highways: 'Infrastructure',
  roads: 'Infrastructure',
  civil: 'Infrastructure',
  construction: 'Infrastructure',
  urban: 'Infrastructure',

  mining: 'Mining',
  metals: 'Mining',
  coal: 'Mining',
  quarry: 'Mining',
  minerals: 'Mining',

  agriculture: 'Agriculture',
  agri: 'Agriculture',
  farming: 'Agriculture',
  forestry: 'Agriculture',

  utilities: 'Utilities',
  water: 'Utilities',
  electricity: 'Utilities',
  gas: 'Utilities',

  telecom: 'Telecom',
  telecommunications: 'Telecom',
  towers: 'Telecom',
  '5g': 'Telecom',

  defense: 'Defense & Aerospace',
  defence: 'Defense & Aerospace',
  security: 'Defense & Aerospace',
  aerospace: 'Defense & Aerospace',

  logistics: 'Logistics',
  transport: 'Logistics',
  ports: 'Logistics',
  railways: 'Logistics',

  survey: 'Survey & Mapping',
  mapping: 'Survey & Mapping',
  gis: 'Survey & Mapping',
};

export function normalizeSector(rawSector: string | null | undefined): string {
  if (!rawSector) return 'Uncategorized';
  const clean = rawSector.trim();
  if (!clean || /^(n\/a|null|nil|-|\?|tbd)$/i.test(clean)) return 'Uncategorized';

  const lower = clean.toLowerCase();
  
  // Exact alias lookup
  if (SECTOR_ALIASES[lower]) {
    return SECTOR_ALIASES[lower];
  }

  // Substring search in known aliases
  for (const [aliasKey, standardName] of Object.entries(SECTOR_ALIASES)) {
    if (lower.includes(aliasKey)) {
      return standardName;
    }
  }

  // Return title-cased original if unrecognized
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ==========================================
// 6. STAGE & PRIORITY NORMALIZATION
// ==========================================
export function normalizeStage(rawStage: string | null | undefined): {
  normalized: string;
  isWon: boolean;
  isLost: boolean;
  isOpen: boolean;
} {
  if (!rawStage) {
    return { normalized: 'Unknown Stage', isWon: false, isLost: false, isOpen: true };
  }
  const clean = rawStage.trim();
  const lower = clean.toLowerCase();

  if (/^(won|closed[\s_-]?won|won[\s_-]?signed|signed|deal[\s_-]?won|success)$/i.test(lower)) {
    return { normalized: 'Won', isWon: true, isLost: false, isOpen: false };
  }
  if (/^(lost|closed[\s_-]?lost|deal[\s_-]?lost|dropped|cancelled)$/i.test(lower)) {
    return { normalized: 'Lost', isWon: false, isLost: true, isOpen: false };
  }
  if (/^(lead|prospect|discovery|initial|contacted|qualif(ied|ication))$/i.test(lower)) {
    return { normalized: 'Lead / Discovery', isWon: false, isLost: false, isOpen: true };
  }
  if (/^(proposal|proposal[\s_-]?sent|rfp|pitch|quote|quoted)$/i.test(lower)) {
    return { normalized: 'Proposal Sent', isWon: false, isLost: false, isOpen: true };
  }
  if (/^(negotiat(ion|ing)|contract(ing)?|verbal|under[\s_-]?review|final(izing)?)$/i.test(lower)) {
    return { normalized: 'Negotiation', isWon: false, isLost: false, isOpen: true };
  }
  if (/^(on[\s_-]?hold|stalled|paused|delayed)$/i.test(lower)) {
    return { normalized: 'On Hold', isWon: false, isLost: false, isOpen: true };
  }

  return {
    normalized: clean.charAt(0).toUpperCase() + clean.slice(1),
    isWon: false,
    isLost: false,
    isOpen: true,
  };
}

export function normalizePriority(rawPriority: string | null | undefined): {
  normalized: string;
  isHigh: boolean;
} {
  if (!rawPriority) return { normalized: 'Medium', isHigh: false };
  const clean = rawPriority.trim().toLowerCase();

  if (/^(high|urgent|critical|immediate|p1|top)$/i.test(clean)) {
    return { normalized: 'High', isHigh: true };
  }
  if (/^(medium|normal|mod|p2|standard)$/i.test(clean)) {
    return { normalized: 'Medium', isHigh: false };
  }
  if (/^(low|minor|trivial|p3)$/i.test(clean)) {
    return { normalized: 'Low', isHigh: false };
  }

  return { normalized: rawPriority.trim(), isHigh: false };
}

// ==========================================
// 7. COMPLETE NORMALIZATION TRANSFORMERS
// ==========================================
export function normalizeDeals(
  items: MondayItem[],
  columns: MondayColumn[]
): {
  deals: DealItem[];
  columnMapping: Record<string, string>;
  qualityReport: DataQualityReport;
} {
  const columnMapping = detectColumnMapping(columns, DEAL_COLUMN_PATTERNS);
  const now = new Date();
  
  let missingValuesCount = 0;
  let missingDatesCount = 0;
  let missingSectorsCount = 0;
  let missingStagesCount = 0;

  const deals: DealItem[] = items.map((item) => {
    const rawStage = getColumnText(item, columnMapping.dealStage);
    const rawValue = getColumnText(item, columnMapping.dealValue);
    const rawRegion = getColumnText(item, columnMapping.region);
    const rawPriority = getColumnText(item, columnMapping.priority);
    const rawOwner = getColumnText(item, columnMapping.ownerCode);
    const rawClient = getColumnText(item, columnMapping.clientCode);
    const rawClosingDate = getColumnText(item, columnMapping.closingDate);
    const rawProduct = getColumnText(item, columnMapping.productDeal);
    const rawSector = getColumnText(item, columnMapping.sectorService);
    const rawCreated = getColumnText(item, columnMapping.createdDate);

    // Track missing values
    if (!rawValue) missingValuesCount++;
    if (!rawClosingDate) missingDatesCount++;
    if (!rawSector) missingSectorsCount++;
    if (!rawStage) missingStagesCount++;

    const numValue = parseNumberSafely(rawValue);
    const stageInfo = normalizeStage(rawStage);
    const priorityInfo = normalizePriority(rawPriority);
    const sector = normalizeSector(rawSector);
    const closingDateParsed = parseDateSafely(rawClosingDate);
    const createdDateParsed = parseDateSafely(rawCreated);

    // Determine overdue / delay status
    let isDelayedOrOverdue = false;
    if (stageInfo.isOpen && closingDateParsed.timestamp) {
      if (closingDateParsed.timestamp < now.getTime()) {
        isDelayedOrOverdue = true;
      }
    }

    return {
      id: item.id,
      name: item.name || getColumnText(item, columnMapping.name) || `Deal #${item.id}`,
      dealStage: stageInfo.normalized,
      rawDealStage: rawStage || 'Unassigned',
      dealValue: numValue,
      dealValueFormatted: formatCurrencyINR(numValue),
      region: rawRegion || 'Unspecified Region',
      priority: priorityInfo.normalized,
      ownerCode: rawOwner || 'Unassigned',
      clientCode: rawClient || 'Anonymous Client',
      closingDate: closingDateParsed.iso || closingDateParsed.display,
      closingDateRaw: rawClosingDate,
      productDeal: rawProduct || 'Standard Drone Services',
      sectorService: sector,
      createdDate: createdDateParsed.iso || createdDateParsed.display,
      isWon: stageInfo.isWon,
      isLost: stageInfo.isLost,
      isOpen: stageInfo.isOpen,
      isHighPriority: priorityInfo.isHigh,
      isDelayedOrOverdue,
      rawValues: {
        stage: rawStage,
        value: rawValue,
        region: rawRegion,
        priority: rawPriority,
        owner: rawOwner,
        client: rawClient,
        closingDate: rawClosingDate,
        product: rawProduct,
        sector: rawSector,
        created: rawCreated,
      },
    };
  });

  // Calculate Data Quality Metrics
  const total = deals.length || 1;
  const issues: DataQualityIssue[] = [];

  if (missingValuesCount > 0) {
    issues.push({
      field: 'Deal Value',
      missingCount: missingValuesCount,
      unparseableCount: 0,
      totalRecords: total,
      percentageComplete: Math.round(((total - missingValuesCount) / total) * 100),
      description: `${missingValuesCount} deal(s) have missing or unparseable financial value.`,
      severity: missingValuesCount > total * 0.2 ? 'high' : 'medium',
    });
  }

  if (missingDatesCount > 0) {
    issues.push({
      field: 'Closing Date',
      missingCount: missingDatesCount,
      unparseableCount: 0,
      totalRecords: total,
      percentageComplete: Math.round(((total - missingDatesCount) / total) * 100),
      description: `${missingDatesCount} deal(s) lack an expected closing date.`,
      severity: 'medium',
    });
  }

  if (missingSectorsCount > 0) {
    issues.push({
      field: 'Sector/Service',
      missingCount: missingSectorsCount,
      unparseableCount: 0,
      totalRecords: total,
      percentageComplete: Math.round(((total - missingSectorsCount) / total) * 100),
      description: `${missingSectorsCount} deal(s) are categorized under Unassigned/Uncategorized sector.`,
      severity: 'low',
    });
  }

  // Health score (100 minus penalty weights)
  const healthScore = Math.max(
    0,
    Math.round(
      100 -
        (missingValuesCount / total) * 40 -
        (missingDatesCount / total) * 20 -
        (missingSectorsCount / total) * 15 -
        (missingStagesCount / total) * 25
    )
  );

  const caveats: string[] = [];
  if (missingValuesCount > 0) {
    caveats.push(`Pipeline and revenue totals exclude ${missingValuesCount} deal(s) with missing deal values.`);
  }
  if (missingDatesCount > 0) {
    caveats.push(`${missingDatesCount} deal(s) have no target closing date.`);
  }
  if (missingSectorsCount > 0) {
    caveats.push(`${missingSectorsCount} deal(s) have unspecified industry sectors.`);
  }

  return {
    deals,
    columnMapping,
    qualityReport: {
      totalDeals: deals.length,
      totalWorkOrders: 0,
      missingDealValues: missingValuesCount,
      missingClosingDates: missingDatesCount,
      missingSectors: missingSectorsCount,
      missingStages: missingStagesCount,
      unmappedColumns: Object.keys(DEAL_COLUMN_PATTERNS).filter((k) => !columnMapping[k]),
      columnMappings: { deals: columnMapping, workOrders: {} },
      issues,
      dataHealthScore: healthScore,
      caveats,
    },
  };
}

export function normalizeWorkOrders(
  items: MondayItem[],
  columns: MondayColumn[]
): {
  workOrders: WorkOrderItem[];
  columnMapping: Record<string, string>;
} {
  const columnMapping = detectColumnMapping(columns, WORK_ORDER_COLUMN_PATTERNS);
  const now = new Date();

  const workOrders: WorkOrderItem[] = items.map((item) => {
    const rawClient = getColumnText(item, columnMapping.clientCode);
    const rawSector = getColumnText(item, columnMapping.sectorService);
    const rawValue = getColumnText(item, columnMapping.value);
    const rawStatus = getColumnText(item, columnMapping.status);
    const rawStart = getColumnText(item, columnMapping.startDate);
    const rawTarget = getColumnText(item, columnMapping.targetDate);
    const rawActual = getColumnText(item, columnMapping.actualDate);
    const rawDelayReason = getColumnText(item, columnMapping.delayReason);

    const numValue = parseNumberSafely(rawValue);
    const sector = normalizeSector(rawSector);
    const targetDateParsed = parseDateSafely(rawTarget);
    const actualDateParsed = parseDateSafely(rawActual);
    const startDateParsed = parseDateSafely(rawStart);

    const statusLower = (rawStatus || '').toLowerCase();
    const isCompleted =
      /^(completed|delivered|done|closed|finished)$/i.test(statusLower) || !!actualDateParsed.iso;
    const isDelayedExplicit =
      /^(delayed|behind|blocked|overdue|stalled)$/i.test(statusLower) || !!rawDelayReason;
    const isDelayedByDate =
      !isCompleted &&
      !!targetDateParsed.timestamp &&
      targetDateParsed.timestamp < now.getTime();
    
    const isDelayed = isDelayedExplicit || isDelayedByDate;
    const isInProgress = !isCompleted && !isDelayed;

    let normalizedStatus = 'In-Progress';
    if (isCompleted) normalizedStatus = 'Completed';
    else if (isDelayed) normalizedStatus = 'Delayed';
    else if (/^(yet\s*to\s*start|not\s*started|scheduled|planned)$/i.test(statusLower)) {
      normalizedStatus = 'Yet to Start';
    }

    return {
      id: item.id,
      name: item.name || getColumnText(item, columnMapping.name) || `Work Order #${item.id}`,
      clientCode: rawClient || 'Unspecified Client',
      sectorService: sector,
      value: numValue,
      valueFormatted: formatCurrencyINR(numValue),
      status: normalizedStatus,
      startDate: startDateParsed.iso || startDateParsed.display,
      targetDate: targetDateParsed.iso || targetDateParsed.display,
      actualDate: actualDateParsed.iso || actualDateParsed.display,
      delayReason: rawDelayReason || (isDelayedByDate ? 'Past target completion deadline' : null),
      isDelayed,
      isCompleted,
      isInProgress,
      rawValues: {
        client: rawClient,
        sector: rawSector,
        value: rawValue,
        status: rawStatus,
        start: rawStart,
        target: rawTarget,
        actual: rawActual,
        delayReason: rawDelayReason,
      },
    };
  });

  return { workOrders, columnMapping };
}

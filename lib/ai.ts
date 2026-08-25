// lib/ai.ts
// Google Gemini AI reasoning engine for Skylark Drones Business Intelligence

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  DealItem,
  WorkOrderItem,
  PipelineAnalytics,
  DataQualityReport,
} from '@/types';
import { formatCurrencyINR } from './normalization';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  '';

export function getGeminiModel(modelName = 'gemini-1.5-flash-latest') {
  if (!GEMINI_API_KEY) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2, // Low temperature for high quantitative accuracy and zero hallucination
      topP: 0.8,
      topK: 40,
    },
  });
}

/**
 * Builds a structured, high-density context string representing live Monday.com state
 */
function buildBusinessContext(
  analytics: PipelineAnalytics,
  deals: DealItem[],
  workOrders: WorkOrderItem[],
  qualityReport: DataQualityReport
): string {
  const isWorkOrdersAvailable = workOrders.length > 0;

  // Sector breakdown table
  const sectorSummary = analytics.sectors
    .map(
      (s) =>
        `- **${s.sector}**: Total Pipeline ${formatCurrencyINR(s.dealValue)} (${s.dealCount} deals) | Won: ${formatCurrencyINR(s.wonValue)} (${s.wonCount} deals) | Open: ${formatCurrencyINR(s.openValue)} (${s.openCount} deals)${
          isWorkOrdersAvailable
            ? ` | Operations: ${s.workOrderCount || 0} Work Orders (${formatCurrencyINR(s.workOrderValue || 0)}, ${s.delayedWorkOrders || 0} delayed)`
            : ''
        }`
    )
    .join('\n');

  // Stage breakdown table
  const stageSummary = analytics.stages
    .map(
      (st) =>
        `- **${st.stage}**: ${st.count} deals, ${formatCurrencyINR(st.value)} (${st.percentageOfTotal}% of total pipeline)`
    )
    .join('\n');

  // Delayed / Overdue items
  const delayedSummary =
    analytics.delayedDeals.length > 0
      ? analytics.delayedDeals
          .slice(0, 10)
          .map(
            (d) =>
              `- [DEAL] ${d.name} (${d.sectorService}) | Client: ${d.clientCode} | Value: ${d.dealValueFormatted} | Stage: ${d.dealStage} | Due: ${d.closingDate || 'No date'} | Owner: ${d.ownerCode}`
          )
          .join('\n')
      : 'No overdue deals identified.';

  // High Priority Risks
  const highPrioritySummary =
    analytics.highPriorityRisks.length > 0
      ? analytics.highPriorityRisks
          .slice(0, 10)
          .map(
            (d) =>
              `- [HIGH PRIORITY] ${d.name} (${d.sectorService}) | Value: ${d.dealValueFormatted} | Stage: ${d.dealStage} | Closing: ${d.closingDate || 'No date'} | Rep: ${d.ownerCode}`
          )
          .join('\n')
      : 'No high-priority open risks identified.';

  // Work Orders summary if present
  let woSummary = 'Work Orders board not connected or empty.';
  if (isWorkOrdersAvailable) {
    woSummary = `
- Total Work Orders: ${analytics.totalWorkOrdersCount}
- Total Work Orders Value: ${formatCurrencyINR(analytics.totalWorkOrdersValue)}
- Completed: ${analytics.completedWorkOrdersCount}
- In-Progress: ${analytics.inProgressWorkOrdersCount}
- Delayed/Blocked: ${analytics.delayedWorkOrdersCount} (${formatCurrencyINR(analytics.delayedWorkOrdersValue)} at risk)
- Delayed Work Orders List:
${workOrders
  .filter((w) => w.isDelayed)
  .slice(0, 8)
  .map(
    (w) =>
      `  * ${w.name} (${w.sectorService}) | Client: ${w.clientCode} | Value: ${w.valueFormatted} | Reason: ${w.delayReason || 'Past target date'}`
  )
  .join('\n') || '  None'}
`;
  }

  // Data Quality caveats
  const qualityCaveats =
    qualityReport.caveats.length > 0
      ? qualityReport.caveats.map((c) => `- ⚠️ ${c}`).join('\n')
      : 'All records contain complete essential fields.';

  return `
=== LIVE MONDAY.COM BUSINESS CONTEXT (READ-ONLY) ===
1. FINANCIAL & PIPELINE SUMMARY:
- Total Pipeline Value: ${formatCurrencyINR(analytics.totalPipelineValue)} across ${analytics.totalDealsCount} total deals
- Open Pipeline Value: ${formatCurrencyINR(analytics.openPipelineValue)} across ${analytics.openDealsCount} active open deals
- Won Revenue: ${formatCurrencyINR(analytics.wonPipelineValue)} across ${analytics.wonDealsCount} won deals
- Lost Revenue: ${formatCurrencyINR(analytics.lostPipelineValue)} across ${analytics.lostDealsCount} lost deals
- Win Rate by Count: ${analytics.winRateByCount}%
- Win Rate by Value: ${analytics.winRateByValue}%
- Average Deal Size: ${formatCurrencyINR(analytics.averageDealSize)}
- High Priority Deals: ${analytics.highPriorityDealsCount}
- Delayed/Overdue Deals: ${analytics.delayedDealsCount}

2. SECTOR-BY-SECTOR PERFORMANCE:
${sectorSummary}

3. PIPELINE STAGE BREAKDOWN:
${stageSummary}

4. OPERATIONAL EXECUTION / WORK ORDERS:
${woSummary}

5. OVERDUE / DELAYED DEALS:
${delayedSummary}

6. HIGH PRIORITY OPEN OPPORTUNITIES:
${highPrioritySummary}

7. DATA QUALITY & TRANSPARENCY AUDIT (Health Score: ${qualityReport.dataHealthScore}/100):
${qualityCaveats}
=====================================================
`;
}

/**
 * Generate AI Business Intelligence response to a founder's question
 */
export async function generateFounderInsight(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  deals: DealItem[],
  workOrders: WorkOrderItem[],
  analytics: PipelineAnalytics,
  qualityReport: DataQualityReport
): Promise<{
  content: string;
  isLeadershipUpdate: boolean;
  dataQualityWarnings: string[];
  suggestedFollowUps: string[];
}> {
  const model = getGeminiModel();
  const context = buildBusinessContext(analytics, deals, workOrders, qualityReport);

  const isLeadershipUpdateRequest =
    /leadership\s*update|board\s*deck|founder\s*briefing|executive\s*summary|weekly\s*update|monthly\s*update/i.test(
      question
    );

  // If Gemini API Key is missing, provide an intelligent deterministic analytical response
  if (!model) {
    return generateDeterministicInsight(
      question,
      analytics,
      deals,
      workOrders,
      qualityReport,
      isLeadershipUpdateRequest
    );
  }

  const systemPrompt = `
You are the Executive Business Intelligence AI Agent for the leadership and founders of Skylark Drones.
You analyze LIVE business data retrieved dynamically from Monday.com boards (Deals Sales Funnel & Work Orders Operations).

CRITICAL OPERATING RULES:
1. FOUNDER PERSONA: Respond like a top-tier VP of Revenue / Chief of Staff. Be direct, authoritative, quantitative, and concise. Avoid fluff.
2. ZERO HALLUCINATION: ONLY state numbers and facts present in the provided LIVE context. NEVER invent numbers, clients, or dates.
3. STRUCTURED EXECUTIVE FORMAT:
   - **Executive Takeaway**: 1-2 sentence direct answer to the founder's question first.
   - **Key Metrics & Numbers**: Hard numbers with currency symbols (${formatCurrencyINR(100000).charAt(0)}) and percentages.
   - **Deep Dive / Sector Insights**: Specific sector or stage breakdown addressing the question.
   - **Operational Risks & Delays**: Mention delayed projects or high-priority risks relevant to the query.
   - **Data Quality & Caveats**: Explicitly disclose missing records (e.g., "Note: Excludes X deals missing value").
   - **Recommended Action**: 2 actionable bullets for executive decision-making.
4. LEADERSHIP UPDATE MODE:
   If the user asks for a "leadership update" or "board briefing", structure the response as a formal, presentation-ready briefing:
   - 🎯 **Executive Headline**
   - 📈 **Pipeline & Revenue Traction**
   - 🏭 **Sector Performance (Top Drivers)**
   - ⚠️ **Operational Delivery & Delays**
   - 🛡️ **Data Quality Notice**
   - 🚀 **Next Steps for Leadership**
5. AMBIGUITY HANDLING: If the query is ambiguous, provide the best available data and ask 1 brief clarifying question.
`;

  try {
    const formattedHistory = history.slice(-4).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({
      history: formattedHistory as any,
    });

    const userPrompt = `
${systemPrompt}

${context}

USER QUESTION: "${question}"

Please provide your executive business intelligence analysis now.
`;

    const result = await chat.sendMessage(userPrompt);
    const text = result.response.text();

    return {
      content: text,
      isLeadershipUpdate: isLeadershipUpdateRequest,
      dataQualityWarnings: qualityReport.caveats,
      suggestedFollowUps: generateSmartFollowUps(question, analytics),
    };
  } catch (error: any) {
    console.error('Gemini API execution error:', error);
    // Fallback to deterministic engine if Gemini fails
    return generateDeterministicInsight(
      question,
      analytics,
      deals,
      workOrders,
      qualityReport,
      isLeadershipUpdateRequest
    );
  }
}

/**
 * High-accuracy fallback engine if Gemini API key is not configured or network fails
 */
function generateDeterministicInsight(
  question: string,
  analytics: PipelineAnalytics,
  deals: DealItem[],
  workOrders: WorkOrderItem[],
  qualityReport: DataQualityReport,
  isLeadershipUpdate: boolean
): {
  content: string;
  isLeadershipUpdate: boolean;
  dataQualityWarnings: string[];
  suggestedFollowUps: string[];
} {
  const q = question.toLowerCase();

  // 1. Leadership Update
  if (isLeadershipUpdate) {
    const topSector = analytics.sectors[0] || { sector: 'None', dealValue: 0, wonValue: 0 };
    const content = `
### 🎯 Executive Leadership Briefing

**Headline:** Total pipeline stands at **${formatCurrencyINR(analytics.totalPipelineValue)}** across **${analytics.totalDealsCount} deals**, with **${formatCurrencyINR(analytics.wonPipelineValue)}** in closed-won revenue (${analytics.winRateByValue}% win rate by value).

---

### 📈 Financial & Pipeline Overview
* **Active Open Pipeline:** ${formatCurrencyINR(analytics.openPipelineValue)} (${analytics.openDealsCount} deals in progress)
* **Won Revenue:** ${formatCurrencyINR(analytics.wonPipelineValue)} (${analytics.wonDealsCount} signed deals)
* **Average Deal Size:** ${formatCurrencyINR(analytics.averageDealSize)}
* **Win Rate:** ${analytics.winRateByCount}% by deal count (${analytics.winRateByValue}% by value)

---

### 🏭 Sector Performance Highlights
${analytics.sectors
  .slice(0, 4)
  .map(
    (s) =>
      `* **${s.sector}:** ${formatCurrencyINR(s.dealValue)} pipeline (${s.dealCount} deals) | Won: ${formatCurrencyINR(s.wonValue)}`
  )
  .join('\n')}

---

### ⚠️ Delivery & Operational Risks
* **Delayed / Overdue Deals:** ${analytics.delayedDealsCount} deals require immediate rep follow-up.
* **High Priority Open Deals:** ${analytics.highPriorityDealsCount} deals currently in active pipeline.
${
  workOrders.length > 0
    ? `* **Operations Backlog:** ${analytics.delayedWorkOrdersCount || 0} work orders delayed (${formatCurrencyINR(analytics.delayedWorkOrdersValue || 0)} at risk).`
    : ''
}

---

### 🛡️ Data Quality Disclosures
${qualityReport.caveats.length > 0 ? qualityReport.caveats.map((c) => `* ⚠️ ${c}`).join('\n') : '* Data completeness is 100% across all required fields.'}

---

### 🚀 Recommended Leadership Actions
1. **Accelerate ${topSector.sector} Closing:** Focus executive sponsorship on late-stage ${topSector.sector} opportunities.
2. **Clear Overdue Pipeline:** Conduct pipeline triage on ${analytics.delayedDealsCount} deals past their target closing date.
`;
    return {
      content,
      isLeadershipUpdate: true,
      dataQualityWarnings: qualityReport.caveats,
      suggestedFollowUps: generateSmartFollowUps(question, analytics),
    };
  }

  // 2. Delayed Projects / Overdue Deals
  if (q.includes('delayed') || q.includes('overdue') || q.includes('block') || q.includes('risk')) {
    const content = `
### ⚠️ Delayed & At-Risk Projects Overview

We have **${analytics.delayedDealsCount} deals** currently marked overdue or past target closing date, and **${analytics.highPriorityRisks.length} high-priority opportunities** requiring attention.

#### 🔴 Overdue Deals Breakdown:
${
  analytics.delayedDeals.length > 0
    ? analytics.delayedDeals
        .slice(0, 6)
        .map(
          (d) =>
            `* **${d.name}** (${d.sectorService}) — Value: **${d.dealValueFormatted}** | Stage: \`${d.dealStage}\` | Rep: ${d.ownerCode} | Target: ${d.closingDate || 'Unspecified'}`
        )
        .join('\n')
    : '* No overdue deals found in the dataset.'
}

${
  workOrders.length > 0
    ? `#### 🛠️ Operational Work Orders Delays:
* **Delayed Work Orders:** ${analytics.delayedWorkOrdersCount || 0} projects (${formatCurrencyINR(analytics.delayedWorkOrdersValue || 0)} value at risk)
${workOrders
  .filter((w) => w.isDelayed)
  .slice(0, 5)
  .map((w) => `* **${w.name}** (${w.sectorService}) — Value: ${w.valueFormatted} | Reason: ${w.delayReason || 'Overdue'}`)
  .join('\n')}`
    : ''
}

---
#### 🛡️ Data Quality Notes:
${qualityReport.caveats.length > 0 ? qualityReport.caveats.map((c) => `* ⚠️ ${c}`).join('\n') : '* All dates are verified against live Monday records.'}
`;
    return {
      content,
      isLeadershipUpdate: false,
      dataQualityWarnings: qualityReport.caveats,
      suggestedFollowUps: generateSmartFollowUps(question, analytics),
    };
  }

  // 3. Sector / Energy query
  const sectorFound = analytics.sectors.find((s) => q.includes(s.sector.toLowerCase()));
  if (sectorFound || q.includes('sector') || q.includes('industry')) {
    const targetSector = sectorFound || analytics.sectors[0];
    const matchingDeals = deals.filter(
      (d) => d.sectorService.toLowerCase() === targetSector?.sector.toLowerCase()
    );

    const content = `
### 🏭 Sector Intelligence: **${targetSector.sector}**

**Executive Summary:** The **${targetSector.sector}** sector accounts for **${formatCurrencyINR(targetSector.dealValue)}** across **${targetSector.dealCount} deals** (**${formatCurrencyINR(targetSector.wonValue)}** closed won).

#### 📊 Performance Breakdown:
* **Total Pipeline:** ${formatCurrencyINR(targetSector.dealValue)} (${targetSector.dealCount} deals)
* **Closed Won:** ${formatCurrencyINR(targetSector.wonValue)} (${targetSector.wonCount} deals)
* **Open Active Pipeline:** ${formatCurrencyINR(targetSector.openValue)} (${targetSector.openCount} deals)
${targetSector.workOrderCount ? `* **Operational Work Orders:** ${targetSector.workOrderCount} projects (${formatCurrencyINR(targetSector.workOrderValue || 0)}), ${targetSector.delayedWorkOrders || 0} delayed` : ''}

#### 💼 Key Opportunities in ${targetSector.sector}:
${matchingDeals
  .slice(0, 6)
  .map((d) => `* **${d.name}** — ${d.dealValueFormatted} | Stage: \`${d.dealStage}\` | Client: ${d.clientCode}`)
  .join('\n')}

---
#### 🛡️ Data Quality Notes:
${qualityReport.caveats.length > 0 ? qualityReport.caveats.map((c) => `* ⚠️ ${c}`).join('\n') : '* No data anomalies in this sector.'}
`;
    return {
      content,
      isLeadershipUpdate: false,
      dataQualityWarnings: qualityReport.caveats,
      suggestedFollowUps: generateSmartFollowUps(question, analytics),
    };
  }

  // Default Pipeline Overview
  const content = `
### 📊 Pipeline & Business Intelligence Overview

**Direct Takeaway:** Total tracked pipeline is **${formatCurrencyINR(analytics.totalPipelineValue)}** across **${analytics.totalDealsCount} deals**, with **${formatCurrencyINR(analytics.wonPipelineValue)}** in closed revenue.

#### 📈 Key Metrics:
* **Active Open Pipeline:** ${formatCurrencyINR(analytics.openPipelineValue)} (${analytics.openDealsCount} deals)
* **Won Revenue:** ${formatCurrencyINR(analytics.wonPipelineValue)} (${analytics.wonDealsCount} deals)
* **Win Rate:** ${analytics.winRateByCount}% by count | ${analytics.winRateByValue}% by value
* **Average Deal Size:** ${formatCurrencyINR(analytics.averageDealSize)}
* **Overdue Deals:** ${analytics.delayedDealsCount} deals

#### 🏆 Top Sectors by Pipeline:
${analytics.sectors
  .slice(0, 3)
  .map((s) => `* **${s.sector}:** ${formatCurrencyINR(s.dealValue)} (${s.dealCount} deals)`)
  .join('\n')}

---
#### 🛡️ Data Quality Transparency:
${qualityReport.caveats.length > 0 ? qualityReport.caveats.map((c) => `* ⚠️ ${c}`).join('\n') : '* Clean verified data from Monday.com.'}
`;
  return {
    content,
    isLeadershipUpdate: false,
    dataQualityWarnings: qualityReport.caveats,
    suggestedFollowUps: generateSmartFollowUps(question, analytics),
  };
}

function generateSmartFollowUps(question: string, analytics: PipelineAnalytics): string[] {
  const topSector = analytics.sectors[0]?.sector || 'Energy';
  const followUps = [
    `How is the ${topSector} sector performing?`,
    'Which projects are delayed?',
    'Compare Energy deals with Energy work orders.',
    'Prepare a leadership update.',
  ];
  return followUps.filter((f) => !f.toLowerCase().includes(question.toLowerCase())).slice(0, 3);
}

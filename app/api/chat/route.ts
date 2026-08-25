// app/api/chat/route.ts
// AI Executive Business Intelligence Chat Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { fetchDealsBoardData, fetchWorkOrdersBoardData, getMondayCredentials } from '@/lib/monday';
import { normalizeDeals, normalizeWorkOrders } from '@/lib/normalization';
import { computePipelineAnalytics, filterDeals } from '@/lib/analytics';
import { generateFounderInsight } from '@/lib/ai';
import { ChatMessage, FilterState } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], filters = {} } = body as {
      message: string;
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
      filters?: FilterState;
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'A valid question message is required.' },
        { status: 400 }
      );
    }

    const creds = getMondayCredentials();

    // Check credentials
    if (!creds.isTokenSet || !creds.isDealsBoardSet) {
      return NextResponse.json(
        {
          error:
            'Monday.com API is not configured. Please set MONDAY_API_TOKEN and DEALS_BOARD_ID in your environment variables (.env.local) to enable live queries.',
          isConfigured: false,
        },
        { status: 400 }
      );
    }

    // 1. Fetch live data from Monday.com boards
    const [dealsResult, woResult] = await Promise.all([
      fetchDealsBoardData(false),
      fetchWorkOrdersBoardData(false),
    ]);

    if (dealsResult.error) {
      return NextResponse.json(
        {
          error: `Monday.com API Error: ${dealsResult.error}`,
          isConfigured: true,
        },
        { status: 502 }
      );
    }

    // 2. Normalize raw data
    const { deals, qualityReport } = normalizeDeals(
      dealsResult.items,
      dealsResult.columns
    );

    let normalizedWorkOrders: any[] = [];
    if (woResult.items.length > 0) {
      const woNorm = normalizeWorkOrders(woResult.items, woResult.columns);
      normalizedWorkOrders = woNorm.workOrders;
      qualityReport.totalWorkOrders = normalizedWorkOrders.length;
    }

    // 3. Apply any user-selected active filters if requested
    const filteredDeals = filterDeals(deals, filters);

    // 4. Compute dynamic business intelligence metrics
    const analytics = computePipelineAnalytics(filteredDeals, normalizedWorkOrders);

    // 5. Generate AI reasoning with Gemini
    const aiResponse = await generateFounderInsight(
      message,
      history,
      filteredDeals,
      normalizedWorkOrders,
      analytics,
      qualityReport
    );

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date().toISOString(),
      metricsSnapshot: {
        totalPipelineValue: analytics.totalPipelineValue,
        openPipelineValue: analytics.openPipelineValue,
        wonPipelineValue: analytics.wonPipelineValue,
        totalDealsCount: analytics.totalDealsCount,
        openDealsCount: analytics.openDealsCount,
        wonDealsCount: analytics.wonDealsCount,
        winRateByValue: analytics.winRateByValue,
        delayedDealsCount: analytics.delayedDealsCount,
      },
      dataQualityCaveats: aiResponse.dataQualityWarnings,
      isLeadershipUpdate: aiResponse.isLeadershipUpdate,
      suggestedFollowUps: aiResponse.suggestedFollowUps,
    };

    return NextResponse.json({
      success: true,
      message: assistantMessage,
      analytics,
      qualityReport,
      itemCount: filteredDeals.length,
    });
  } catch (error: any) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json(
      {
        error: error?.message || 'An unexpected error occurred while processing the BI query.',
      },
      { status: 500 }
    );
  }
}

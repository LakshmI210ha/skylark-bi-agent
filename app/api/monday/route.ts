// app/api/monday/route.ts
// API Route for live Monday.com synchronization, diagnostics, and column introspection

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchDealsBoardData,
  fetchWorkOrdersBoardData,
  testMondayConnection,
  getMondayCredentials,
} from '@/lib/monday';
import { normalizeDeals, normalizeWorkOrders } from '@/lib/normalization';
import { computePipelineAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const creds = getMondayCredentials();

    if (!creds.isTokenSet || !creds.isDealsBoardSet) {
      return NextResponse.json(
        {
          success: false,
          isConfigured: false,
          error:
            'Monday.com API credentials are not fully configured. Please set MONDAY_API_TOKEN and DEALS_BOARD_ID in your .env file.',
          credentialsStatus: {
            isTokenSet: creds.isTokenSet,
            isDealsBoardSet: creds.isDealsBoardSet,
            isWorkOrdersBoardSet: creds.isWorkOrdersBoardSet,
          },
        },
        { status: 200 }
      );
    }

    // Fetch Deals & Work Orders in parallel
    const [dealsResult, woResult] = await Promise.all([
      fetchDealsBoardData(forceRefresh),
      fetchWorkOrdersBoardData(forceRefresh),
    ]);

    if (dealsResult.error) {
      return NextResponse.json(
        {
          success: false,
          isConfigured: true,
          error: `Error querying Deals board: ${dealsResult.error}`,
          boardId: creds.dealsBoardId,
        },
        { status: 500 }
      );
    }

    // Normalize items
    const { deals, columnMapping: dealsMapping, qualityReport } = normalizeDeals(
      dealsResult.items,
      dealsResult.columns
    );

    let normalizedWorkOrders: any[] = [];
    let woMapping: Record<string, string> = {};

    if (woResult.items.length > 0) {
      const woNorm = normalizeWorkOrders(woResult.items, woResult.columns);
      normalizedWorkOrders = woNorm.workOrders;
      woMapping = woNorm.columnMapping;
      qualityReport.totalWorkOrders = normalizedWorkOrders.length;
      qualityReport.columnMappings.workOrders = woMapping;
    }

    // Calculate Analytics
    const analytics = computePipelineAnalytics(deals, normalizedWorkOrders);

    return NextResponse.json({
      success: true,
      isConfigured: true,
      boardInfo: {
        dealsBoardName: dealsResult.board?.name || 'Deals Board',
        dealsItemCount: deals.length,
        workOrdersBoardName: woResult.board?.name || 'Work Orders Board',
        workOrdersItemCount: normalizedWorkOrders.length,
        lastSynced: new Date().toISOString(),
      },
      deals,
      workOrders: normalizedWorkOrders,
      analytics,
      qualityReport,
      columnMappings: {
        deals: dealsMapping,
        workOrders: woMapping,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/monday GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error while syncing with Monday.com',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Test connection endpoint
  try {
    const conn = await testMondayConnection();
    return NextResponse.json(conn);
  } catch (error: any) {
    return NextResponse.json(
      { connected: false, error: error?.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}

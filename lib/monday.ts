// lib/monday.ts
// Monday.com GraphQL API Client (Strictly Read-Only)

import { MondayBoard, MondayItem, MondayColumn } from '@/types';

const MONDAY_API_URL = 'https://api.monday.com/v2';

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
  status: number;
}

export interface BoardFetchResult {
  board: MondayBoard | null;
  items: MondayItem[];
  columns: MondayColumn[];
  error?: string;
  isConfigured: boolean;
}

// In-memory cache to optimize performance and prevent rate-limiting
interface CacheEntry {
  data: BoardFetchResult;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function getMondayCredentials() {
  const token =
    process.env.MONDAY_API_TOKEN ||
    process.env.MONDAY_TOKEN ||
    process.env.NEXT_PUBLIC_MONDAY_API_TOKEN ||
    '';

  const dealsBoardId =
    process.env.DEALS_BOARD_ID ||
    process.env.MONDAY_BOARD_ID ||
    process.env.NEXT_PUBLIC_DEALS_BOARD_ID ||
    '';

  const workOrdersBoardId =
    process.env.WORK_ORDERS_BOARD_ID ||
    process.env.NEXT_PUBLIC_WORK_ORDERS_BOARD_ID ||
    '';

  return {
    token: token.trim(),
    dealsBoardId: dealsBoardId.trim(),
    workOrdersBoardId: workOrdersBoardId.trim(),
    isTokenSet: !!token.trim(),
    isDealsBoardSet: !!dealsBoardId.trim(),
    isWorkOrdersBoardSet: !!workOrdersBoardId.trim(),
  };
}

/**
 * Execute raw GraphQL query against Monday.com API v2
 */
export async function executeMondayGraphQL<T>(
  query: string,
  variables: Record<string, any> = {},
  tokenOverride?: string
): Promise<GraphQLResponse<T>> {
  const { token } = getMondayCredentials();
  const apiToken = tokenOverride || token;

  if (!apiToken) {
    return {
      errors: [{ message: 'Monday.com API Token (MONDAY_API_TOKEN) is not configured in environment.' }],
      status: 401,
    };
  }

  try {
    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 0 },
    });

    const json = await response.json();

    if (!response.ok || json.errors) {
      const errorMsg =
        json.errors?.map((e: any) => e.message).join(' | ') || `HTTP ${response.status} Error`;
      return {
        errors: json.errors || [{ message: errorMsg }],
        status: response.status,
      };
    }

    return { data: json.data, status: 200 };
  } catch (err: any) {
    return {
      errors: [{ message: err?.message || 'Network error connecting to Monday.com API' }],
      status: 500,
    };
  }
}

/**
 * Fetches all items and columns for a given Monday Board with cursor-based pagination
 */
export async function fetchMondayBoard(
  boardId: string,
  forceRefresh = false
): Promise<BoardFetchResult> {
  const { token } = getMondayCredentials();

  if (!token || !boardId) {
    return {
      board: null,
      items: [],
      columns: [],
      error: !token
        ? 'MONDAY_API_TOKEN environment variable is missing.'
        : 'Board ID is not specified.',
      isConfigured: false,
    };
  }

  const cacheKey = `board_${boardId}`;
  if (!forceRefresh && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    return cache[cacheKey].data;
  }

  // GraphQL query to get board schema and first page of items
  const query = `
    query GetBoardItems($boardId: [ID!], $limit: Int!, $cursor: String) {
      boards(ids: $boardId) {
        id
        name
        columns {
          id
          title
          type
        }
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            created_at
            updated_at
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  try {
    let allItems: MondayItem[] = [];
    let boardMetadata: MondayBoard | null = null;
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const MAX_PAGES = 10; // safety ceiling (up to 5,000 records)

    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;
      const result: GraphQLResponse<{ boards: MondayBoard[] }> =
        await executeMondayGraphQL<{ boards: MondayBoard[] }>(query, {
          boardId: [boardId],
          limit: 500,
          cursor,
        });

      if (result.errors || !result.data?.boards?.length) {
        const errorMsg =
          result.errors?.[0]?.message || `Board ID ${boardId} not found or inaccessible.`;
        return {
          board: null,
          items: [],
          columns: [],
          error: errorMsg,
          isConfigured: true,
        };
      }

      const board = result.data.boards[0];
      if (!boardMetadata) {
        boardMetadata = board;
      }

      const items = board.items_page?.items || [];
      allItems = allItems.concat(items);

      cursor = board.items_page?.cursor || null;
      hasMore = !!cursor && items.length > 0;
    }

    const finalResult: BoardFetchResult = {
      board: boardMetadata,
      items: allItems,
      columns: boardMetadata?.columns || [],
      isConfigured: true,
    };

    cache[cacheKey] = {
      data: finalResult,
      timestamp: Date.now(),
    };

    return finalResult;
  } catch (err: any) {
    return {
      board: null,
      items: [],
      columns: [],
      error: err?.message || 'Failed to query Monday.com board.',
      isConfigured: true,
    };
  }
}

/**
 * Fetches Deals board dynamically
 */
export async function fetchDealsBoardData(forceRefresh = false): Promise<BoardFetchResult> {
  const { dealsBoardId } = getMondayCredentials();
  return fetchMondayBoard(dealsBoardId, forceRefresh);
}

/**
 * Fetches Work Orders board dynamically
 */
export async function fetchWorkOrdersBoardData(forceRefresh = false): Promise<BoardFetchResult> {
  const { workOrdersBoardId } = getMondayCredentials();
  if (!workOrdersBoardId) {
    return {
      board: null,
      items: [],
      columns: [],
      error: 'WORK_ORDERS_BOARD_ID is not configured.',
      isConfigured: false,
    };
  }
  return fetchMondayBoard(workOrdersBoardId, forceRefresh);
}

/**
 * Diagnostic health check for Monday.com credentials
 */
export async function testMondayConnection(): Promise<{
  connected: boolean;
  user?: string;
  dealsBoardFound: boolean;
  dealsBoardName?: string;
  dealsItemCount?: number;
  workOrdersBoardFound: boolean;
  workOrdersBoardName?: string;
  workOrdersItemCount?: number;
  error?: string;
}> {
  const { token, dealsBoardId, workOrdersBoardId } = getMondayCredentials();

  if (!token) {
    return {
      connected: false,
      dealsBoardFound: false,
      workOrdersBoardFound: false,
      error: 'MONDAY_API_TOKEN is missing.',
    };
  }

  const query = `
    query TestConnection($boardIds: [ID!]) {
      me {
        id
        name
        email
      }
      boards(ids: $boardIds) {
        id
        name
        items_page(limit: 1) {
          items {
            id
          }
        }
      }
    }
  `;

  const targetBoards = [dealsBoardId, workOrdersBoardId].filter(Boolean);
  const res: GraphQLResponse<{
    me: { id: string; name: string; email: string };
    boards: Array<{ id: string; name: string }>;
  }> = await executeMondayGraphQL<{
    me: { id: string; name: string; email: string };
    boards: Array<{ id: string; name: string }>;
  }>(query, { boardIds: targetBoards });

  if (res.errors || !res.data) {
    return {
      connected: false,
      dealsBoardFound: false,
      workOrdersBoardFound: false,
      error: res.errors?.[0]?.message || 'Failed to authenticate with Monday.com API.',
    };
  }

  const dealsBoard = res.data.boards?.find((b) => b.id === dealsBoardId);
  const woBoard = res.data.boards?.find((b) => b.id === workOrdersBoardId);

  return {
    connected: true,
    user: `${res.data.me?.name} (${res.data.me?.email})`,
    dealsBoardFound: !!dealsBoard,
    dealsBoardName: dealsBoard?.name,
    workOrdersBoardFound: !!woBoard,
    workOrdersBoardName: woBoard?.name,
  };
}

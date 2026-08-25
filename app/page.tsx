// app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ExecutiveHeader } from '@/components/ExecutiveHeader';
import { KPICards } from '@/components/KPICards';
import { FilterBar } from '@/components/FilterBar';
import { ChatInterface } from '@/components/ChatInterface';
import { PipelineBreakdownView } from '@/components/PipelineBreakdownView';
import { ConnectionPanel } from '@/components/ConnectionPanel';
import {
  PipelineAnalytics,
  DataQualityReport,
  DealItem,
  WorkOrderItem,
  FilterState,
} from '@/types';
import { filterDeals } from '@/lib/analytics';
import {
  AlertCircle,
  Key,
  Database,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  BarChart3,
  Bot,
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [boardInfo, setBoardInfo] = useState<any>(null);

  const [filters, setFilters] = useState<FilterState>({
    stage: 'ALL',
    sector: 'ALL',
    priority: 'ALL',
    region: 'ALL',
    owner: 'ALL',
    search: '',
  });

  const loadMondayData = async (forceRefresh = false) => {
    if (forceRefresh) setSyncing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/monday${forceRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();

      setIsConfigured(data.isConfigured !== false);

      if (!res.ok || data.error) {
        if (!data.isConfigured) {
          setIsConfigured(false);
          setIsConnected(false);
        } else {
          setError(data.error);
        }
      }

      if (data.success) {
        setIsConnected(true);
        setAnalytics(data.analytics);
        setQualityReport(data.qualityReport);
        setDeals(data.deals || []);
        setWorkOrders(data.workOrders || []);
        setBoardInfo(data.boardInfo);
      }
    } catch (err: any) {
      console.error('Failed to sync Monday data:', err);
      setError(err?.message || 'Failed to connect to backend service.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadMondayData();
  }, []);

  const filteredDeals = filterDeals(deals, filters);

  return (
    <div className="min-h-screen bg-[#080C16] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <ExecutiveHeader
        isConfigured={isConfigured}
        isConnected={isConnected}
        lastSynced={boardInfo?.lastSynced}
        isSyncing={syncing}
        onRefresh={() => loadMondayData(true)}
        onOpenSettings={() => setShowSettings(true)}
        qualityReport={qualityReport}
        totalDeals={deals.length}
        totalWorkOrders={workOrders.length}
      />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto w-full px-4 lg:px-8 py-4 flex-1 flex flex-col">
        {/* Setup Notification Banner if credentials are not configured */}
        {!isConfigured && !loading && (
          <div className="glass-card p-5 mb-4 border-blue-500/30 bg-[#0E1526] rounded-2xl text-slate-200 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Monday.com Live GraphQL Integration Ready
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/30">
                    Live Data Mode
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  To query your real Deals and Work Orders boards live, configure your credentials in{' '}
                  <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">.env.local</code>:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 flex flex-wrap gap-x-6 gap-y-1 mt-1.5">
                  <div>MONDAY_API_TOKEN=&lt;token&gt;</div>
                  <div>DEALS_BOARD_ID=&lt;deals_id&gt;</div>
                  <div>WORK_ORDERS_BOARD_ID=&lt;wo_id&gt;</div>
                  <div>GEMINI_API_KEY=&lt;gemini_key&gt;</div>
                </div>
              </div>
              <button
                onClick={() => loadMondayData(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shrink-0 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Test Connection Now</span>
              </button>
            </div>
          </div>
        )}

        {/* API Error Notification */}
        {error && (
          <div className="p-3.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Monday.com Sync Notice:</strong> {error}
            </div>
          </div>
        )}

        {/* KPI Summary Cards */}
        <KPICards analytics={analytics} loading={loading} />

        {/* Multi-Dimensional Control & Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          sectors={analytics?.sectors || []}
          stages={analytics?.stages || []}
          totalFiltered={filteredDeals.length}
          totalTotal={deals.length}
        />

        {/* Main Content Grid: Left 65% Analytics + Right 35% AI Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 mt-1">
          {/* Left ~65%: Deep BI & Visual Pipeline Breakdown */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <PipelineBreakdownView
              analytics={analytics}
              deals={filteredDeals}
              workOrders={workOrders}
              qualityReport={qualityReport}
              boardInfo={boardInfo}
            />
          </div>

          {/* Right ~35%: AI Executive Assistant */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-120px)]">
            <ChatInterface
              analytics={analytics}
              filters={filters}
              onRefreshData={() => loadMondayData(true)}
            />
          </div>
        </div>
      </div>

      {/* Settings / Connection Modal */}
      <ConnectionPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isConnected={isConnected}
        isConfigured={isConfigured}
        lastSynced={boardInfo?.lastSynced}
        boardInfo={boardInfo}
        onRefresh={() => loadMondayData(true)}
      />

      {/* Discreet Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#05080F] py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span className="font-medium text-slate-400">
            Skylark Drones • Business Intelligence Platform
          </span>
          <span className="text-[11px] text-slate-500">
            Monday.com • Read-only GraphQL • AI Analytics
          </span>
        </div>
      </footer>
    </div>
  );
}

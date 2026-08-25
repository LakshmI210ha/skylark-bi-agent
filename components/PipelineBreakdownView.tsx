// components/PipelineBreakdownView.tsx
'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Layers,
  AlertCircle,
  Table,
  CheckCircle2,
  Clock,
  Briefcase,
  Flame,
  ArrowUpDown,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { PipelineAnalytics, DealItem, WorkOrderItem, DataQualityReport } from '@/types';
import { formatCurrencyINR } from '@/lib/normalization';
import { DataQualityDrawer } from './DataQualityDrawer';

interface PipelineBreakdownViewProps {
  analytics: PipelineAnalytics | null;
  deals: DealItem[];
  workOrders: WorkOrderItem[];
  qualityReport?: DataQualityReport | null;
  boardInfo?: any;
}

export const PipelineBreakdownView: React.FC<PipelineBreakdownViewProps> = ({
  analytics,
  deals,
  workOrders,
  qualityReport,
  boardInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'sectors' | 'operations' | 'delayed' | 'quality' | 'explorer'>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [woSearchTerm, setWoSearchTerm] = useState('');
  const [woStatusFilter, setWoStatusFilter] = useState('ALL');

  if (!analytics) {
    return (
      <div className="glass-card p-8 text-center text-slate-400 border border-slate-800 bg-[#0E1526] rounded-2xl">
        Loading business intelligence analytics from Monday.com...
      </div>
    );
  }

  const filteredDeals = deals.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.sectorService.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ownerCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (woStatusFilter !== 'ALL' && wo.status.toLowerCase() !== woStatusFilter.toLowerCase()) {
      return false;
    }
    if (woSearchTerm) {
      const q = woSearchTerm.toLowerCase();
      return (
        wo.name.toLowerCase().includes(q) ||
        wo.clientCode.toLowerCase().includes(q) ||
        wo.sectorService.toLowerCase().includes(q) ||
        (wo.delayReason && wo.delayReason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Funnel', icon: Layers },
    { id: 'sectors', label: 'Sectors Matrix', icon: BarChart3 },
    { id: 'operations', label: `Work Orders (${workOrders.length})`, icon: Truck },
    { id: 'delayed', label: `Delays & Risks (${analytics.delayedDealsCount + (analytics.delayedWorkOrdersCount || 0)})`, icon: AlertCircle },
    { id: 'quality', label: `Data Quality (${qualityReport?.dataHealthScore ?? 100}%)`, icon: ShieldCheck },
    { id: 'explorer', label: `Deals Table (${deals.length})`, icon: Table },
  ];

  return (
    <div className="glass-card border border-slate-800 bg-[#0E1526]/95 shadow-xl rounded-2xl overflow-hidden flex flex-col min-h-[750px]">
      {/* Tab Navigation Header */}
      <div className="p-2.5 px-4 border-b border-slate-800 bg-[#0A0F1E] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'explorer' && (
          <input
            type="text"
            placeholder="Search deals in table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 w-48 placeholder-slate-500"
          />
        )}
      </div>

      {/* Tab Contents */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {/* TAB 1: PIPELINE FUNNEL */}
        {activeTab === 'pipeline' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Sales Pipeline Stage Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time opportunity conversion and value concentration across pipeline stages
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {analytics.stages.map((st) => {
                const isWon = st.stage.toLowerCase() === 'won';
                const isLost = st.stage.toLowerCase() === 'lost';
                return (
                  <div
                    key={st.stage}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-white text-sm tracking-tight">{st.stage}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700">
                          {st.count} deal{st.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-400 text-sm">{formatCurrencyINR(st.value)}</span>
                        <span className="text-slate-400 text-xs">({st.percentageOfTotal}% of pipeline)</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWon
                            ? 'bg-teal-400'
                            : isLost
                            ? 'bg-slate-600'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(st.percentageOfTotal, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SECTORS */}
        {activeTab === 'sectors' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Sector Pipeline & Operational Load Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing sales pipeline volume against execution backlog across all industry domains
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0A0F1E] text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-3 px-3.5">Sector / Domain</th>
                    <th className="py-3 px-3.5 text-right">Total Pipeline</th>
                    <th className="py-3 px-3.5 text-right">Deals</th>
                    <th className="py-3 px-3.5 text-right">Won Revenue</th>
                    <th className="py-3 px-3.5 text-right">Open Funnel</th>
                    <th className="py-3 px-3.5 text-center">Work Orders</th>
                    <th className="py-3 px-3.5 text-center">Delayed WOs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {analytics.sectors.map((sec, i) => (
                    <tr key={sec.sector} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-blue-600/15 text-blue-400 flex items-center justify-center font-extrabold text-[10px] border border-blue-500/25">
                          {i + 1}
                        </span>
                        <span>{sec.sector}</span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-extrabold text-blue-300">
                        {formatCurrencyINR(sec.dealValue)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-300">
                        {sec.dealCount}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-teal-400">
                        {formatCurrencyINR(sec.wonValue)} ({sec.wonCount})
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-blue-300">
                        {formatCurrencyINR(sec.openValue)} ({sec.openCount})
                      </td>
                      <td className="py-3 px-3.5 text-center font-medium text-slate-300">
                        {sec.workOrderCount ? `${sec.workOrderCount} (${formatCurrencyINR(sec.workOrderValue || 0)})` : '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {sec.delayedWorkOrders && sec.delayedWorkOrders > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold text-[11px]">
                            {sec.delayedWorkOrders} delayed
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: WORK ORDERS & OPERATIONS */}
        {activeTab === 'operations' && (
          <div className="space-y-4">
            {/* Operational KPI summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Work Orders</div>
                <div className="text-xl font-extrabold text-white mt-1">{analytics.totalWorkOrdersCount || workOrders.length}</div>
                <div className="text-[11px] text-blue-400 mt-0.5">{formatCurrencyINR(analytics.totalWorkOrdersValue)} Value</div>
              </div>
              <div className="p-3.5 rounded-xl bg-teal-500/[0.08] border border-teal-500/25">
                <div className="text-[10px] uppercase font-bold text-teal-400">Completed</div>
                <div className="text-xl font-extrabold text-teal-300 mt-1">{analytics.completedWorkOrdersCount || 0}</div>
                <div className="text-[11px] text-teal-400/80 mt-0.5">Delivered to Clients</div>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-500/[0.08] border border-rose-500/25">
                <div className="text-[10px] uppercase font-bold text-rose-400">Delayed / Blocked</div>
                <div className="text-xl font-extrabold text-rose-300 mt-1">{analytics.delayedWorkOrdersCount || 0}</div>
                <div className="text-[11px] text-rose-400/80 mt-0.5">{formatCurrencyINR(analytics.delayedWorkOrdersValue || 0)} at Risk</div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/25">
                <div className="text-[10px] uppercase font-bold text-blue-400">In Progress</div>
                <div className="text-xl font-extrabold text-blue-300 mt-1">{analytics.inProgressWorkOrdersCount || 0}</div>
                <div className="text-[11px] text-blue-400/80 mt-0.5">Active Execution</div>
              </div>
            </div>

            {/* Filter bar for work orders */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <select
                  value={woStatusFilter}
                  onChange={(e) => setWoStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses ({workOrders.length})</option>
                  <option value="Completed">Completed ({analytics.completedWorkOrdersCount || 0})</option>
                  <option value="Delayed">Delayed ({analytics.delayedWorkOrdersCount || 0})</option>
                  <option value="In-Progress">In-Progress ({analytics.inProgressWorkOrdersCount || 0})</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Search work orders..."
                value={woSearchTerm}
                onChange={(e) => setWoSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1 focus:outline-none focus:border-blue-500 w-52 placeholder-slate-500"
              />
            </div>

            {/* Work Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0A0F1E] text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-3 px-3.5">Work Order # / Name</th>
                    <th className="py-3 px-3.5">Client</th>
                    <th className="py-3 px-3.5">Sector</th>
                    <th className="py-3 px-3.5 text-right">Value</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Target Date</th>
                    <th className="py-3 px-3.5">Delay / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredWorkOrders.slice(0, 50).map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-semibold text-white max-w-[200px] truncate">
                        {wo.name}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">{wo.clientCode}</td>
                      <td className="py-3 px-3.5 font-medium text-blue-300">{wo.sectorService}</td>
                      <td className="py-3 px-3.5 text-right font-extrabold text-white">
                        {wo.valueFormatted}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            wo.isCompleted
                              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              : wo.isDelayed
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {wo.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-400">{wo.targetDate || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-400 max-w-[180px] truncate">
                        {wo.delayReason ? (
                          <span className="text-amber-300 font-medium">{wo.delayReason}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredWorkOrders.length > 50 && (
                <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-800">
                  Showing first 50 of {filteredWorkOrders.length} work orders
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DELAYS & RISKS */}
        {activeTab === 'delayed' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Overdue Deals & Delayed Operations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Opportunities and project work orders past deadline requiring executive follow-up
              </p>
            </div>

            {analytics.delayedDeals.length === 0 && workOrders.filter((w) => w.isDelayed).length === 0 ? (
              <div className="p-6 text-center text-xs text-teal-400 bg-teal-500/10 rounded-xl border border-teal-500/20">
                ✅ No overdue deals or delayed work orders detected! All items are progressing on schedule.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.delayedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3.5 rounded-xl bg-rose-500/[0.05] border border-rose-500/25 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase border border-rose-500/30">
                          Overdue Deal
                        </span>
                        <strong className="text-white text-sm">{deal.name}</strong>
                      </div>
                      <div className="text-slate-400 flex flex-wrap gap-2 text-[11px]">
                        <span>Client: <strong className="text-slate-200">{deal.clientCode}</strong></span>
                        <span>•</span>
                        <span>Sector: <strong className="text-blue-300">{deal.sectorService}</strong></span>
                        <span>•</span>
                        <span>Rep: <strong className="text-slate-200">{deal.ownerCode}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-extrabold text-white text-sm">{deal.dealValueFormatted}</div>
                        <div className="text-[11px] text-rose-400 font-medium">Target: {deal.closingDate || 'Past deadline'}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                        {deal.dealStage}
                      </span>
                    </div>
                  </div>
                ))}

                {workOrders
                  .filter((w) => w.isDelayed)
                  .map((wo) => (
                    <div
                      key={wo.id}
                      className="p-3.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/25 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
                            Delayed Work Order
                          </span>
                          <strong className="text-white text-sm">{wo.name}</strong>
                        </div>
                        <div className="text-slate-400 flex flex-wrap gap-2 text-[11px]">
                          <span>Client: <strong className="text-slate-200">{wo.clientCode}</strong></span>
                          <span>•</span>
                          <span>Sector: <strong className="text-blue-300">{wo.sectorService}</strong></span>
                          <span>•</span>
                          <span>Blocker: <strong className="text-amber-300">{wo.delayReason || 'Past target date'}</strong></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-white text-sm">{wo.valueFormatted}</div>
                        <div className="text-[11px] text-amber-400 font-medium">Due: {wo.targetDate || 'Overdue'}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DATA QUALITY */}
        {activeTab === 'quality' && (
          <DataQualityDrawer qualityReport={qualityReport || null} boardInfo={boardInfo} />
        )}

        {/* TAB 6: DEALS EXPLORER TABLE */}
        {activeTab === 'explorer' && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0A0F1E] text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="py-3 px-3.5">Deal Name</th>
                  <th className="py-3 px-3.5">Client</th>
                  <th className="py-3 px-3.5">Sector</th>
                  <th className="py-3 px-3.5 text-right">Value</th>
                  <th className="py-3 px-3.5">Stage</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Close Date</th>
                  <th className="py-3 px-3.5">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDeals.slice(0, 50).map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-white max-w-[200px] truncate">
                      {deal.name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300">{deal.clientCode}</td>
                    <td className="py-3 px-3.5 font-medium text-blue-300">{deal.sectorService}</td>
                    <td className="py-3 px-3.5 text-right font-extrabold text-white">
                      {deal.dealValueFormatted}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          deal.isWon
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            : deal.isLost
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {deal.dealStage}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      {deal.isHighPriority ? (
                        <span className="text-amber-400 font-bold">🔥 High</span>
                      ) : (
                        <span className="text-slate-400">{deal.priority}</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400">{deal.closingDate || '—'}</td>
                    <td className="py-3 px-3.5 text-slate-300">{deal.ownerCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

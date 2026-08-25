// components/DataQualityDrawer.tsx
'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { DataQualityReport } from '@/types';

interface DataQualityDrawerProps {
  qualityReport: DataQualityReport | null;
  boardInfo?: {
    dealsBoardName?: string;
    dealsItemCount?: number;
    workOrdersBoardName?: string;
    workOrdersItemCount?: number;
    lastSynced?: string;
  };
}

export const DataQualityDrawer: React.FC<DataQualityDrawerProps> = ({
  qualityReport,
  boardInfo,
}) => {
  if (!qualityReport) {
    return (
      <div className="glass-card p-6 text-center text-slate-400 border border-slate-800 bg-[#0E1526] rounded-2xl">
        No Data Quality report generated yet. Connect Monday.com to inspect live board schema.
      </div>
    );
  }

  const healthScore = qualityReport.dataHealthScore;
  const isHealthy = healthScore >= 75;

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="glass-card p-5 border border-slate-800 bg-[#0E1526]/90 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border ${
              isHealthy
                ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {healthScore}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Data Quality & Schema Health</h2>
              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                  isHealthy
                    ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {isHealthy ? 'High Fidelity' : 'Contains Caveats'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live automated audit across {qualityReport.totalDeals} deals and {qualityReport.totalWorkOrders} work orders
            </p>
          </div>
        </div>

        {boardInfo && (
          <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
            <div>
              <strong className="text-white">Deals Board:</strong> {boardInfo.dealsBoardName} ({boardInfo.dealsItemCount} items)
            </div>
            <div>
              <strong className="text-white">Work Orders:</strong> {boardInfo.workOrdersBoardName || 'Not Connected'} ({boardInfo.workOrdersItemCount || 0} items)
            </div>
          </div>
        )}
      </div>

      {/* Grid: Missing Values Audit & Column Mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Quality Issues / Caveats */}
        <div className="glass-card p-5 border border-slate-800 bg-[#0E1526]/80 rounded-2xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Field Completeness & Quality Caveats
          </h3>

          {qualityReport.issues.length === 0 ? (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>All essential fields are 100% complete with no missing values!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {qualityReport.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{issue.field}</span>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        issue.percentageComplete > 85
                          ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      {issue.percentageComplete}% Complete ({issue.missingCount} Missing)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        issue.percentageComplete > 85 ? 'bg-teal-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${issue.percentageComplete}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{issue.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Non-Invention Policy Notice */}
          <div className="mt-4 p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Non-Invention Policy:</strong> The AI Agent is strictly programmed to mention these caveats whenever reporting numbers.
            </span>
          </div>
        </div>

        {/* Right: Dynamic Column Mapping Resolution */}
        <div className="glass-card p-5 border border-slate-800 bg-[#0E1526]/80 rounded-2xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            Detected Monday.com Column Mappings
          </h3>

          <div className="space-y-2 text-xs">
            {Object.entries(qualityReport.columnMappings.deals).length > 0 ? (
              Object.entries(qualityReport.columnMappings.deals).map(([target, colId]) => (
                <div
                  key={target}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-slate-200 capitalize font-medium">
                      {target.replace(/([A-Z])/g, ' $1')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <span>col_id:</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 font-semibold border border-slate-700">
                      {colId}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-xs">No column mappings resolved yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

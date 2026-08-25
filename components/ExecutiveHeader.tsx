// components/ExecutiveHeader.tsx
'use client';

import React from 'react';
import {
  Activity,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  BarChart3,
  Bot,
  Settings,
  Database,
  Sparkles,
} from 'lucide-react';
import { DataQualityReport } from '@/types';

interface ExecutiveHeaderProps {
  isConfigured: boolean;
  isConnected: boolean;
  lastSynced?: string;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenSettings?: () => void;
  qualityReport?: DataQualityReport | null;
  totalDeals: number;
  totalWorkOrders: number;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({
  isConfigured,
  isConnected,
  lastSynced,
  isSyncing,
  onRefresh,
  onOpenSettings,
  qualityReport,
  totalDeals,
  totalWorkOrders,
}) => {
  const healthScore = qualityReport?.dataHealthScore ?? 100;
  const isHealthy = healthScore >= 75;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080C16]/95 backdrop-blur-xl px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white font-sans">
                SKYLARK <span className="text-blue-400 font-bold">BI AGENT</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
                <Database className="w-2.5 h-2.5 text-blue-400" /> Monday.com
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Executive Business Intelligence
            </p>
          </div>
        </div>

        {/* Status & Control Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Live Status Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isConnected
                ? 'bg-teal-950/40 text-teal-300 border-teal-500/30'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-teal-400 shadow-[0_0_6px_#2dd4bf] pulse-dot' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline font-semibold">
              {isConnected ? 'Monday.com Connected' : 'Configuration Required'}
            </span>
            <span className="sm:hidden font-semibold">
              {isConnected ? 'Live' : 'Config'}
            </span>
          </div>

          {/* Sync Time */}
          {lastSynced && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <Database className="w-3 h-3 text-slate-400" />
              <span>Synced: {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all text-xs font-medium shadow-sm disabled:opacity-50 cursor-pointer"
            title="Refresh data from Monday.com"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Settings / Connection Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Connection Settings & Schema Audit"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

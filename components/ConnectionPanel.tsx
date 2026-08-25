// components/ConnectionPanel.tsx
'use client';

import React, { useState } from 'react';
import {
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface ConnectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  isConfigured: boolean;
  lastSynced?: string;
  boardInfo?: {
    dealsBoardName?: string;
    dealsItemCount?: number;
    workOrdersBoardName?: string;
    workOrdersItemCount?: number;
  };
  onRefresh: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  isOpen,
  onClose,
  isConnected,
  isConfigured,
  lastSynced,
  boardInfo,
  onRefresh,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/monday', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ connected: false, error: err?.message || 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all">
      <div className="glass-card max-w-xl w-full border border-slate-800 bg-[#0E1526] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 px-5 border-b border-slate-800 bg-[#0A0F1E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Monday.com Connection</h3>
              <p className="text-[11px] text-slate-400">Live GraphQL API Integration & Environment Secrets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isConnected
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-teal-400 shadow-[0_0_6px_#2dd4bf] pulse-dot' : 'bg-amber-400'
                }`}
              />
              <div>
                <div className="font-bold text-white">
                  Status: {isConnected ? 'Live Connected' : 'Configuration Required'}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {isConnected
                    ? `Live GraphQL sync active with ${boardInfo?.dealsItemCount || 0} deals and ${boardInfo?.workOrdersItemCount || 0} work orders.`
                    : 'Set MONDAY_API_TOKEN and board IDs in .env.local to activate live queries.'}
                </div>
              </div>
            </div>
          </div>

          {/* Masked Environment Configuration */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-blue-400" />
              Environment Secrets (Masked for Security)
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">MONDAY_API_TOKEN:</span>
                <span className="text-teal-400 font-semibold">
                  {isConfigured ? '••••••••••••••••••••••••' : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">DEALS_BOARD_ID:</span>
                <span className="text-blue-300 font-semibold">
                  {boardInfo?.dealsBoardName ? `${boardInfo.dealsBoardName} (Active)` : '••••••••••'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">WORK_ORDERS_BOARD_ID:</span>
                <span className="text-blue-300 font-semibold">
                  {boardInfo?.workOrdersBoardName ? `${boardInfo.workOrdersBoardName} (Active)` : 'Optional'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">GEMINI_API_KEY:</span>
                <span className="text-slate-400 font-semibold">••••••••••••••••••••••••</span>
              </div>
            </div>
          </div>

          {/* Test connection results if available */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                testResult.connected
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="font-bold">
                {testResult.connected ? '✓ Connection Verified!' : '✗ Connection Failed'}
              </div>
              <div className="text-[11px] mt-1 text-slate-300">
                {testResult.connected
                  ? `Authenticated as: ${testResult.user} | Deals Board: ${testResult.dealsBoardName || 'Found'}`
                  : testResult.error}
              </div>
            </div>
          )}

          {/* Last sync info */}
          {lastSynced && (
            <div className="text-[11px] text-slate-400">
              Last synced from Monday.com: <strong className="text-slate-200">{new Date(lastSynced).toLocaleString()}</strong>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-5 border-t border-slate-800 bg-[#0A0F1E] flex items-center justify-between gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRefresh();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              Force Refresh Data
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

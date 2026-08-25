// components/KPICards.tsx
'use client';

import React from 'react';
import {
  TrendingUp,
  Target,
  Award,
  AlertCircle,
  Flame,
  Briefcase,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { PipelineAnalytics } from '@/types';
import { formatCurrencyINR } from '@/lib/normalization';

interface KPICardsProps {
  analytics: PipelineAnalytics | null;
  loading?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ analytics, loading = false }) => {
  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 my-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="glass-card p-4 rounded-xl border border-slate-800 bg-[#0E1526]/80 animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-4 w-4 bg-slate-800 rounded" />
            </div>
            <div className="h-7 w-28 bg-slate-700 rounded" />
            <div className="h-3 w-16 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'TOTAL PIPELINE',
      value: formatCurrencyINR(analytics.totalPipelineValue),
      trend: `${analytics.totalDealsCount} Deals`,
      trendPositive: true,
      description: 'Across all active funnel deals',
      icon: Briefcase,
      accentColor: 'text-blue-400',
      iconBg: 'bg-blue-600/15 border-blue-500/25',
      borderHover: 'hover:border-blue-500/40',
    },
    {
      label: 'WON REVENUE',
      value: formatCurrencyINR(analytics.wonPipelineValue),
      trend: `↑ ${analytics.winRateByValue}% Win Rate`,
      trendPositive: true,
      description: `${analytics.wonDealsCount} closed-won contracts`,
      icon: Award,
      accentColor: 'text-teal-400',
      iconBg: 'bg-teal-600/15 border-teal-500/25',
      borderHover: 'hover:border-teal-500/40',
    },
    {
      label: 'OPEN DEALS',
      value: formatCurrencyINR(analytics.openPipelineValue),
      trend: `${analytics.openDealsCount} in Progress`,
      trendPositive: true,
      description: 'Active opportunities in review',
      icon: Target,
      accentColor: 'text-blue-300',
      iconBg: 'bg-blue-900/30 border-blue-700/30',
      borderHover: 'hover:border-blue-500/30',
    },
    {
      label: 'DELAYED PROJECTS',
      value: String(analytics.delayedDealsCount),
      trend: analytics.delayedDealsCount > 0 ? '⚠ Action Required' : '✓ On Schedule',
      trendPositive: analytics.delayedDealsCount === 0,
      description:
        analytics.delayedDealsCount > 0
          ? `${analytics.delayedDealsCount} deals past closing target`
          : 'Zero overdue projects',
      icon: AlertCircle,
      accentColor: analytics.delayedDealsCount > 0 ? 'text-rose-400' : 'text-slate-400',
      iconBg:
        analytics.delayedDealsCount > 0
          ? 'bg-rose-500/15 border-rose-500/30'
          : 'bg-slate-800/40 border-slate-700/30',
      borderHover: analytics.delayedDealsCount > 0 ? 'hover:border-rose-500/50' : 'hover:border-slate-700',
    },
    {
      label: 'HIGH PRIORITY',
      value: String(analytics.highPriorityDealsCount),
      trend: `${analytics.highPriorityRisks.length} Open P1`,
      trendPositive: true,
      description: 'Key accounts requiring sponsorship',
      icon: Flame,
      accentColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/25',
      borderHover: 'hover:border-amber-500/40',
    },
    {
      label: 'AVG DEAL SIZE',
      value: formatCurrencyINR(analytics.averageDealSize),
      trend: 'Per Contract',
      trendPositive: true,
      description: 'Mean contract pipeline value',
      icon: TrendingUp,
      accentColor: 'text-slate-300',
      iconBg: 'bg-slate-800/60 border-slate-700/40',
      borderHover: 'hover:border-slate-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 my-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`glass-card glass-card-interactive p-4 rounded-xl border border-slate-800/90 bg-[#0E1526]/90 flex flex-col justify-between ${card.borderHover}`}
          >
            {/* Header: Label + Icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-sans">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${card.iconBg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.accentColor}`} />
              </div>
            </div>

            {/* Value */}
            <div className="my-1">
              <div className="text-xl lg:text-2xl font-extrabold text-white tracking-tight font-sans">
                {card.value}
              </div>
            </div>

            {/* Trend & Subtitle */}
            <div className="pt-2 mt-1 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
              <span
                className={`font-semibold ${
                  card.trendPositive ? 'text-teal-400' : 'text-rose-400'
                }`}
              >
                {card.trend}
              </span>
              <span className="text-slate-400 text-[10px] truncate max-w-[110px]" title={card.description}>
                {card.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

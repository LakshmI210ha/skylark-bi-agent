// components/FilterBar.tsx
'use client';

import React from 'react';
import { Filter, Search, RotateCcw, X, Zap, Layers, Briefcase, Activity } from 'lucide-react';
import { FilterState, SectorMetric, StageMetric } from '@/types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  sectors: SectorMetric[];
  stages: StageMetric[];
  totalFiltered: number;
  totalTotal: number;
  activeDomainFilter?: string;
  onSelectDomain?: (domain: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  sectors,
  stages,
  totalFiltered,
  totalTotal,
}) => {
  const hasActiveFilters =
    (filters.stage && filters.stage !== 'ALL') ||
    (filters.sector && filters.sector !== 'ALL') ||
    (filters.priority && filters.priority !== 'ALL') ||
    (filters.region && filters.region !== 'ALL') ||
    !!filters.search;

  const handleReset = () => {
    onFilterChange({
      stage: 'ALL',
      sector: 'ALL',
      priority: 'ALL',
      region: 'ALL',
      owner: 'ALL',
      search: '',
    });
  };

  const quickPills = [
    { label: 'All Funnel', sector: 'ALL' },
    { label: 'Energy Sector', sector: 'Energy' },
    { label: 'Infrastructure', sector: 'Infrastructure' },
    { label: 'Mining', sector: 'Mining' },
  ];

  return (
    <div className="glass-card p-3 my-3 border border-slate-800 bg-[#0E1526]/85 backdrop-blur-md rounded-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Quick Domain Filters & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs mr-1">
            {quickPills.map((pill) => {
              const isActive = (filters.sector || 'ALL') === pill.sector;
              return (
                <button
                  key={pill.label}
                  onClick={() => onFilterChange({ ...filters, sector: pill.sector })}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all text-xs cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block mx-1" />

          {/* Sector Dropdown */}
          <div className="relative">
            <select
              value={filters.sector || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, sector: e.target.value })}
              className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Sectors ({sectors.length})</option>
              {sectors.map((s) => (
                <option key={s.sector} value={s.sector}>
                  {s.sector} ({s.dealCount})
                </option>
              ))}
            </select>
          </div>

          {/* Stage Dropdown */}
          <div className="relative">
            <select
              value={filters.stage || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, stage: e.target.value })}
              className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Stages ({stages.length})</option>
              {stages.map((st) => (
                <option key={st.stage} value={st.stage}>
                  {st.stage} ({st.count})
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              value={filters.priority || 'ALL'}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
              className="bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">🔥 High Priority</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all text-xs font-semibold cursor-pointer"
              title="Clear all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Search Input & Counter */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals, clients, reps..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 whitespace-nowrap bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
            <strong className="text-white font-semibold">{totalFiltered}</strong> of {totalTotal} deals
          </div>
        </div>
      </div>
    </div>
  );
};

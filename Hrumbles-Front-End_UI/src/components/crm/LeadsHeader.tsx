import React from 'react';
import { Users, Building2, PanelLeftClose, PanelLeft, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCRMStore } from '@/stores/crmStore';

export function LeadsHeader() {
  const { viewMode, setViewMode, sidebarOpen, toggleSidebar, tableSearch, setTableSearch } = useCRMStore();

  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-white shadow-sm z-20">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title & Info */}
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {viewMode === 'people' ? 'People' : 'Companies'}
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help p-1 rounded-full hover:bg-slate-100 transition-colors">
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 text-white border-none">
                <p className="text-xs">Find and manage {viewMode} records across your workspaces.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Center/Right: Layout Controls */}
        <div className="flex items-center gap-3 ml-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <Button
              variant={viewMode === 'people' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 px-3 gap-2 text-xs font-semibold ${viewMode === 'people' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('people')}
            >
              <Users className="w-3.5 h-3.5" /> People
            </Button>
            <Button
              variant={viewMode === 'companies' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 px-3 gap-2 text-xs font-semibold ${viewMode === 'companies' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('companies')}
            >
              <Building2 className="w-3.5 h-3.5" /> Companies
            </Button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Toggle Sidebar Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase tracking-tight hidden md:inline">
              {sidebarOpen ? 'Hide Filters' : 'Show Filters'}
            </span>
          </Button>

          {/* Instant Table Search */}
          <div className="relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder={`Quick search ${viewMode}...`}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="h-9 pl-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { 
  Search, ChevronDown, ChevronRight, List, UserCircle, Briefcase, 
  MapPin, Building2, Users, TrendingUp, DollarSign, Tag, Mail, Lock, X, Globe 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCRMStore } from '@/stores/crmStore';
import { useContactStages } from '@/hooks/sales/useContactStages';

function FilterGroup({ icon, title, badge, locked, children, defaultOpen = false, activeCount = 0 }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100">
      <button
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-slate-50 transition-colors"
        onClick={() => !locked && setIsOpen(!isOpen)}
        disabled={locked}
      >
        <div className="flex items-center gap-2.5">
          <span className={locked ? "text-slate-300" : "text-slate-400"}>{icon}</span>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${locked ? "text-slate-300" : "text-slate-600"}`}>{title}</span>
          {activeCount > 0 && (
            <Badge className="text-[10px] px-1.5 h-4 bg-indigo-600">{activeCount}</Badge>
          )}
          {badge && (
            <Badge variant="outline" className="text-[9px] px-1 h-4 border-indigo-200 text-indigo-600 uppercase font-black">{badge}</Badge>
          )}
          {locked && <Lock className="w-3 h-3 text-slate-300" />}
        </div>
        {!locked && (
          isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {isOpen && !locked && (
        <div className="px-4 pb-4 space-y-1.5 animate-in fade-in slide-in-from-top-1">
          {children}
        </div>
      )}
    </div>
  );
}

function FilterCheckboxItem({ label, filterKey, count }: any) {
  const { filters, toggleFilterValue } = useCRMStore();
  const isChecked = filters[filterKey as keyof typeof filters]?.includes(label);
  
  return (
    <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-100 cursor-pointer group">
      <div className="flex items-center gap-2.5">
        <Checkbox 
          checked={isChecked} 
          onCheckedChange={() => toggleFilterValue(filterKey, label)} 
          className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-indigo-600"
        />
        <span className={`text-xs ${isChecked ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">
          {count.toLocaleString()}
        </span>
      )}
    </label>
  );
}

export function FilterSidebar() {
  const { filters, sidebarOpen, clearAllFilters } = useCRMStore();
  const { data: stages = [] } = useContactStages();
  const [filterSearch, setFilterSearch] = useState('');

  if (!sidebarOpen) return null;

  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 z-10 shadow-sm">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search filters..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white border-slate-200"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* Section: Lists & Workspaces */}
          <FilterGroup icon={<List className="w-4 h-4" />} title="Pipeline Stages" defaultOpen activeCount={filters.contact_stage.length}>
            {stages.map(stage => (
              <FilterCheckboxItem key={stage.id} label={stage.name} filterKey="contact_stage" />
            ))}
          </FilterGroup>

          {/* Section: Job Titles */}
          <FilterGroup icon={<Briefcase className="w-4 h-4" />} title="Job Titles" activeCount={filters.seniorities.length}>
             <Input placeholder="Search job titles..." className="h-7 text-[11px] mb-2" />
             {['CEO', 'Director', 'Manager', 'VP', 'Founder'].map(title => (
               <FilterCheckboxItem key={title} label={title} filterKey="seniorities" />
             ))}
          </FilterGroup>

          {/* Section: Location */}
          <FilterGroup icon={<MapPin className="w-4 h-4" />} title="Location" activeCount={filters.locations.length}>
            {['United States', 'India', 'United Kingdom', 'Canada', 'Germany'].map(loc => (
              <FilterCheckboxItem key={loc} label={loc} filterKey="locations" />
            ))}
          </FilterGroup>

          {/* Pro Toggles */}
          <FilterGroup icon={<TrendingUp className="w-4 h-4" />} title="Buying Intent" locked badge="Pro" />
          <FilterGroup icon={<Globe className="w-4 h-4" />} title="Tech Stack" locked badge="Pro" />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-200">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-[10px] font-bold uppercase tracking-tight h-8 border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50"
          onClick={clearAllFilters}
        >
          Clear All Filters
        </Button>
      </div>
    </aside>
  );
}
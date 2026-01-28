// src/components/sales/contacts-table/ContactFiltersSidebar.tsx - REDESIGNED COMPACT SIDEBAR

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table } from '@tanstack/react-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Briefcase, 
  Layers, 
  MapPin, 
  Building2, 
  User, 
  ListFilter, 
  FilterX, 
  X,
  ChevronRight 
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FilterSearchInput } from '@/components/ui/sales/FilterSearchInput';
import { useWorkspaces } from '@/hooks/sales/useWorkspaces';
import { useWorkspaceFiles } from '@/hooks/sales/useWorkspaceFiles';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Badge } from '@/components/ui/badge';

interface ContactFiltersSidebarProps {
  table: Table<any>;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ContactFiltersSidebar({ table, isOpen = true, onClose }: ContactFiltersSidebarProps) {
  const { data: workspaces = [] } = useWorkspaces();
  const { data: files = [] } = useWorkspaceFiles();
  const { data: stages = [] } = useContactStages();

const handleMultiSelect = (columnId: string, value: string) => {
  const column = table.getAllColumns().find(c => c.id === columnId);
  if (!column) return;
  const current = (column.getFilterValue() as string[]) || [];
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  column.setFilterValue(next.length ? next : undefined);
};

const isChecked = (columnId: string, value: string) => {
  const column = table.getAllColumns().find(c => c.id === columnId);
  if (!column) return false;
  const current = (column.getFilterValue() as string[]) || [];
  return current.includes(value);
};

const getActiveFiltersForSection = (columnIds: string[]) => {
  return columnIds.reduce((count, id) => {
    const column = table.getAllColumns().find(c => c.id === id);
    if (!column) return count;
    const filterValue = column.getFilterValue();
    if (Array.isArray(filterValue)) return count + filterValue.length;
    if (filterValue) return count + 1;
    return count;
  }, 0);
};

// Add this line just before the `return` statement:
const emailColumn = table.getAllColumns().find(c => c.id === 'email');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0 border-r border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Filters
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => table.resetColumnFilters()}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <FilterX className="h-3 w-3 mr-1" />
                Reset
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="h-[calc(100vh-180px)]">
            <Accordion type="multiple" defaultValue={['contact', 'pipeline']} className="w-full">
              
              {/* LISTS & WORKSPACES */}
              <AccordionItem value="lists" className="border-b border-slate-100">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Lists & Workspaces
                      </span>
                    </div>
                    {getActiveFiltersForSection(['workspace_id', 'file_id']) > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['workspace_id', 'file_id'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-3">
                  {/* Workspaces */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase mb-2 block">
                      Workspace
                    </label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {workspaces.map(ws => (
                        <div key={ws.id} className="flex items-center gap-2 group">
                          <Checkbox
                            id={`ws-${ws.id}`}
                            checked={isChecked('workspace_id', ws.id)}
                            onCheckedChange={() => handleMultiSelect('workspace_id', ws.id)}
                            className="h-3.5 w-3.5"
                          />
                          <label 
                            htmlFor={`ws-${ws.id}`} 
                            className="text-xs text-slate-700 truncate cursor-pointer group-hover:text-slate-900"
                          >
                            {ws.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Files */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase mb-2 block">
                      Imported File
                    </label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {files.map(f => (
                        <div key={f.id} className="flex items-center gap-2 group">
                          <Checkbox
                            id={`file-${f.id}`}
                            checked={isChecked('file_id', f.id)}
                            onCheckedChange={() => handleMultiSelect('file_id', f.id)}
                            className="h-3.5 w-3.5"
                          />
                          <label 
                            htmlFor={`file-${f.id}`} 
                            className="text-xs text-slate-700 truncate cursor-pointer group-hover:text-slate-900"
                          >
                            {f.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CONTACT ATTRIBUTES */}
              <AccordionItem value="contact" className="border-b border-slate-100">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Contact
                      </span>
                    </div>
                    {getActiveFiltersForSection(['name', 'job_title', 'email']) > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['name', 'job_title', 'email'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-2.5">
                  <FilterSearchInput 
                    placeholder="Search Name..." 
                    columnId="name" 
                    onSelect={(v) => table.getColumn('name')?.setFilterValue(v)} 
                  />
                  <FilterSearchInput 
                    placeholder="Search Job Title..." 
                    columnId="job_title" 
                    onSelect={(v) => table.getColumn('job_title')?.setFilterValue(v)} 
                  />
                  <div className="flex items-center gap-2 group pt-1">
                    <Checkbox
                      id="has_email"
                      checked={table.getColumn('email')?.getFilterValue() === 'exists'}
                      onCheckedChange={(c) => table.getColumn('email')?.setFilterValue(c ? 'exists' : undefined)}
                      className="h-3.5 w-3.5"
                    />
                    <label 
                      htmlFor="has_email" 
                      className="text-xs text-slate-700 cursor-pointer group-hover:text-slate-900"
                    >
                      Email Verified Only
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* PIPELINE */}
              <AccordionItem value="pipeline" className="border-b border-slate-100">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Pipeline Stage
                      </span>
                    </div>
                    {getActiveFiltersForSection(['contact_stage']) > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['contact_stage'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-1.5">
                  {stages.map(stage => (
                    <div key={stage.id} className="flex items-center gap-2 group">
                      <Checkbox
                        id={`stage-${stage.name}`}
                        checked={isChecked('contact_stage', stage.name)}
                        onCheckedChange={() => handleMultiSelect('contact_stage', stage.name)}
                        className="h-3.5 w-3.5"
                      />
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ background: stage.color }} 
                      />
                      <label 
                        htmlFor={`stage-${stage.name}`} 
                        className="text-xs text-slate-700 cursor-pointer group-hover:text-slate-900 flex-1 truncate"
                      >
                        {stage.name}
                      </label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* COMPANY */}
              <AccordionItem value="company" className="border-b border-slate-100">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Company
                      </span>
                    </div>
                    {getActiveFiltersForSection(['company_name', 'industry']) > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['company_name', 'industry'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-2.5">
                  <FilterSearchInput 
                    placeholder="Company Name..." 
                    columnId="company_name" 
                    tableSource="companies"
                    onSelect={(v) => table.getColumn('company_name')?.setFilterValue(v)} 
                  />
                  <FilterSearchInput 
                    placeholder="Industry..." 
                    columnId="industry" 
                    tableSource="companies"
                    onSelect={(v) => table.getColumn('industry')?.setFilterValue(v)} 
                  />
                </AccordionContent>
              </AccordionItem>

              {/* LOCATION */}
              <AccordionItem value="location" className="border-b-0">
                <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Location
                      </span>
                    </div>
                    {getActiveFiltersForSection(['country', 'city']) > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['country', 'city'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 space-y-2.5">
                  <FilterSearchInput 
                    placeholder="Country..." 
                    columnId="country" 
                    onSelect={(v) => table.getColumn('country')?.setFilterValue(v)} 
                  />
                  <FilterSearchInput 
                    placeholder="City..." 
                    columnId="city" 
                    onSelect={(v) => table.getColumn('city')?.setFilterValue(v)} 
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
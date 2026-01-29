// src/components/sales/contacts-table/FilterChips.tsx
// Active filter pills/chips component

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table } from '@tanstack/react-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterChipsProps {
  table: Table<any>;
}

export function FilterChips({ table }: FilterChipsProps) {
  const activeFilters = table.getState().columnFilters;

  if (activeFilters.length === 0) return null;

  const getFilterLabel = (columnId: string): string => {
    // Convert column IDs to readable labels
    const labelMap: Record<string, string> = {
      'name': 'Name',
      'email': 'Email',
      'mobile': 'Phone',
      'job_title': 'Job Title',
      'contact_stage': 'Stage',
      'medium': 'Medium',
      'company_name': 'Company',
      'industry': 'Industry',
      'country': 'Country',
      'city': 'City',
      'state': 'State',
      'created_at': 'Created',
      'updated_at': 'Updated',
      'seniority': 'Seniority',
      'departments': 'Department',
      'functions': 'Function',
      'employee_count': 'Employee Count',
      'revenue': 'Revenue',
      'apollo_person_id': 'Enrichment',
      'workspace_id': 'Workspace',
      'file_id': 'List',
    };
    
    return labelMap[columnId] || columnId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFilterValueLabel = (columnId: string, value: any): string => {
    // Handle different filter value types
    if (value === 'exists') return 'Has value';
    if (Array.isArray(value)) {
      if (value.length === 1) return value[0];
      return `${value.length} selected`;
    }
    if (typeof value === 'object' && value?.from && value?.to) {
      return 'Date range';
    }
    if (typeof value === 'string') return value;
    return String(value);
  };

  const handleRemoveFilter = (columnId: string) => {
    const column = table.getAllColumns().find(c => c.id === columnId);
    column?.setFilterValue(undefined);
  };

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
          Active:
        </span>
        
        <ScrollArea className="flex-1">
          <div className="flex gap-1.5 pb-1">
            <AnimatePresence mode="popLayout">
              {activeFilters.map((filter) => (
                <motion.div
                  key={filter.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge
                    className="bg-blue-600 text-white border-0 h-5 px-2 text-[10px] font-medium flex items-center gap-1.5 whitespace-nowrap hover:bg-blue-700 transition-colors"
                  >
                    <span className="font-bold">{getFilterLabel(filter.id)}:</span>
                    <span className="opacity-90">{getFilterValueLabel(filter.id, filter.value)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFilter(filter.id);
                      }}
                      className="ml-0.5 hover:bg-white/20 rounded-sm p-0.5 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>

        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
          onClick={() => table.resetColumnFilters()}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}
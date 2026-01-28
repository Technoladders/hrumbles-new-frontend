// src/components/sales/contacts-table/data-table-toolbar.tsx - REDESIGNED COMPACT TOOLBAR

import React from 'react';
import { X, Plus, Columns, Upload, ListFilter, Layers } from 'lucide-react';
import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onOpenAddContactDialog: () => void;
  onOpenImportDialog: () => void;
  onToggleGrouping: () => void;
  onToggleFilters: () => void;
  isSidebarOpen: boolean;
  createdByOptions: {
    label: string;
    value: string;
  }[];
}

export function DataTableToolbar<TData>({ 
  table, 
  onOpenAddContactDialog, 
  onToggleGrouping, 
  onToggleFilters,
  isSidebarOpen,
  createdByOptions, 
  onOpenImportDialog 
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const isGrouped = table.getState().grouping.length > 0;
  const activeFiltersCount = table.getState().columnFilters.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filter Sidebar Toggle */}
      <Button 
        variant={isSidebarOpen ? "default" : "outline"}
        size="sm" 
        className={cn(
          "h-8 text-xs gap-1.5 transition-all",
          isSidebarOpen 
            ? "bg-slate-800 text-white hover:bg-slate-700" 
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
        )}
        onClick={onToggleFilters}
      >
        <ListFilter className="h-3.5 w-3.5" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[10px] font-bold bg-blue-500 text-white">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>

      {/* Search Input */}
      <div className="relative flex-grow max-w-sm">
        <Input
          placeholder="Search by name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="h-8 text-xs pl-3 pr-8 bg-white border-slate-300"
        />
        {table.getColumn('name')?.getFilterValue() && (
          <button
            onClick={() => table.getColumn('name')?.setFilterValue('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Reset Filters */}
      {isFiltered && (
        <Button 
          variant="ghost" 
          onClick={() => table.resetColumnFilters()} 
          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}

      {/* Group Toggle */}
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(
          "h-8 text-xs gap-1.5",
          isGrouped && "bg-slate-100 border-slate-400"
        )}
        onClick={onToggleGrouping}
      >
        <Layers className="h-3.5 w-3.5" />
        {isGrouped ? "Ungroup" : "Group"}
      </Button>

      {/* Spacer */}
      <div className="flex-grow" />

      {/* View Columns */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-1.5"
          >
            <Columns className="h-3.5 w-3.5" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs font-semibold">Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-72 overflow-y-auto">
            {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize text-xs"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace(/_/g, ' ')}
                </DropdownMenuCheckboxItem>
              ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import */}
      <Button 
        variant="outline" 
        size="sm" 
        className="h-8 text-xs gap-1.5"
        onClick={onOpenImportDialog}
      >
        <Upload className="h-3.5 w-3.5" />
        Import
      </Button>

      {/* Add People */}
      <Button 
        size="sm" 
        className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
        onClick={onOpenAddContactDialog}
      >
        <Plus className="h-3.5 w-3.5" />
        Add People
      </Button>
    </div>
  );
}

// Add cn utility if not already present
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
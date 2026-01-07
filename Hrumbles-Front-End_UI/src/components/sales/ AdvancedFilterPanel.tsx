import React, { useState, useMemo } from "react";
import { Search, X, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'search' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

export interface ActiveFilter {
  filterId: string;
  values: string[];
}

interface AdvancedFilterPanelProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onFilterChange: (filters: ActiveFilter[]) => void;
  onClearAll: () => void;
  isLoading?: boolean;
}

interface FilterSectionProps {
  filter: FilterConfig;
  activeValues: string[];
  onToggle: (value: string) => void;
  isLoading?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  filter, 
  activeValues, 
  onToggle,
  isLoading 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!filter.options) return [];
    
    const sorted = [...filter.options].sort((a, b) => 
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    );

    if (!searchTerm) return sorted;
    
    return sorted.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filter.options, searchTerm]);

  const displayedOptions = filteredOptions.slice(0, 100); // Limit for performance
  const hasMore = filteredOptions.length > 100;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-sm text-gray-700">{filter.label}</span>
        <div className="flex items-center gap-2">
          {activeValues.length > 0 && (
            <Badge variant="secondary" className="h-5 px-2 text-xs">
              {activeValues.length}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {filter.type === 'select' && filter.options && (
            <>
              <div className="mb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder={`Search ${filter.label.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>

              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      Loading options...
                    </div>
                  ) : displayedOptions.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No options found
                    </div>
                  ) : (
                    displayedOptions.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded cursor-pointer"
                        onClick={() => onToggle(option.value)}
                      >
                        <Checkbox
                          id={`${filter.id}-${option.value}`}
                          checked={activeValues.includes(option.value)}
                          onCheckedChange={() => onToggle(option.value)}
                        />
                        <label
                          htmlFor={`${filter.id}-${option.value}`}
                          className="flex-1 text-sm cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate">{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-400 ml-2">
                              ({option.count})
                            </span>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                  {hasMore && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      Showing first 100 results. Use search to narrow down.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    return activeFilters.reduce((sum, filter) => sum + filter.values.length, 0);
  }, [activeFilters]);

  const handleToggleFilterValue = (filterId: string, value: string) => {
    const existingFilter = activeFilters.find(f => f.filterId === filterId);
    
    if (existingFilter) {
      const newValues = existingFilter.values.includes(value)
        ? existingFilter.values.filter(v => v !== value)
        : [...existingFilter.values, value];

      if (newValues.length === 0) {
        onFilterChange(activeFilters.filter(f => f.filterId !== filterId));
      } else {
        onFilterChange(
          activeFilters.map(f =>
            f.filterId === filterId ? { ...f, values: newValues } : f
          )
        );
      }
    } else {
      onFilterChange([...activeFilters, { filterId, values: [value] }]);
    }
  };

  const handleRemoveFilter = (filterId: string, value: string) => {
    const existingFilter = activeFilters.find(f => f.filterId === filterId);
    if (!existingFilter) return;

    const newValues = existingFilter.values.filter(v => v !== value);
    
    if (newValues.length === 0) {
      onFilterChange(activeFilters.filter(f => f.filterId !== filterId));
    } else {
      onFilterChange(
        activeFilters.map(f =>
          f.filterId === filterId ? { ...f, values: newValues } : f
        )
      );
    }
  };

  return (
    <>
      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-900">
            Active Filters ({activeFilterCount}):
          </span>
          {activeFilters.map((filter) => {
            const filterConfig = filters.find(f => f.id === filter.filterId);
            return filter.values.map((value) => {
              const option = filterConfig?.options?.find(o => o.value === value);
              return (
                <Badge
                  key={`${filter.filterId}-${value}`}
                  variant="secondary"
                  className="bg-white hover:bg-gray-100 text-gray-700 pl-3 pr-1 py-1"
                >
                  <span className="text-xs font-normal">
                    {filterConfig?.label}: {option?.label || value}
                  </span>
                  <button
                    onClick={() => handleRemoveFilter(filter.filterId, value)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            });
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Sheet Trigger */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-[400px] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 text-xs"
                >
                  Clear all ({activeFilterCount})
                </Button>
              )}
            </SheetTitle>
            <SheetDescription>
              Apply multiple filters to narrow down your results
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="py-2">
              {filters.map((filter) => {
                const activeFilter = activeFilters.find(f => f.filterId === filter.id);
                return (
                  <FilterSection
                    key={filter.id}
                    filter={filter}
                    activeValues={activeFilter?.values || []}
                    onToggle={(value) => handleToggleFilterValue(filter.id, value)}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t p-4 bg-gray-50">
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};


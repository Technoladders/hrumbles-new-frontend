// src/components/sales/contacts-table/filters/JobTitleFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { 
  Briefcase, Search, X, Check, Loader2, Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ManagementLevelFilter } from './ManagementLevelFilter';
import { DepartmentsFilter } from './DepartmentsFilter';

interface JobTitle {
  title: string;
  count: number;
}

interface JobTitleFilterSelectProps {
  selectedTitles: string[];
  onSelectionChange: (titles: string[]) => void;
  // Advanced mode filters
  selectedManagementLevels?: string[];
  onManagementLevelsChange?: (levels: string[]) => void;
  selectedDepartments?: string[];
  onDepartmentsChange?: (departments: string[]) => void;
  selectedFunctions?: string[];
  onFunctionsChange?: (functions: string[]) => void;
  fileId?: string | null;
}

export const JobTitleFilterSelect: React.FC<JobTitleFilterSelectProps> = ({
  selectedTitles,
  onSelectionChange,
  selectedManagementLevels = [],
  onManagementLevelsChange = () => {},
  selectedDepartments = [],
  onDepartmentsChange = () => {},
  selectedFunctions = [],
  onFunctionsChange = () => {},
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [includeSimilar, setIncludeSimilar] = useState(false);
  const [excludeTitles, setExcludeTitles] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        containerRef.current && !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch job title suggestions with counts
  const { data: jobTitles = [], isLoading } = useQuery({
    queryKey: ['job-title-suggestions', organization_id, searchTerm, fileId],
    queryFn: async () => {
      let query;
      
      if (fileId) {
        // For file-specific view
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              job_title
            )
          `)
          .eq('file_id', fileId)
          .not('contacts.job_title', 'is', null);
      } else {
        // For all contacts view
        query = supabase
          .from('contacts')
          .select('job_title')
          .eq('organization_id', organization_id)
          .not('job_title', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data based on file query structure
      const contacts = fileId 
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : (data || []);

      // Group and count job titles
      const titleMap = new Map<string, number>();

      contacts.forEach((contact: any) => {
        const title = contact.job_title?.trim();
        if (!title) return;
        
        titleMap.set(title, (titleMap.get(title) || 0) + 1);
      });

      // Convert to array and sort by count
      let titleArray = Array.from(titleMap.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count);

      // Filter by search term
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        titleArray = titleArray.filter(item => 
          item.title.toLowerCase().includes(searchLower)
        );
      }

      return titleArray.slice(0, 50); // Limit to top 50
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleTitle = (title: string) => {
    const newTitles = selectedTitles.includes(title)
      ? selectedTitles.filter(t => t !== title)
      : [...selectedTitles, title];
    
    onSelectionChange(newTitles);
  };

  const removeTitle = (title: string) => {
    onSelectionChange(selectedTitles.filter(t => t !== title));
  };

  const clearAll = () => {
    onSelectionChange([]);
    setExcludeTitles([]);
    setSearchTerm('');
  };

  const toggleExclude = (title: string) => {
    if (excludeTitles.includes(title)) {
      setExcludeTitles(excludeTitles.filter(t => t !== title));
    } else {
      setExcludeTitles([...excludeTitles, title]);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => setMode('simple')}
          className={cn(
            "flex-1 px-3 py-1.5 text-[10px] font-semibold uppercase rounded-md transition-all",
            mode === 'simple'
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          )}
        >
          Simple
        </button>
        <button
          onClick={() => setMode('advanced')}
          className={cn(
            "flex-1 px-3 py-1.5 text-[10px] font-semibold uppercase rounded-md transition-all",
            mode === 'advanced'
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          )}
        >
          Advanced
        </button>
      </div>

      {mode === 'simple' ? (
        // SIMPLE MODE
        <div className="space-y-3">
          {/* Include Section */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">
              Include
            </Label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <Input
                ref={inputRef}
                placeholder="Search for a job title"
                className="pl-8 pr-8 h-9 text-xs border-slate-200"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-500">
              Use "quotation marks" to return exact matches
            </p>

            {/* Include Similar Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="include-similar"
                checked={includeSimilar}
                onCheckedChange={(checked) => setIncludeSimilar(!!checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="include-similar" className="text-[10px] text-slate-600 cursor-pointer flex items-center gap-1">
                Include people with similar titles
                <span className="text-slate-400">ⓘ</span>
              </Label>
            </div>
          </div>

          {/* Exclude Section */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">
              Exclude
            </Label>
            <Input
              placeholder="Enter titles to exclude"
              className="h-9 text-xs border-slate-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  toggleExclude(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          {/* Past Job Titles Link */}
          {/* <button className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">
            Past job titles →
          </button> */}
        </div>
      ) : (
        // ADVANCED MODE
        <div className="space-y-3">
          {/* Management Level - Self-contained with collapsible header */}
          <ManagementLevelFilter
            selectedLevels={selectedManagementLevels}
            onSelectionChange={onManagementLevelsChange}
            fileId={fileId}
          />

          {/* Departments & Job Function - Self-contained with collapsible header */}
          <DepartmentsFilter
            selectedDepartments={selectedDepartments}
            selectedFunctions={selectedFunctions}
            onDepartmentsChange={onDepartmentsChange}
            onFunctionsChange={onFunctionsChange}
            fileId={fileId}
          />

          {/* Create New Persona */}
          <Button 
            variant="outline" 
            className="w-full text-xs h-9"
            onClick={() => {/* Handle persona creation */}}
          >
            <Users size={14} className="mr-2" />
            Create New Persona
          </Button>

          <button className="w-full text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">
            What's a Persona?
          </button>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && dropdownPosition && (
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <ScrollArea className="max-h-[240px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="ml-2 text-xs text-slate-500">Searching...</span>
              </div>
            ) : jobTitles.length === 0 ? (
              <div className="py-6 text-center">
                <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  {searchTerm ? 'No job titles found' : 'Type to search job titles'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {jobTitles.map((jobTitle) => {
                  const isSelected = selectedTitles.includes(jobTitle.title);
                  
                  return (
                    <div
                      key={jobTitle.title}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-blue-50 hover:bg-blue-100" 
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => toggleTitle(jobTitle.title)}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isSelected 
                            ? "bg-blue-100" 
                            : "bg-gradient-to-br from-slate-100 to-slate-200"
                        )}>
                          <Briefcase size={14} className={isSelected ? "text-blue-600" : "text-slate-500"} />
                        </div>
                      </div>

                      {/* Title Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {jobTitle.title}
                        </p>
                      </div>

                      {/* Count Badge */}
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5"
                      >
                        {jobTitle.count}
                      </Badge>

                      {/* Selection Indicator */}
                      <div className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-slate-300"
                      )}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Selected Titles Tags */}
      {selectedTitles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTitles.map((title) => (
            <Badge
              key={title}
              variant="secondary"
              className="pl-1.5 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium flex items-center gap-1.5"
            >
              <div className="w-4 h-4 rounded bg-blue-200 flex items-center justify-center">
                <Briefcase size={8} className="text-blue-600" />
              </div>
              <span className="truncate max-w-[150px]">{title}</span>
              <button
                onClick={() => removeTitle(title)}
                className="ml-0.5 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
          {selectedTitles.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1.5"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Excluded Titles */}
      {excludeTitles.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase text-slate-500 font-semibold">
            Excluded Titles
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {excludeTitles.map((title) => (
              <Badge
                key={title}
                variant="secondary"
                className="pl-1.5 pr-1 py-1 bg-red-50 text-red-700 border-red-200 text-[10px] font-medium flex items-center gap-1.5"
              >
                <span className="truncate max-w-[120px]">{title}</span>
                <button
                  onClick={() => toggleExclude(title)}
                  className="ml-0.5 hover:bg-red-200 rounded-full p-0.5 transition-colors"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
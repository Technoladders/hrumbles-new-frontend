import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Loader2 } from "lucide-react";
import { useFilterSuggestions } from '@/hooks/sales/useFilterSuggestions';

interface FilterSearchInputProps {
  placeholder: string;
  columnId: string;
  tableSource?: 'contacts' | 'companies';
  onSelect: (value: string) => void;
  defaultValue?: string;
}

export const FilterSearchInput: React.FC<FilterSearchInputProps> = ({
  placeholder, columnId, tableSource = 'contacts', onSelect, defaultValue
}) => {
  const [query, setQuery] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const { data: suggestions = [], isLoading } = useFilterSuggestions(columnId, query, tableSource);

  // Debounce the filter application
  useEffect(() => {
    const timer = setTimeout(() => {
      // Apply filter as user types (with a small delay to avoid excessive filtering)
      if (query) {
        onSelect(query);
      } else {
        onSelect(''); // Clear filter if query is empty
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSelect]);

  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className="pl-8 h-9 text-xs"
          />
          {isLoading && <Loader2 className="absolute right-2 top-2.5 h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="start">
        <Command>
          <CommandList>
            <CommandGroup heading="Suggestions">
              {suggestions.map((s) => (
                <CommandItem
                  key={s.value}
                  onSelect={() => {
                    setQuery(s.value);
                    onSelect(s.value);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  {s.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
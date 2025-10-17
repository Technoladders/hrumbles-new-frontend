// src/components/candidates/zive-x/MandatoryTagSelector.tsx

import { useState, FC, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/zive-x/useDebounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X, Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tag {
  value: string;
  mandatory: boolean;
}

interface MandatoryTagSelectorProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  placeholder?: string;
  fetchSuggestions?: (query: string) => Promise<string[]>;
  queryKey?: string;
  disableSuggestions?: boolean;
}

export const MandatoryTagSelector: FC<MandatoryTagSelectorProps> = ({ value, onChange, placeholder, fetchSuggestions, queryKey, disableSuggestions = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: [queryKey, debouncedSearchTerm],
    queryFn: () => fetchSuggestions ? fetchSuggestions(debouncedSearchTerm) : Promise.resolve([]),
    enabled: !disableSuggestions && !!fetchSuggestions && debouncedSearchTerm.length > 0 && isOpen,
  });

  const handleSelect = (tagValue: string) => {
    const trimmedValue = tagValue.trim();
    if (!trimmedValue) return;
    const existing = value.find(t => t.value.toLowerCase() === trimmedValue.toLowerCase());
    if (existing) {
      handleRemove(existing.value);
    } else {
      onChange([...value, { value: trimmedValue, mandatory: false }]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleSelect(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemove(value[value.length - 1].value);
    }
  };

  const handleRemove = (tagValue: string) => {
    onChange(value.filter(t => t.value !== tagValue));
  };

  const handleToggleMandatory = (tagValue: string) => {
    onChange(value.map(t => (t.value === tagValue ? { ...t, mandatory: !t.mandatory } : t)));
  };

  const selectedValues = new Set(value.map(t => t.value));

  return (
    <div className="space-y-3">
      <Popover open={!disableSuggestions && isOpen && suggestions.length > 0} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div 
            className="flex flex-wrap items-center gap-2 p-2 min-h-[40px] border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
            onClick={() => inputRef.current?.focus()}
          >
            {value.map(tag => (
              <Badge key={tag.value} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 text-sm bg-indigo-100 text-indigo-800">
                <button type="button" onClick={() => handleToggleMandatory(tag.value)} aria-label={`Mark ${tag.value} as mandatory`}>
                  <Star className={cn("h-4 w-4 transition-colors", tag.mandatory ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400 hover:text-yellow-500')} />
                </button>
                <span className="font-medium">{tag.value}</span>
                <button type="button" onClick={() => handleRemove(tag.value)} aria-label={`Remove ${tag.value}`}>
                  <X className="h-3 w-3 text-indigo-600" />
                </button>
              </Badge>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 150)} // Delay to allow click
              placeholder={value.length === 0 ? placeholder : ''}
              className="flex-grow bg-transparent focus:outline-none text-sm p-0.5"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 mt-1" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Command shouldFilter={false}>
            <CommandEmpty>{isLoading ? 'Searching...' : 'No results found.'}</CommandEmpty>
            <CommandGroup>
              {suggestions.map(suggestion => (
                <CommandItem key={suggestion} value={suggestion} onSelect={() => handleSelect(suggestion)} className="cursor-pointer">
                  <Check className={cn("mr-2 h-4 w-4", selectedValues.has(suggestion) ? "opacity-100" : "opacity-0")} />
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
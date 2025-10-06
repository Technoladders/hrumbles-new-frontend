// src/components/ui/tag-input.tsx

import React, { useState, useRef, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/zive-x/useDebounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  fetchSuggestions: (query: string) => Promise<string[]>;
  queryKey: string;
}

export const TagInput: FC<TagInputProps> = ({ value, onChange, placeholder, fetchSuggestions, queryKey }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedSearchTerm = useDebounce(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: [queryKey, debouncedSearchTerm],
    queryFn: () => fetchSuggestions(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 0 && isFocused,
  });

  const handleAddTag = (tag: string) => {
    const newTag = tag.trim();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  return (
    <Popover open={isFocused && suggestions.length > 0} onOpenChange={(open) => setIsFocused(open && suggestions.length > 0)}>
      <PopoverTrigger asChild>
        <div 
          className="flex flex-wrap items-center gap-2 p-2 min-h-[40px] border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
          onClick={() => inputRef.current?.focus()}
        >
          {value.map(tag => (
            <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-800 text-sm font-medium">
              {tag}
              <button 
                type="button" 
                className="ml-1.5 focus:outline-none ring-offset-background rounded-full focus:ring-2 focus:ring-ring"
                onClick={() => handleRemoveTag(tag)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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
              <CommandItem
                key={suggestion}
                value={suggestion}
                onSelect={() => handleAddTag(suggestion)}
                className="cursor-pointer"
              >
                {suggestion}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
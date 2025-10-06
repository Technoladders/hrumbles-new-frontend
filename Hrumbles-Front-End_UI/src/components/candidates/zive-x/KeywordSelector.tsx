// src/components/candidates/zive-x/KeywordSelector.tsx
// This component is nearly identical in structure to SkillSelector.tsx
// Just change the RPC function it calls.
import { useState, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/zive-x/useDebounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a lib/utils.ts for shadcn

interface KeywordSelectorProps {
  selectedKeywords: string[];
  onSelectionChange: (keywords: string[]) => void;
  organizationId: string;
}

export const KeywordSelector: FC<KeywordSelectorProps> = ({ selectedKeywords, onSelectionChange, organizationId }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['keywordSuggestions', debouncedSearchTerm, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_keyword_suggestions', {
        p_organization_id: organizationId,
        p_search_term: debouncedSearchTerm,
      });
      if (error) throw new Error(error.message);
      return data.map(item => item.suggestion); // We just need the suggestion text
    },
    enabled: !!organizationId && debouncedSearchTerm.length > 2, // Only search when user types
  });

  const handleSelect = (keyword: string) => {
    const newSelection = selectedKeywords.includes(keyword)
      ? selectedKeywords.filter(k => k !== keyword)
      : [...selectedKeywords, keyword];
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
            <span className="text-muted-foreground font-normal">
              {selectedKeywords.length > 0 ? `${selectedKeywords.length} keywords selected` : "Select keywords..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}> {/* We are filtering on the server */}
            <CommandInput
              placeholder="Search for keywords..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>{isLoading ? "Searching..." : "No keywords found."}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {options.map((keyword) => (
                <CommandItem
                  key={keyword}
                  value={keyword}
                  onSelect={() => handleSelect(keyword)}
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedKeywords.includes(keyword) ? "opacity-100" : "opacity-0")} />
                  {keyword}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2">
        {selectedKeywords.map(keyword => (
          <Badge key={keyword} variant="secondary">
            {keyword}
            <button onClick={() => handleSelect(keyword)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
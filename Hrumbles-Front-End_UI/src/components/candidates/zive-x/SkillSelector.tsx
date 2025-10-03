// src/components/candidates/zive-x/SkillSelector.tsx

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

interface SkillSelectorProps {
  selectedSkills: string[];
  onSelectionChange: (skills: string[]) => void;
  organizationId: string;
}

export const SkillSelector: FC<SkillSelectorProps> = ({ selectedSkills, onSelectionChange, organizationId }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay

  const { data: options = [], isLoading } = useQuery({
    // UPDATE THE QUERY KEY: Add organizationId to make the query unique per org
    queryKey: ['searchableOrgSkills', debouncedSearchTerm, organizationId],
    queryFn: async () => {
      // UPDATE THE RPC CALL: Use the new function and pass both parameters
      const { data, error } = await supabase.rpc('get_org_skills_by_search', {
        p_organization_id: organizationId,
        p_search_term: debouncedSearchTerm,
      });
      if (error) throw new Error(error.message);
      return data.map(item => item.skill);
    },
    // Only run the query if an organizationId is present
    enabled: !!organizationId,
  });

  const handleSelect = (skill: string) => {
    const newSelection = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
            <span className="text-muted-foreground font-normal">
              {selectedSkills.length > 0 ? `${selectedSkills.length} skills selected` : "Select skills..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}> {/* We are filtering on the server */}
            <CommandInput
              placeholder="Search for skills..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>{isLoading ? "Searching..." : "No skills found."}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {options.map((skill) => (
                <CommandItem
                  key={skill}
                  value={skill}
                  onSelect={() => handleSelect(skill)}
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedSkills.includes(skill) ? "opacity-100" : "opacity-0")} />
                  {skill}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2">
        {selectedSkills.map(skill => (
          <Badge key={skill} variant="secondary">
            {skill}
            <button onClick={() => handleSelect(skill)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
// src/components/candidates/zive-x/SkillSelector.tsx

import { useState, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/zive-x/useDebounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronsUpDown, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// NEW: Define the structure for a skill object
export interface Skill {
  value: string;
  mandatory: boolean;
}

interface SkillSelectorProps {
  selectedSkills: Skill[];
  onSelectionChange: (skills: Skill[]) => void;
  organizationId: string;
}

export const SkillSelector: FC<SkillSelectorProps> = ({ selectedSkills, onSelectionChange, organizationId }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['searchableOrgSkills', debouncedSearchTerm, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_skills_by_search', {
        p_organization_id: organizationId,
        p_search_term: debouncedSearchTerm,
      });
      if (error) throw new Error(error.message);
      return data.map(item => item.skill);
    },
    enabled: !!organizationId,
  });

  const handleSelect = (skillValue: string) => {
    const existingSkill = selectedSkills.find(s => s.value === skillValue);
    if (existingSkill) {
      // If it exists, remove it
      onSelectionChange(selectedSkills.filter(s => s.value !== skillValue));
    } else {
      // If it doesn't exist, add it as non-mandatory by default
      onSelectionChange([...selectedSkills, { value: skillValue, mandatory: false }]);
    }
  };

  const handleToggleMandatory = (skillValue: string) => {
    onSelectionChange(selectedSkills.map(s => 
      s.value === skillValue ? { ...s, mandatory: !s.mandatory } : s
    ));
  };
  
  const selectedValues = new Set(selectedSkills.map(s => s.value));

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
            <span className="text-muted-foreground font-normal">
              {selectedSkills.length > 0 ? `${selectedSkills.length} skills selected` : "Search and select skills..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search for skills..." value={searchTerm} onValueChange={setSearchTerm} />
            <CommandEmpty>{isLoading ? "Searching..." : "No skills found."}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {options.map((skill) => (
                <CommandItem key={skill} value={skill} onSelect={() => handleSelect(skill)}>
                  <Check className={cn("mr-2 h-4 w-4", selectedValues.has(skill) ? "opacity-100" : "opacity-0")} />
                  {skill}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2">
        {selectedSkills.map(skill => (
          <Badge key={skill.value} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 text-sm bg-indigo-100 text-indigo-800">
            <button type="button" onClick={() => handleToggleMandatory(skill.value)}>
              <Star className={cn("h-4 w-4 transition-colors", skill.mandatory ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400 hover:text-yellow-500')} />
            </button>
            <span className="font-medium">{skill.value}</span>
            <button type="button" onClick={() => handleSelect(skill.value)}>
              <X className="h-3 w-3 text-indigo-600" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
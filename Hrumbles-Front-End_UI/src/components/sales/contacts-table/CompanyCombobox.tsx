import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Company { id: number; name: string; }

interface CompanyComboboxProps {
    value: number | null;
    onSelect: (companyId: number | null) => void;
    initialName?: string | null;
}

export const CompanyCombobox: React.FC<CompanyComboboxProps> = ({ value, onSelect, initialName }) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [selectedName, setSelectedName] = React.useState(initialName || '');

    // Only fetch companies when search term is non-empty
    const { data: companies = [], isLoading } = useQuery<Company[], Error>({
        queryKey: ['companies', search],
        queryFn: async () => {
            // Only execute query if search term is provided
            if (!search) return [];
            const { data, error } = await supabase
                .from('companies')
                .select('id, name')
                .ilike('name', `%${search}%`)
                .limit(20);
            if (error) throw error;
            return data || [];
        },
        // Prevent query from running when search is empty
        enabled: !!search,
    });

    // Update displayed name if the value prop changes from the outside
    React.useEffect(() => {
        if (value) {
            const company = companies.find(c => c.id === value);
            if (company) {
                setSelectedName(company.name);
            } else if (initialName) {
                setSelectedName(initialName);
            } else {
                setSelectedName('');
            }
        } else {
            setSelectedName(initialName || '');
        }
    }, [value, initialName, companies]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" role="combobox" aria-expanded={open} className="w-full justify-start font-normal h-full p-0">
                    <span className="truncate">{selectedName || <span className="text-muted-foreground">Select...</span>}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search company..." onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty>{isLoading ? 'Loading...' : search ? 'No company found.' : 'Type to search...'}</CommandEmpty>
                        <CommandGroup>
                            {companies.map((company) => (
                                <CommandItem
                                    key={company.id}
                                    value={company.name}
                                    onSelect={() => {
                                        onSelect(company.id);
                                        setSelectedName(company.name);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === company.id ? "opacity-100" : "opacity-0")} />
                                    {company.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
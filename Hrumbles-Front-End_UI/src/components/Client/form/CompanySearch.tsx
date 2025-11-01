// src/components/Client/form/CompanySearch.tsx
import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';

interface CompanySearchResult {
  company_name: string;
  CIN_or_Registration_Number?: string;
  status?: string;
  date_of_incorporation?: string;
}

interface CompanyDetails {
  company_name: string;
  country: string;
  CIN_or_Registration_Number: string;
  LEI?: string;
  stock_symbol?: string;
  stock_exchange?: string;
  date_of_incorporation: string;
  jurisdiction: string;
  registered_address: string;
  status: string;
  authorized_share_capital?: string;
  paid_up_share_capital?: string;
  directors_or_executives: string[];
  industry: string;
  parent_company?: string;
  subsidiaries: string[];
  source_links: string[];
}

interface Company {
  id?: string;
  name: string;
  address: string | { street: string; city: string; state: string; country: string; zipCode: string };
  state?: string;
  country?: string;
  registration_number?: string;
  source: 'local' | 'external';
  // Additional fields from details
  lei?: string;
  stock_symbol?: string;
  stock_exchange?: string;
  date_of_incorporation?: string;
  jurisdiction?: string;
  authorized_share_capital?: string;
  paid_up_share_capital?: string;
  directors_or_executives?: string[];
  industry?: string;
  parent_company?: string;
  subsidiaries?: string[];
  source_links?: string[];
}

interface CompanySearchProps {
  onSelectCompany: (company: Company) => void;
}

const CompanySearch: React.FC<CompanySearchProps> = ({ onSelectCompany }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [localResults, setLocalResults] = useState<Company[]>([]);
  const [externalResults, setExternalResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // No need for a separate 'showExternal' state, we can just check if externalResults has items.

  // --- Data Fetching Logic (mostly the same, just simplified dependencies) ---

  const handleLocalSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocalResults([]);
      setExternalResults([]); // Clear external results when local search runs
      return;
    }
    setLoading(true);
    setExternalResults([]); // Clear previous external results on new search
    try {
      const { data: localData } = await supabase.rpc('search_companies_by_name', { search_query: query });
      const results: Company[] = localData ? localData.map(item => ({
        id: item.id,
        name: item.company_name,
        address: item.registered_address,
        state: item.state,
        country: 'India',
        registration_number: item.cin,
        source: 'local' as const,
      })) : [];
      setLocalResults(results);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExternalSearch = useCallback(async () => {
    if (debouncedSearchTerm.length < 3) return;
    setLoading(true);
    setLocalResults([]); // Clear local results when searching externally
    try {
      const { data, error } = await supabase.functions.invoke('company-master', {
        body: { company: debouncedSearchTerm },
      });
      if (error) throw error;
      const companies = data?.companies || [];
      setExternalResults(companies);
    } catch (e) {
      console.error("External search failed:", e.message);
      setExternalResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm]);

  React.useEffect(() => {
    handleLocalSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, handleLocalSearch]);

  const fetchCompanyDetails = useCallback(async (companyName: string): Promise<CompanyDetails | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('company-master', {
        body: { company: companyName },
      });
      if (error) throw error;
      return data?.companies?.[0] || null;
    } catch (e: any) {
      console.error("Fetch details failed:", e.message);
      return null;
    }
  }, []);

  const handleSelect = useCallback(async (company: Company | CompanySearchResult, source: 'local' | 'external') => {
    setLoading(true);
    setPopoverOpen(false);
    setSearchTerm(source === 'local' ? (company as Company).name : (company as CompanySearchResult).company_name);

    let details: CompanyDetails | null = null;
    let baseCompany: Company;

    if (source === 'local') {
      baseCompany = company as Company;
      // For local, we might not have full details, but assume we pass what we have
      onSelectCompany(baseCompany);
    } else {
      // For external, fetch full details
      details = await fetchCompanyDetails((company as CompanySearchResult).company_name);
      if (details) {
        baseCompany = {
          name: details.company_name,
          address: details.registered_address,
          country: details.country,
          registration_number: details.CIN_or_Registration_Number,
          source: 'external' as const,
          // Map additional fields
          lei: details.LEI,
          stock_symbol: details.stock_symbol,
          stock_exchange: details.stock_exchange,
          date_of_incorporation: details.date_of_incorporation,
          jurisdiction: details.jurisdiction,
          authorized_share_capital: details.authorized_share_capital,
          paid_up_share_capital: details.paid_up_share_capital,
          directors_or_executives: details.directors_or_executives,
          industry: details.industry,
          parent_company: details.parent_company,
          subsidiaries: details.subsidiaries,
          source_links: details.source_links,
        };
        onSelectCompany(baseCompany);
      }
    }

    setLoading(false);
  }, [onSelectCompany, fetchCompanyDetails]);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input 
            placeholder="Search for a company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
            // REMOVED onFocus handler - it's not needed.
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          {/* Input is now part of the trigger, not inside the command list */}
          <CommandList>
            <CommandEmpty>
              {loading ? 'Searching...' : 'No results found.'}
            </CommandEmpty>
            
            {localResults.length > 0 && (
              <CommandGroup heading="From Your Data">
                {localResults.map((company, index) => (
                  <CommandItem key={`local-${index}`} onSelect={() => handleSelect(company, 'local')}>
                    {company.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {externalResults.length > 0 && (
              <CommandGroup heading="From External Search">
                {externalResults.map((company, index) => (
                  <CommandItem key={`external-${index}`} onSelect={() => handleSelect(company, 'external')}>
                    {company.company_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* --- SIMPLIFIED AND RELIABLE EXTERNAL SEARCH BUTTON --- */}
            {debouncedSearchTerm.length >= 3 && !loading && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleExternalSearch}
                  className="text-indigo-600 cursor-pointer"
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span>Search for "{debouncedSearchTerm}" globally</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CompanySearch;
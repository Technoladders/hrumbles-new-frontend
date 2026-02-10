// src/components/sales/company-search/filters/CompanyLocationFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import {
  MapPin,
  Search,
  X,
  Check,
  Loader2,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Location {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  count: number;
}

interface CompanyLocationFilterSelectProps {
  selectedLocations: string[];
  onSelectionChange: (locations: string[]) => void;
  type: 'country' | 'city' | 'location';
  fileId?: string | null;
}

export const CompanyLocationFilterSelect: React.FC<CompanyLocationFilterSelectProps> = ({
  selectedLocations,
  onSelectionChange,
  type,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Position dropdown below input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['company-location-suggestions', organization_id, type, searchTerm, fileId],
    queryFn: async () => {
      let selectFields = 'location';
      if (type === 'country') {
        selectFields = 'country';
      } else if (type === 'city') {
        selectFields = 'city, state, country';
      }

      let query = supabase
        .from('companies')
        .select(selectFields)
        .eq('organization_id', organization_id);

      if (type === 'country') {
        query = query.not('country', 'is', null);
      } else if (type === 'city') {
        query = query.not('city', 'is', null);
      } else {
        query = query.not('location', 'is', null);
      }

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const locationMap = new Map<string, Location>();

      (data || []).forEach((company: any) => {
        let key = '';
        let location: Location;

        if (type === 'country') {
          key = company.country;
          location = { name: key, country: key, count: 1 };
        } else if (type === 'city') {
          key = company.state 
            ? `${company.city}, ${company.state}`
            : company.city;
          location = { 
            name: key, 
            city: company.city, 
            state: company.state, 
            country: company.country, 
            count: 1 
          };
        } else {
          key = company.location;
          location = { name: key, count: 1 };
        }

        if (!key) return;

        const existing = locationMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          locationMap.set(key, location);
        }
      });

      let locationArray = Array.from(locationMap.values()).sort(
        (a, b) => b.count - a.count
      );

      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        locationArray = locationArray.filter((loc) =>
          loc.name.toLowerCase().includes(searchLower)
        );
      }

      return locationArray.slice(0, 50);
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleLocation = (locationKey: string) => {
    const newLocations = selectedLocations.includes(locationKey)
      ? selectedLocations.filter((l) => l !== locationKey)
      : [...selectedLocations, locationKey];

    onSelectionChange(newLocations);
  };

  const removeLocation = (locationKey: string) => {
    onSelectionChange(selectedLocations.filter((l) => l !== locationKey));
  };

  const clearAll = () => {
    onSelectionChange([]);
    setSearchTerm('');
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'country': return 'Search countries...';
      case 'city': return 'Search cities...';
      default: return 'Search locations...';
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
        <Input
          ref={inputRef}
          placeholder={getPlaceholder()}
          className="pl-8 pr-8 h-8 text-xs border-slate-200"
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
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && dropdownPosition && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <ScrollArea className="max-h-[220px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="ml-2 text-xs text-slate-500">Loading...</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="py-4 text-center">
                <MapPin className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-500">
                  {searchTerm ? 'No locations found' : 'No locations available'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {locations.map((location) => {
                  const isSelected = selectedLocations.includes(location.name);

                  return (
                    <div
                      key={location.name}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                        isSelected ? 'bg-rose-50 hover:bg-rose-100' : 'hover:bg-slate-50'
                      )}
                      onClick={() => toggleLocation(location.name)}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-rose-100" : "bg-slate-100"
                      )}>
                        {type === 'country' ? (
                          <Globe size={12} className={isSelected ? 'text-rose-600' : 'text-slate-500'} />
                        ) : (
                          <MapPin size={12} className={isSelected ? 'text-rose-600' : 'text-slate-500'} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {location.name}
                        </p>
                        {type === 'city' && location.country && (
                          <p className="text-[10px] text-slate-500 truncate">
                            {location.country}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 tabular-nums">
                        {location.count}
                      </span>

                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-rose-600 border-rose-600' : 'border-slate-300'
                      )}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Selected Tags */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLocations.slice(0, 3).map((locationKey) => (
            <Badge
              key={locationKey}
              variant="secondary"
              className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium flex items-center gap-1"
            >
              <span className="truncate max-w-[80px]">{locationKey.split(',')[0]}</span>
              <button
                onClick={() => removeLocation(locationKey)}
                className="hover:bg-rose-200 rounded-full p-0.5"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
          {selectedLocations.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              +{selectedLocations.length - 3}
            </Badge>
          )}
          {selectedLocations.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyLocationFilterSelect;
// src/components/sales/contacts-table/filters/LocationFilterSelect.tsx
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
  Building2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Location {
  city?: string;
  state?: string;
  country: string;
  count: number;
}

interface LocationFilterSelectProps {
  selectedLocations: string[];
  onSelectionChange: (locations: string[]) => void;
  type: 'country' | 'city';
  fileId?: string | null;
}

export const LocationFilterSelect: React.FC<LocationFilterSelectProps> = ({
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
    queryKey: ['location-suggestions', organization_id, type, searchTerm, fileId],
    queryFn: async () => {
      let query;

      if (fileId) {
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              country,
              ${type === 'city' ? 'city, state' : ''}
            )
          `)
          .eq('file_id', fileId);
      } else {
        query = supabase
          .from('contacts')
          .select(`country${type === 'city' ? ', city, state' : ''}`)
          .eq('organization_id', organization_id);
      }

      if (type === 'country') {
        query = query.not('country', 'is', null);
      } else {
        query = query.not('city', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contacts = fileId
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : data || [];

      const locationMap = new Map<string, Location>();

      contacts.forEach((contact: any) => {
        if (type === 'country') {
          const country = contact.country;
          if (!country) return;

          const existing = locationMap.get(country);
          if (existing) {
            existing.count++;
          } else {
            locationMap.set(country, { country, count: 1 });
          }
        } else {
          const city = contact.city;
          const state = contact.state;
          const country = contact.country;

          if (!city || !country) return;

          const key = `${city}, ${state || ''} ${country}`.trim();
          const existing = locationMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            locationMap.set(key, { city, state, country, count: 1 });
          }
        }
      });

      let locationArray = Array.from(locationMap.values()).sort(
        (a, b) => b.count - a.count
      );

      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        locationArray = locationArray.filter((loc) => {
          if (type === 'country') {
            return loc.country.toLowerCase().includes(searchLower);
          } else {
            const cityMatch = loc.city?.toLowerCase().includes(searchLower);
            const stateMatch = loc.state?.toLowerCase().includes(searchLower);
            const countryMatch = loc.country.toLowerCase().includes(searchLower);
            return cityMatch || stateMatch || countryMatch;
          }
        });
      }

      return locationArray.slice(0, 50);
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const getLocationKey = (loc: Location) => {
    if (type === 'country') {
      return loc.country;
    }
    return `${loc.city}, ${loc.state || ''} ${loc.country}`.trim();
  };

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

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-2.5 top-2.5 text-slate-400"
          size={14}
        />
        <Input
          ref={inputRef}
          placeholder={type === 'country' ? 'Search countries...' : 'Search cities...'}
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
          <ScrollArea className="max-h-[240px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="ml-2 text-xs text-slate-500">Searching...</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="py-6 text-center">
                <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  {searchTerm
                    ? 'No locations found'
                    : `Type to search ${type === 'country' ? 'countries' : 'cities'}`}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {locations.map((location) => {
                  const locationKey = getLocationKey(location);
                  const isSelected = selectedLocations.includes(locationKey);

                  return (
                    <div
                      key={locationKey}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                        isSelected ? 'bg-rose-50 hover:bg-rose-100' : 'hover:bg-slate-50'
                      )}
                      onClick={() => toggleLocation(locationKey)}
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            isSelected
                              ? 'bg-rose-100'
                              : 'bg-gradient-to-br from-slate-100 to-slate-200'
                          )}
                        >
                          {type === 'country' ? (
                            <Globe
                              size={14}
                              className={isSelected ? 'text-rose-600' : 'text-slate-500'}
                            />
                          ) : (
                            <MapPin
                              size={14}
                              className={isSelected ? 'text-rose-600' : 'text-slate-500'}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {type === 'country' ? (
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {location.country}
                          </p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {location.city}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {location.state && `${location.state}, `}
                              {location.country}
                            </p>
                          </>
                        )}
                      </div>

                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5"
                      >
                        {location.count}
                      </Badge>

                      <div
                        className={cn(
                          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                          isSelected
                            ? 'bg-rose-600 border-rose-600'
                            : 'border-slate-300'
                        )}
                      >
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

      {/* Selected Tags */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedLocations.map((locationKey) => (
            <Badge
              key={locationKey}
              variant="secondary"
              className="pl-1.5 pr-1 py-1 bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium flex items-center gap-1.5"
            >
              <div className="w-4 h-4 rounded bg-rose-200 flex items-center justify-center">
                {type === 'country' ? (
                  <Globe size={8} className="text-rose-600" />
                ) : (
                  <MapPin size={8} className="text-rose-600" />
                )}
              </div>
              <span className="truncate max-w-[120px]">{locationKey}</span>
              <button
                onClick={() => removeLocation(locationKey)}
                className="ml-0.5 hover:bg-rose-200 rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}

          {selectedLocations.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1.5"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};
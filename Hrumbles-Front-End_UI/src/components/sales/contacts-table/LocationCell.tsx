// src/components/sales/contacts-table/LocationCell.tsx
import React, { useState, useEffect } from 'react';
import { CountrySelect, StateSelect, CitySelect } from 'react-country-state-city';
import { lookupViaCity, findFromCityStateProvince, findFromIsoCode } from 'city-timezones';
import { Button } from '@/components/ui/button';
import { SimpleContact } from '@/types/simple-contact.types';
import { Clock, MapPin, Pencil, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import "react-country-state-city/dist/react-country-state-city.css";

interface LocationCellProps {
  row: {
    index: number;
    original: SimpleContact;
  };
  table: {
    options: {
      meta?: {
        updateData: (rowIndex: number, columnId: string, value: any) => void;
      };
    };
  };
}

export const LocationCell: React.FC<LocationCellProps> = ({ row, table }) => {
    const { updateData } = table.options.meta || {};
    const contact = row.original;

    // Check if this is a discovery row
    if (contact.is_discovery) {
        const location = [
            contact.city || contact.original_data?.city,
            contact.state || contact.original_data?.state,
            contact.country || contact.original_data?.country
        ].filter(Boolean).join(', ');
        
        return (
            <span className="text-xs text-slate-600 truncate">
                {location || <span className="text-slate-400">-</span>}
            </span>
        );
    }

    const [country, setCountry] = useState<any>(
        contact.country ? { 
            name: contact.country, 
            id: contact.country_id, 
            iso2: contact.country_iso2 
        } : null
    );
    const [state, setState] = useState<any>(
        contact.state ? { 
            name: contact.state, 
            id: contact.state_id, 
            iso2: contact.state_iso2 
        } : null
    );
    const [city, setCity] = useState<any>(
        contact.city ? { name: contact.city } : null
    );
    const [isEditing, setIsEditing] = useState(false);
    
    // State to hold the live-updating local time string
    const [localTime, setLocalTime] = useState<string | null>(null);

    // Effect to update the local time every second if a timezone exists
    useEffect(() => {
        if (!contact.timezone) {
            setLocalTime(null);
            return;
        }

        // Set initial time immediately
        try {
            const time = new Date().toLocaleTimeString('en-US', {
                timeZone: contact.timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
            setLocalTime(time);
        } catch (e) {
            setLocalTime(null);
            return;
        }

        const timerId = setInterval(() => {
            try {
                const time = new Date().toLocaleTimeString('en-US', {
                    timeZone: contact.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
                setLocalTime(time);
            } catch (e) {
                setLocalTime(null);
                clearInterval(timerId);
            }
        }, 1000);

        // Cleanup function to clear the interval when the component unmounts
        return () => clearInterval(timerId);
    }, [contact.timezone]);

    // Sync state when contact changes
    useEffect(() => {
        setCountry(contact.country ? { 
            name: contact.country, 
            id: contact.country_id, 
            iso2: contact.country_iso2 
        } : null);
        setState(contact.state ? { 
            name: contact.state, 
            id: contact.state_id, 
            iso2: contact.state_iso2 
        } : null);
        setCity(contact.city ? { name: contact.city } : null);
    }, [contact.country, contact.state, contact.city, contact.country_id, contact.state_id, contact.country_iso2, contact.state_iso2]);

    const handleSave = () => {
        const updates: Partial<SimpleContact> & { updated_by?: string; timezone?: string | null } = {
            country: country?.name || null,
            state: state?.name || null,
            city: city?.name || null,
            country_id: country?.id || null,
            state_id: state?.id || null,
            country_iso2: country?.iso2 || null,
            state_iso2: state?.iso2 || null,
        };

        // Implement the prioritized timezone lookup
        let timezoneFound = false;
        try {
            // Priority 1: Try to find by City name
            if (city?.name) {
                const matches = lookupViaCity(city.name);
                if (matches.length > 0) {
                    updates.timezone = matches[0].timezone;
                    timezoneFound = true;
                }
            }
            // Priority 2: If no city match, try by State and Country
            if (!timezoneFound && state?.name && country?.iso2) {
                const matches = findFromCityStateProvince(`${state.name} ${country.iso2}`);
                if (matches.length > 0) {
                    updates.timezone = matches[0].timezone;
                    timezoneFound = true;
                }
            }
            // Priority 3: If still no match, fall back to the first timezone for the Country
            if (!timezoneFound && country?.iso2) {
                const matches = findFromIsoCode(country.iso2);
                if (matches.length > 0) {
                    updates.timezone = matches[0].timezone;
                }
            }
        } catch (e) {
            // Fail silently if all lookups fail
        }
        
        if (updateData) {
           updateData(row.index, 'location', updates);
        }
        
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setCountry(contact.country ? { 
            name: contact.country, 
            id: contact.country_id, 
            iso2: contact.country_iso2 
        } : null);
        setState(contact.state ? { 
            name: contact.state, 
            id: contact.state_id, 
            iso2: contact.state_iso2 
        } : null);
        setCity(contact.city ? { name: contact.city } : null);
        setIsEditing(false);
    };

    const displayValue = [contact.city, contact.state, contact.country].filter(Boolean).join(', ');

    if (isEditing) {
        return (
            <div className="space-y-2 p-2 bg-slate-50 rounded-md border min-w-[220px]">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Country</label>
                    <CountrySelect
                        onChange={(e: any) => { 
                            setCountry(e); 
                            setState(null); 
                            setCity(null); 
                        }}
                        placeHolder="Select Country"
                        defaultValue={country}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">State</label>
                    <StateSelect
                        countryid={country?.id}
                        onChange={(e: any) => { 
                            setState(e); 
                            setCity(null); 
                        }}
                        placeHolder="Select State"
                        defaultValue={state}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">City</label>
                    <CitySelect
                        countryid={country?.id}
                        stateid={state?.id}
                        onChange={(e: any) => setCity(e)}
                        placeHolder="Select City"
                        defaultValue={city}
                    />
                </div>
                <div className="flex justify-end space-x-2 mt-3 pt-2 border-t">
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleCancel}
                        className="h-7 text-xs"
                    >
                        <X size={12} className="mr-1" /> Cancel
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={handleSave}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Check size={12} className="mr-1" /> Save
                    </Button>
                </div>
                {/* Display the local time at the bottom of the editor */}
                {localTime && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-center">
                        <div className="flex items-center justify-center gap-1.5">
                            <Clock size={12} className="text-blue-600" />
                            <span className="text-xs text-blue-800">
                                Local Time: <span className="font-semibold">{localTime}</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className="flex items-center justify-between group h-full w-full cursor-pointer py-1" 
            onClick={() => setIsEditing(true)}
        >
            <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate text-xs text-slate-700">
                        {displayValue || <span className="text-slate-400 italic">Set Location</span>}
                    </span>
                </div>
                {/* Display the local time subtly when not editing */}
                {localTime && (
                    <div className="flex items-center gap-1 mt-0.5 pl-4">
                        <Clock size={9} className="text-blue-500" />
                        <span className="text-[10px] text-blue-600 font-medium">{localTime}</span>
                    </div>
                )}
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                }}
            >
                <Pencil size={12} className="text-slate-400" />
            </Button>
        </div>
    );
}
// src/components/sales/contacts-table/LocationCell.tsx
import React, { useState, useEffect } from 'react';
import { CountrySelect, StateSelect, CitySelect } from 'react-country-state-city';
// [FIX 1] Import all the necessary lookup functions.
import { lookupViaCity, findFromCityStateProvince, findFromIsoCode } from 'city-timezones';
import { Button } from '@/components/ui/button';
import { SimpleContact } from '@/types/simple-contact.types';

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
    const { updateData } = table.options.meta!;
    const contact = row.original;

    const [country, setCountry] = useState(contact.country ? { name: contact.country, id: contact.country_id, iso2: contact.country_iso2 } : null);
    const [state, setState] = useState(contact.state ? { name: contact.state, id: contact.state_id, iso2: contact.state_iso2 } : null);
    const [city, setCity] = useState(contact.city ? { name: contact.city } : null);
    const [isEditing, setIsEditing] = useState(false);
    
    // [NEW] State to hold the live-updating local time string.
    const [localTime, setLocalTime] = useState<string | null>(null);

    // [NEW] Effect to update the local time every second if a timezone exists.
    useEffect(() => {
        if (!contact.timezone) {
            setLocalTime(null);
            return;
        }

        const timerId = setInterval(() => {
            try {
                const time = new Date().toLocaleTimeString('en-US', {
                    timeZone: contact.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                });
                setLocalTime(time);
            } catch (e) {
                // If the timezone is invalid for some reason, stop the timer.
                setLocalTime(null);
                clearInterval(timerId);
            }
        }, 1000);

        // Cleanup function to clear the interval when the component unmounts.
        return () => clearInterval(timerId);
    }, [contact.timezone]); // This effect re-runs whenever the contact's timezone changes.


    const handleSave = () => {
        const updates: Partial<SimpleContact> & { updated_by?: string } = {
            country: country?.name || null,
            state: state?.name || null,
            city: city?.name || null,
        };

        // [FIX 2] Implement the prioritized timezone lookup.
        let timezoneFound = false;
        try {
            // Priority 1: Try to find by City name.
            if (city?.name) {
                const matches = lookupViaCity(city.name);
                if (matches.length > 0) {
                    updates.timezone = matches[0].timezone;
                    timezoneFound = true;
                }
            }
            // Priority 2: If no city match, try by State and Country.
            if (!timezoneFound && state?.name && country?.iso2) {
                const matches = findFromCityStateProvince(`${state.name} ${country.iso2}`);
                if (matches.length > 0) {
                    updates.timezone = matches[0].timezone;
                    timezoneFound = true;
                }
            }
            // Priority 3: If still no match, fall back to the first timezone for the Country.
            if (!timezoneFound && country?.iso2) {
                const matches = findFromIsoCode(country.iso2);
                if (matches.length > 0) {
                    updates.timezone = matches[0].timezone;
                }
            }
        } catch (e) {
            // Fail silently if all lookups fail.
        }
        
        if (updateData) {
           updateData(row.index, 'location', updates);
        }
        
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setCountry(contact.country ? { name: contact.country, id: contact.country_id, iso2: contact.country_iso2 } : null);
        setState(contact.state ? { name: contact.state, id: contact.state_id, iso2: contact.state_iso2 } : null);
        setCity(contact.city ? { name: contact.city } : null);
        setIsEditing(false);
    };

    const displayValue = [contact.city, contact.state, contact.country].filter(Boolean).join(', ');

    if (isEditing) {
        return (
            <div className="space-y-2 p-2 bg-slate-50 rounded-md border">
                <CountrySelect
                    onChange={(e: any) => { setCountry(e); setState(null); setCity(null); }}
                    placeHolder="Select Country"
                />
                <StateSelect
                    countryid={country?.id}
                    onChange={(e: any) => { setState(e); setCity(null); }}
                    placeHolder="Select State"
                />
                <CitySelect
                    countryid={country?.id}
                    stateid={state?.id}
                    onChange={(e: any) => setCity(e)}
                    placeHolder="Select City"
                />
                <div className="flex justify-end space-x-2 mt-2">
                    <Button size="xs" variant="ghost" onClick={handleCancel}>Cancel</Button>
                    <Button size="xs" onClick={handleSave}>Save</Button>
                </div>
                {/* [NEW] Display the local time at the bottom of the editor. */}
                {localTime && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-center">
                        <p className="text-xs text-blue-800">
                            Local Time: <span className="font-semibold">{localTime}</span>
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
         <div className="flex items-center justify-between group h-full w-full" onClick={() => setIsEditing(true)}>
            <div className="flex flex-col">
                <span className="truncate cursor-pointer">
                    {displayValue || <span className="text-muted-foreground">Set Location</span>}
                </span>
                {/* [NEW] Display the local time subtly when not editing. */}
                {localTime && (
                    <span className="text-xs text-muted-foreground">{localTime}</span>
                )}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </Button>
        </div>
    );
};
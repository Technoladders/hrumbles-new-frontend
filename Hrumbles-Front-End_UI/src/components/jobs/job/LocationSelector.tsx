// LocationSelector.tsx
import { useState, useMemo, useRef, useEffect } from "react";
import { Badge } from "@/components/jobs/ui/badge";
import { Button } from "@/components/jobs/ui/button";
import { X, ChevronDown, MapPin, Loader2 } from "lucide-react";
import { City } from "country-state-city";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface LocationSelectorProps {
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
  placeholder?: string;
  countryCode?: string;
  organizationId: string;
}

// Helper to capitalize first letter of each word
const capitalizeLocation = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function LocationSelector({
  selectedLocations = [],
  onChange,
  placeholder = "Search and select cities...",
  countryCode = "IN",
  organizationId,
}: LocationSelectorProps) {
  const safeSelectedLocations = Array.isArray(selectedLocations) ? selectedLocations : [];
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCities = useMemo(() => {
    try {
      return City.getCitiesOfCountry(countryCode) ?? [];
    } catch {
      return [];
    }
  }, [countryCode]);

  const {
    data: customLocations = [],
    isLoading: isCustomLoading,
  } = useQuery({
    queryKey: ["custom_locations", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_locations")
        .select("name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data?.map((row) => row.name) ?? [];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (trimmed.length === 0 && isOpen) {
      return customLocations
        .filter((loc) => !safeSelectedLocations.includes(loc))
        .slice(0, 10)
        .map((loc) => ({ name: loc, isCustom: true }));
    }

    if (trimmed.length < 2) return [];

    const libraryMatches = allCities
      .filter(
        (city) =>
          city.name.toLowerCase().includes(trimmed) &&
          !safeSelectedLocations.includes(city.name)
      )
      .slice(0, 15)
      .map((city) => ({ name: city.name, isCustom: false }));

    const customMatches = customLocations
      .filter(
        (loc) =>
          loc.toLowerCase().includes(trimmed) &&
          !safeSelectedLocations.includes(loc) &&
          !allCities.some(
            (city) => city.name.toLowerCase() === loc.toLowerCase()
          )
      )
      .slice(0, 5)
      .map((loc) => ({ name: loc, isCustom: true }));

    return [...libraryMatches, ...customMatches].slice(0, 20);
  }, [query, allCities, customLocations, safeSelectedLocations, isOpen]);

  const handleAddCity = async (cityName: string, isCustom: boolean) => {
    // Capitalize the first letter of each word
    const formattedName = capitalizeLocation(cityName);
    
    if (safeSelectedLocations.includes(formattedName)) return;

    onChange([...safeSelectedLocations, formattedName]);

    const isLibraryCity = allCities.some(
      (c) => c.name.toLowerCase() === formattedName.toLowerCase()
    );

    if (isCustom || !isLibraryCity) {
      if (!organizationId) {
        console.warn("Cannot save custom location: organizationId is missing");
        return;
      }
      
      const { error } = await supabase
        .from("custom_locations")
        .upsert(
          { organization_id: organizationId, name: formattedName },
          { onConflict: "organization_id, name", ignoreDuplicates: true }
        );
      if (!error) {
        queryClient.invalidateQueries({
          queryKey: ["custom_locations", organizationId],
        });
      } else {
        console.error("Failed to save custom location:", error);
      }
    }

    setQuery("");
    inputRef.current?.focus();
  };

  const handleAddCustom = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    handleAddCity(trimmed, true);
  };

  const handleRemoveLocation = (location: string) => {
    onChange(safeSelectedLocations.filter((loc) => loc !== location));
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length === 0) return;

      if (suggestions.length > 0) {
        const first = suggestions[0];
        handleAddCity(first.name, first.isCustom);
      } else {
        handleAddCustom();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative">
        <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-purple-500">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm outline-none bg-transparent"
          />
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-full"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {isCustomLoading && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading custom locations…
              </div>
            )}

            {query.trim().length === 0 &&
              !isCustomLoading &&
              customLocations.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs text-gray-400 font-medium bg-gray-50">
                    Organisation custom locations
                  </div>
                  {customLocations
                    .filter((loc) => !safeSelectedLocations.includes(loc))
                    .slice(0, 8)
                    .map((loc) => (
                      <button
                        key={`custom-${loc}`}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 outline-none flex items-center gap-2"
                        onClick={() => handleAddCity(loc, true)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <MapPin className="h-3.5 w-3.5 text-violet-400" />
                        {loc}
                        <span className="text-xs text-gray-400 ml-auto">custom</span>
                      </button>
                    ))}
                  <hr className="my-1" />
                </>
              )}

            {suggestions
              .filter((s) => !s.isCustom)
              .map((s) => (
                <button
                  key={`lib-${s.name}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 outline-none"
                  onClick={() => handleAddCity(s.name, false)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {s.name}
                </button>
              ))}

            {suggestions
              .filter((s) => s.isCustom)
              .map((s) => (
                <button
                  key={`custom-${s.name}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 outline-none flex items-center gap-2 text-violet-700"
                  onClick={() => handleAddCity(s.name, true)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <MapPin className="h-3.5 w-3.5 text-violet-400" />
                  {s.name}
                  <span className="text-xs text-gray-400 ml-auto">custom</span>
                </button>
              ))}

            {organizationId &&
              query.trim().length >= 2 &&
              !allCities.some(
                (c) => c.name.toLowerCase() === query.trim().toLowerCase()
              ) &&
              !customLocations.some(
                (loc) => loc.toLowerCase() === query.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-purple-600 font-medium hover:bg-purple-50 border-t flex items-center gap-2"
                  onClick={handleAddCustom}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span>+</span> Add "{capitalizeLocation(query.trim())}" as a custom location
                </button>
              )}

            {query.trim().length >= 2 &&
              suggestions.length === 0 &&
              (allCities.some(
                (c) => c.name.toLowerCase() === query.trim().toLowerCase()
              ) ||
                customLocations.some(
                  (loc) => loc.toLowerCase() === query.trim().toLowerCase()
                )) && (
                <div className="px-3 py-2 text-sm text-gray-400">
                  Location already added or selected
                </div>
              )}
          </div>
        )}
      </div>

      {safeSelectedLocations.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-1 text-xs text-purple-600 hover:underline"
        >
          Clear all
        </button>
      )}

      {safeSelectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {safeSelectedLocations.map((location) => (
            <Badge
              key={location}
              variant="secondary"
              className="mr-1 mb-1 py-1 flex items-center bg-violet-500 text-white hover:bg-violet-400 hover:text-white"
            >
              {location}
              <button
                type="button"
                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRemoveLocation(location)}
              >
                <X className="h-3 w-3 text-white hover:text-white" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
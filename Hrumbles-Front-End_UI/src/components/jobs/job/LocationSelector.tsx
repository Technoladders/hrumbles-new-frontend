// LocationSelector.tsx
import { useState, useMemo, useRef, useEffect } from "react";
import { Badge } from "@/components/jobs/ui/badge";
import { Button } from "@/components/jobs/ui/button";
import { X, ChevronDown, MapPin } from "lucide-react";
import { City } from "country-state-city";

// ---------- Persistent custom locations ----------
const STORAGE_KEY = "hr_custom_locations"; // same key across all job creation

const loadCustomLocations = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const saveCustomLocations = (locations: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  } catch {
    // quota exceeded, ignore
  }
};
// ------------------------------------------------

interface LocationSelectorProps {
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
  placeholder?: string;
  countryCode?: string; // default 'IN'
}

export default function LocationSelector({
  selectedLocations = [],
  onChange,
  placeholder = "Search and select cities...",
  countryCode = "IN",
}: LocationSelectorProps) {
  const safeSelectedLocations = Array.isArray(selectedLocations)
    ? selectedLocations
    : [];

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persistent custom locations
  const [customLocations, setCustomLocations] = useState<string[]>(loadCustomLocations);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Library cities
  const allCities = useMemo(() => {
    try {
      return City.getCitiesOfCountry(countryCode) ?? [];
    } catch {
      return [];
    }
  }, [countryCode]);

  // Merged suggestions
  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    // 1. Show all custom entries when input is empty & focused
    if (trimmed.length === 0 && isOpen) {
      return customLocations
        .filter((loc) => !safeSelectedLocations.includes(loc))
        .slice(0, 10)
        .map((loc) => ({ name: loc, isCustom: true }));
    }

    // 2. When typing: filter library + custom
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
          ) // avoid duplicating library cities
      )
      .slice(0, 5)
      .map((loc) => ({ name: loc, isCustom: true }));

    // Show library first, then custom
    return [...libraryMatches, ...customMatches].slice(0, 20);
  }, [query, allCities, customLocations, safeSelectedLocations, isOpen]);

  // Check if the typed string already exists as a library city
  const exactLibraryMatch = useMemo(
    () => allCities.some(
      (city) => city.name.toLowerCase() === query.trim().toLowerCase()
    ),
    [query, allCities]
  );

  // Add a city to selected list and optionally save custom
  const handleAddCity = (cityName: string, isCustom = false) => {
    if (!safeSelectedLocations.includes(cityName)) {
      onChange([...safeSelectedLocations, cityName]);
    }

    // Persist custom location if it's not already saved and not a library city
    if (isCustom || (!exactLibraryMatch && cityName === query.trim())) {
      const alreadyStored = customLocations.some(
        (loc) => loc.toLowerCase() === cityName.toLowerCase()
      );
      if (!alreadyStored) {
        const updated = [cityName, ...customLocations].slice(0, 50); // keep max 50
        setCustomLocations(updated);
        saveCustomLocations(updated);
      }
    }

    setQuery("");
    inputRef.current?.focus();
  };

  // Add custom typed location when not in library at all
  const handleAddCustom = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    // If there's a library suggestion selected, we'd add that; but here we force custom
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

      // If there are suggestions, add the first one
      if (suggestions.length > 0) {
        const first = suggestions[0];
        handleAddCity(first.name, first.isCustom);
      } else {
        // No suggestions, add as custom
        handleAddCustom();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      {/* Input + toggle */}
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

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Empty state: show recent custom locations */}
            {query.trim().length === 0 && customLocations.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs text-gray-400 font-medium bg-gray-50">
                  Your custom locations
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

            {/* Library suggestions */}
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

            {/* Custom suggestions that match the query */}
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

            {/* Add custom entry button (when typed text not in library nor custom) */}
            {query.trim().length >= 2 &&
              !exactLibraryMatch &&
              !customLocations.some(
                (loc) => loc.toLowerCase() === query.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-purple-600 font-medium hover:bg-purple-50 border-t flex items-center gap-2"
                  onClick={handleAddCustom}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span>+</span> Add "{query.trim()}" as a custom location
                </button>
              )}

            {query.trim().length >= 2 &&
              suggestions.length === 0 &&
              exactLibraryMatch && (
                <div className="px-3 py-2 text-sm text-gray-400">
                  Location already added or selected
                </div>
              )}
          </div>
        )}
      </div>

      {/* Clear all */}
      {safeSelectedLocations.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-1 text-xs text-purple-600 hover:underline"
        >
          Clear all
        </button>
      )}

      {/* Selected chips */}
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
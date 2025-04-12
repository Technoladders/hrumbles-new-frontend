import { useState } from "react";
import { Badge } from "@/components/jobs/ui/badge";
import { Button } from "@/components/jobs/ui/button";
import { X, ChevronDown } from "lucide-react";
import { INDIAN_CITIES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/jobs/ui/dropdown-menu";
 
interface LocationSelectorProps {
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
  placeholder?: string;
}
 
export default function LocationSelector({
  selectedLocations = [],
  onChange,
  placeholder = "Select locations..."
}: LocationSelectorProps) {
  const safeSelectedLocations = Array.isArray(selectedLocations) ? selectedLocations : [];
  const [isOpen, setIsOpen] = useState(false);
 
  const handleSelect = (location: string, checked: boolean) => {
    try {
      if (checked) {
        if (!safeSelectedLocations.includes(location)) {
          onChange([...safeSelectedLocations, location]);
        }
      } else {
        onChange(safeSelectedLocations.filter((loc) => loc !== location));
      }
    } catch (error) {
      console.error("Error selecting location:", error);
    }
  };
 
  const handleRemoveLocation = (locationLabel: string) => {
    try {
      onChange(safeSelectedLocations.filter((loc) => loc !== locationLabel));
    } catch (error) {
      console.error("Error removing location:", error);
    }
  };
 
  const handleClear = () => {
    onChange([]);
  };
 
  return (
    <div className="w-full">
      {/* Dropdown trigger and content */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="custom"
            className="w-full justify-between h-auto min-h-10 px-3 py-2"
          >
            <span className="text-muted-foreground">
              {safeSelectedLocations.length > 0
                ? `${safeSelectedLocations.length} location(s) selected`
                : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[300px] max-h-[300px] overflow-y-auto"
          align="start"
        >
          {INDIAN_CITIES.map((city) => (
            <DropdownMenuCheckboxItem
              key={city.value}
              checked={safeSelectedLocations.includes(city.label)}
              onCheckedChange={(checked) => handleSelect(city.label, checked)}
              onSelect={(event) => event.preventDefault()}// remove this to click the dropdown after every select
            >
              {city.label}
            </DropdownMenuCheckboxItem>
          ))}
          {safeSelectedLocations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sm mt-2"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              Clear selections
            </Button>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
 
      {/* Display selected locations below the dropdown with violet badges */}
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
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRemoveLocation(location)}
              >
                <X className="h-3 w-3 text-white hover:text-white " />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
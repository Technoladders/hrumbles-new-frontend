
import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiLocationSelectorProps {
  locations: string[];
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
}

const MultiLocationSelector = ({
  locations,
  selectedLocations,
  onChange,
}: MultiLocationSelectorProps) => {
  const [open, setOpen] = useState(false);

  const toggleLocation = (location: string) => {
    if (selectedLocations.includes(location)) {
      onChange(selectedLocations.filter((l) => l !== location));
    } else {
      onChange([...selectedLocations, location]);
    }
  };

  const removeLocation = (location: string) => {
    onChange(selectedLocations.filter((l) => l !== location));
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !selectedLocations.length && "text-muted-foreground"
            )}
          >
            {selectedLocations.length
              ? `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""} selected`
              : "Select locations"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
              />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search locations..." />
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {locations.map((location) => (
                <CommandItem
                  key={location}
                  value={location}
                  onSelect={() => {
                    toggleLocation(location);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedLocations.includes(location)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {location}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLocations.map((location) => (
            <div
              key={location}
              className="flex items-center rounded-md bg-secondary px-2 py-1 text-xs"
            >
              {location}
              <button
                type="button"
                className="ml-1 rounded-full outline-none"
                onClick={() => removeLocation(location)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiLocationSelector;

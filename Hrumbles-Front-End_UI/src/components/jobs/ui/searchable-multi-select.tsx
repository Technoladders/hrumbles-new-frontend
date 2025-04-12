
import React, { useState, useRef, useEffect } from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) => 
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Clear search query when closing the popover
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden">
              {selected.length <= 2 ? (
                selected.map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  return (
                    <Badge 
                      key={value} 
                      variant="secondary"
                      className="mr-1 mb-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(value);
                      }}
                    >
                      {option?.label || value}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  );
                })
              ) : (
                <span>{`${selected.length} items selected`}</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command ref={commandRef} onKeyDown={handleKeyDown}>
          <CommandInput 
            placeholder="Search..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          {filteredOptions.length === 0 && searchQuery ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : null}
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

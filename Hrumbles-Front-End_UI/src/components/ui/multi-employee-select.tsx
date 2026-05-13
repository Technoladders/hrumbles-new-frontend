// src/components/ui/multi-employee-select.tsx
import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface MultiEmployeeSelectProps {
  value?: string[];
  onChange: (ids: string[]) => void;
  employees: Employee[];
  placeholder?: string;
  disabled?: boolean;
}

export function MultiEmployeeSelect({
  value = [],
  onChange,
  employees,
  placeholder = "Select employees...",
  disabled = false,
}: MultiEmployeeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedEmployees = employees.filter((e) => value.includes(e.id));

  const filteredEmployees = employees.filter((emp) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (id: string) => {
    const newValue = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange(newValue);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal min-h-[2.5rem] h-8",
            open && "ring-2 ring-purple-200 border-purple-400"
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 py-1">
            {selectedEmployees.length > 0 ? (
              selectedEmployees.map((emp) => (
                <Badge
                  key={emp.id}
                  variant="secondary"
                  className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                >
                  {emp.first_name} {emp.last_name}
                  <button
                    onClick={(e) => handleRemove(e, emp.id)}
                    className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 border-purple-100 shadow-lg"
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-purple-100 px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-purple-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div
          className="max-h-[240px] overflow-y-auto"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {filteredEmployees.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No employee found for this client.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = value.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(emp.id);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-sm",
                    "hover:bg-purple-50 hover:text-purple-700",
                    isSelected && "bg-purple-100 text-purple-700 font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0 text-purple-600",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {emp.first_name} {emp.last_name}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selectedEmployees.length > 0 && (
          <div className="border-t border-purple-100 p-2">
            <p className="text-xs text-gray-500">
              {selectedEmployees.length} employee
              {selectedEmployees.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
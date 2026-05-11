// src/components/ui/employee-select.tsx
import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface EmployeeSelectProps {
  value?: string;
  onChange: (id: string) => void;
  employees: Employee[];
  placeholder?: string;
  disabled?: boolean;
}

export function EmployeeSelect({
  value,
  onChange,
  employees,
  placeholder = "Select employee...",
  disabled = false,
}: EmployeeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  
  const selectedEmployee = employees.find((e) => e.id === value);
  
  const filteredEmployees = employees.filter((emp) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            open && "ring-2 ring-purple-200 border-purple-400"
          )}
          disabled={disabled}
        >
          {selectedEmployee ? (
            <span className="truncate">
              {selectedEmployee.first_name} {selectedEmployee.last_name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {selectedEmployee && (
              <X 
                className="h-4 w-4 opacity-50 hover:opacity-100" 
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
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
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {filteredEmployees.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No employee found.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
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
                  value === emp.id && "bg-purple-100 text-purple-700 font-medium"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0 text-purple-600",
                    value === emp.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">
                  {emp.first_name} {emp.last_name}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
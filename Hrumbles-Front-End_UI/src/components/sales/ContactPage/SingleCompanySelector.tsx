import { useState } from "react";
import { Check } from "lucide-react";
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

interface CompanyOption {
  id: number;
  name: string;
}

interface SingleCompanySelectorProps {
  companies: CompanyOption[];
  selectedCompanyId: number | undefined | null;
  onChange: (companyId: number | undefined) => void;
  disabled?: boolean;
}

const SingleCompanySelector = ({
  companies,
  selectedCompanyId,
  onChange,
  disabled = false,
}: SingleCompanySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(""); // Track search input

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);

  const handleSelect = (companyId: string) => {
    const id = companyId === "" ? undefined : Number(companyId);
    onChange(id);
    setOpen(false);
    setSearch(""); // Reset search on selection
  };

  // Filter companies based on search input (case-insensitive, partial match)
  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  // Debugging: Log search and filtered results
  console.log("Search term:", search);
  console.log("Filtered companies:", filteredCompanies);

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !selectedCompanyId && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            {selectedCompany ? selectedCompany.name : "Select company"}
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
          <Command
            filter={(value, search) => {
              const company = companies.find((c) => String(c.id) === value);
              if (!company) return 0;
              return company.name.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search companies..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandEmpty>No company found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              <CommandItem
                value=""
                onSelect={() => handleSelect("")}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedCompanyId ? "opacity-100" : "opacity-0"
                  )}
                />
                None
              </CommandItem>
              {filteredCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={String(company.id)}
                  onSelect={() => handleSelect(String(company.id))}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCompanyId === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {company.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SingleCompanySelector;
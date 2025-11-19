import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';

type Option = Record<'value' | 'label', string>;

interface LeaveMultiSelectProps {
  id: string;
  options: Option[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
}

export function LeaveMultiSelect({ id, options, selected, onChange, placeholder = 'Select...' }: LeaveMultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleSelect = (value: string) => {
    // The onChange logic is safe because it uses the previous state
    onChange((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    setInputValue('');
  };

  const handleRemove = (value: string) => {
    onChange((prev) => prev.filter((v) => v !== value));
  };

  // --- THE FIX IS ON THIS LINE ---
  // If `selected` is undefined, use an empty array `[]` as a fallback.
  const selectedOptions = options.filter((option) => (selected || []).includes(option.value));

  return (
    <Command onKeyDown={(e) => { if (e.key === 'Escape') inputRef.current?.blur(); }}>
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {selectedOptions.map(({ value, label }) => (
            <Badge key={value} variant="secondary">
              {label}
              <button className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" onClick={() => handleRemove(value)}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && options.length > 0 ? (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {options.map((option) => (
                <CommandItem key={option.value} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onSelect={() => handleSelect(option.value)}>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
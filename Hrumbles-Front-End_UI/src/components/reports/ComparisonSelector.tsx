
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ComparisonSelectorProps {
  type: 'status' | 'employee';
  items: Array<{ id: string; name: string }>;
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({
  type,
  items,
  value,
  onChange,
  label,
}) => {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={`Select ${type}`} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
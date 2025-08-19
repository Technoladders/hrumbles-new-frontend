import React, { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { fetchAllStatuses, MainStatus, SubStatus } from '@/services/statusService';
import { toast } from 'sonner';
// REMOVED: isTerminalStatus is no longer needed here as all statuses are unlocked.

interface StatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ItechStatusSelector: React.FC<StatusSelectorProps> = ({ 
  value, 
  onChange,
  className,
}) => {
  const [statuses, setStatuses] = useState<MainStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubStatus, setSelectedSubStatus] = useState<SubStatus | null>(null);
  const [selectedMainStatus, setSelectedMainStatus] = useState<MainStatus | null>(null);

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllStatuses();
        const pipelineOrder = ['Level', 'Interviews', 'Offer']; // iTech specific order
        const sortedData = [...data].sort((a, b) => {
          const aIndex = pipelineOrder.indexOf(a.name);
          const bIndex = pipelineOrder.indexOf(b.name);
          return aIndex - bIndex;
        });
        
        setStatuses(sortedData);
        
        if (value) {
          for (const main of sortedData) {
            const sub = main.subStatuses?.find(s => s.id === value);
            if (sub) {
              setSelectedSubStatus(sub);
              setSelectedMainStatus(main);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error loading statuses:', error);
        toast.error('Failed to load statuses');
      } finally {
        setLoading(false);
      }
    };
    loadStatuses();
  }, [value]);

  // CHANGED: This function now updates the component's internal state immediately
  // This solves the UI not reflecting the change until a refresh.
  const handleStatusChange = (newValue: string) => {
    for (const main of statuses) {
      if (main.subStatuses) {
        const sub = main.subStatuses.find(s => s.id === newValue);
        if (sub) {
          setSelectedSubStatus(sub);
          setSelectedMainStatus(main);
          break;
        }
      }
    }
    onChange(newValue);
  };

  // CHANGED: This function is simplified to show ALL statuses without any rules.
  // This "unlocks" the dropdown as requested.
  const getFilteredSubStatuses = (mainStatus: MainStatus): SubStatus[] => {
    return mainStatus.subStatuses || [];
  };

  const getStatusStyle = () => {
    if (selectedSubStatus?.color) return { backgroundColor: `${selectedSubStatus.color}20`, borderColor: selectedSubStatus.color, color: selectedSubStatus.color };
    if (selectedMainStatus?.color) return { backgroundColor: `${selectedMainStatus.color}20`, borderColor: selectedMainStatus.color, color: selectedMainStatus.color };
    return {};
  };

  if (loading) {
    return <div className="h-9 bg-gray-100 rounded-md animate-pulse"></div>;
  }

  // The rest of the return statement is the same, but is included for completeness.
  return (
    <Select value={value} onValueChange={handleStatusChange}>
      <SelectTrigger className={`${className} text-left`} style={getStatusStyle()}>
        <SelectValue>{selectedSubStatus?.name || "Select status"}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 overflow-y-auto">
        {statuses.map((mainStatus) => {
          const filteredSubStatuses = getFilteredSubStatuses(mainStatus);
          if (filteredSubStatuses.length === 0) return null;
          
          return (
            <SelectGroup key={mainStatus.id}>
              <SelectLabel 
                className="flex items-center gap-2 py-1.5"
                style={{ color: mainStatus.color || undefined }}
              >
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: mainStatus.color || '#777777' }}
                />
                {mainStatus.name}
              </SelectLabel>
              {filteredSubStatuses.map((subStatus) => (
                <SelectItem key={subStatus.id} value={subStatus.id} className="pl-7">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-sm" 
                      style={{ backgroundColor: subStatus.color || mainStatus.color || '#777777' }}
                    />
                    <span>{subStatus.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
};
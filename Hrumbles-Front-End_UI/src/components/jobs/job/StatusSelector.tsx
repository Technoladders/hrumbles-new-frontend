
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

interface StatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disableNextStage?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({ 
  value, 
  onChange,
  className,
  disableNextStage = false
}) => {
  const [statuses, setStatuses] = useState<MainStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubStatus, setSelectedSubStatus] = useState<SubStatus | null>(null);
  const [selectedMainStatus, setSelectedMainStatus] = useState<MainStatus | null>(null);

  // Load all statuses on mount
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllStatuses();
        // Ensure we have our 5-stage pipeline loaded and sorted correctly
        const pipelineOrder = ['New', 'Processed', 'Interview', 'Offered', 'Joined'];
        const sortedData = [...data].sort((a, b) => {
          const aIndex = pipelineOrder.indexOf(a.name);
          const bIndex = pipelineOrder.indexOf(b.name);
          return aIndex - bIndex;
        });
        
        setStatuses(sortedData);
        
        // Find the current selected status
        if (value) {
          let found = false;
          for (const main of sortedData) {
            if (main.subStatuses && main.subStatuses.length > 0) {
              const sub = main.subStatuses.find(s => s.id === value);
              if (sub) {
                setSelectedSubStatus(sub);
                setSelectedMainStatus(main);
                found = true;
                break;
              }
            }
          }
          
          if (!found && value) {
            console.warn(`Status with ID ${value} not found`);
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

  const handleStatusChange = (newValue: string) => {
    // Find the selected sub-status and its main parent status
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

  // Function to filter sub-statuses based on the strict job status flow requirements
  const getFilteredSubStatuses = (mainStatus: MainStatus) => {
    if (!mainStatus.subStatuses || mainStatus.subStatuses.length === 0) return [];
  
    // If no selection yet, only show New option as the entry point
    if (!selectedMainStatus) {
      return mainStatus.name === 'New' ? mainStatus.subStatuses : [];
    }
  
    // If current status includes "Reject", don't allow further changes
    if (selectedSubStatus?.name.includes('Reject')) {
      return [];
    }
  
    const pipelineOrder = ['New', 'Processed', 'Interview', 'Offered', 'Joined'];
    const currentMainStatusIndex = pipelineOrder.indexOf(selectedMainStatus?.name || '');
    const targetMainStatusIndex = pipelineOrder.indexOf(mainStatus.name);
  
    // New -> Processed (Internal)
    if (selectedMainStatus.name === 'New' && mainStatus.name === 'Processed') {
      return mainStatus.subStatuses.filter(s => s.name === 'Process (Internal)');
    }
  
    // Process (Internal) -> Process (Client), Duplicate (Internal), or Reject
    if (selectedSubStatus?.name === 'Process (Internal)' && mainStatus.name === 'Processed') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'Process (Client)' || 
        s.name === 'Duplicate (Internal)' || 
        s.name === 'Internal Reject' // Explicitly specify allowed reject
      );
    }
  
    // Process (Client) -> Duplicate (Client), Reject, or Interview Technical Assessment
    if (selectedSubStatus?.name === 'Process (Client)') {
      if (mainStatus.name === 'Processed') {
        return mainStatus.subStatuses.filter(s => 
          s.name === 'Duplicate (Client)' || 
          s.name === 'Client Reject' // Explicitly specify allowed reject
        );
      }
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => s.name === 'Technical Assessment');
      }
    }
  
    // Technical Assessment -> Reschedule, Selected, Rejected
    if (selectedSubStatus?.name === 'Technical Assessment' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'Reschedule Interview' ||
        s.name === 'Technical Assessment Selected' || 
        s.name === 'Technical Assessment Rejected'
      );
    }
  
    // Continue with the rest of your flow...
    if (selectedSubStatus?.name === 'Technical Assessment Selected' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => s.name === 'L1');
    }
  
    if (selectedSubStatus?.name === 'L1' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'L1 Selected' || 
        s.name === 'L1 Rejected'
      );
    }
  
    if (selectedSubStatus?.name === 'L1 Selected' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => s.name === 'L2');
    }
  
    if (selectedSubStatus?.name === 'L2' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'L2 Selected' || 
        s.name === 'L2 Rejected'
      );
    }
  
    if (selectedSubStatus?.name === 'L2 Selected' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => s.name === 'L3');
    }
  
    if (selectedSubStatus?.name === 'L3' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'L3 Selected' || 
        s.name === 'L3 Rejected'
      );
    }
  
    if (selectedSubStatus?.name === 'L3 Selected' && mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => s.name === 'End Client Round');
    }
  
    if (selectedSubStatus?.name === 'End Client Round' && mainStatus.name === 'Offered') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'Offer Issued' || 
        s.name === 'On Hold'
      );
    }
  
    if (selectedSubStatus?.name === 'Offer Issued' && mainStatus.name === 'Joined') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'Joined' || 
        s.name === 'No Show'
      );
    }
  
    // Default: no skipping stages or invalid transitions
    return [];
  };

  const getStatusStyle = () => {
    if (selectedSubStatus?.color) {
      return {
        backgroundColor: `${selectedSubStatus.color}20`, // 20% opacity
        borderColor: selectedSubStatus.color,
        color: selectedSubStatus.color
      };
    }
    
    if (selectedMainStatus?.color) {
      return {
        backgroundColor: `${selectedMainStatus.color}20`, // 20% opacity
        borderColor: selectedMainStatus.color,
        color: selectedMainStatus.color
      };
    }
    
    return {};
  };

  if (loading) {
    return (
      <div className="h-9 bg-gray-100 rounded-md animate-pulse"></div>
    );
  }

  return (
    <Select value={value} onValueChange={handleStatusChange}>
    <SelectTrigger 
      className={`${className} w-48`} 
      style={getStatusStyle()}
    >
      {/* Display the current main status and sub-status */}
      <SelectValue>
        {selectedMainStatus && selectedSubStatus 
          ? `${selectedMainStatus.name}: ${selectedSubStatus.name}`
          : "Select status"}
      </SelectValue>
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
              {/* Display current sub-status if it belongs to this main status */}
              {mainStatus.name}
              {selectedMainStatus?.id === mainStatus.id && selectedSubStatus && (
                <span className="ml-2 text-sm opacity-75">
                  ({selectedSubStatus.name})
                </span>
              )}
            </SelectLabel>
            
            {filteredSubStatuses.map((subStatus) => (
              <SelectItem 
                key={subStatus.id} 
                value={subStatus.id}
                className="pl-7"
              >
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

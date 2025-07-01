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
  
    // If current status includes "Reject" or "Offer Declined", don't allow further changes
    if (selectedSubStatus?.name.includes('Reject') || selectedSubStatus?.name === 'Offer Declined') {
      return [];
    }
  
    const pipelineOrder = ['New', 'Processed', 'Interview', 'Offered', 'Joined'];
    const currentMainStatusIndex = pipelineOrder.indexOf(selectedMainStatus?.name || '');
    const targetMainStatusIndex = pipelineOrder.indexOf(mainStatus.name);
  
    // New -> Processed (Internal)
    if (selectedMainStatus.name === 'New' && mainStatus.name === 'Processed') {
      return mainStatus.subStatuses.filter(s => s.name === 'Processed (Internal)');
    }
  
    // Processed (Internal) or Internal Hold or Candidate on hold -> Processed (Client), Duplicate (Internal), Internal Reject, Internal Hold
    if ((selectedSubStatus?.name === 'Processed (Internal)' || 
         selectedSubStatus?.name === 'Internal Hold' || 
         selectedSubStatus?.name === 'Candidate on hold') && 
        mainStatus.name === 'Processed') {
      return mainStatus.subStatuses.filter(s => 
        s.name === 'Processed (Client)' || 
        s.name === 'Duplicate (Internal)' || 
        s.name === 'Internal Reject' ||
        s.name === 'Internal Hold'
      );
    }
  
    // Processed (Client) or Client Hold or Candidate on hold -> Duplicate (Client), Client Reject, Client Hold, or all Interview statuses
    if (selectedSubStatus?.name === 'Processed (Client)' || 
        selectedSubStatus?.name === 'Client Hold' || 
        selectedSubStatus?.name === 'Candidate on hold') {
      if (mainStatus.name === 'Processed') {
        return mainStatus.subStatuses.filter(s => 
          s.name === 'Duplicate (Client)' || 
          s.name === 'Client Reject' ||
          s.name === 'Client Hold'
        );
      }
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => [
          'Technical Assessment',
          'L1',
          'L2',
          'L3',
          'End Client Round',
        ].includes(s.name));
      }
    }
  
    // Technical Assessment or Technical Hold or Reschedule Technical Assessment -> Technical Assessment, Reschedule Technical Assessment, Selected, Rejected, Technical Hold, or all Interview statuses
    if ((selectedSubStatus?.name === 'Technical Assessment' || 
         selectedSubStatus?.name === 'Technical Hold' || 
         selectedSubStatus?.name === 'Reschedule Technical Assessment') && 
        mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => [
        'Technical Assessment',
        'Reschedule Technical Assessment',
        'Technical Assessment Selected',
        'Technical Assessment Rejected',
        'Technical Hold',
        'L1',
        'L2',
        'L3',
        'End Client Round',
      ].includes(s.name));
    }
  
    // Technical Assessment Selected -> L1 or all Interview statuses, or all Offered statuses
    if (selectedSubStatus?.name === 'Technical Assessment Selected') {
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => [
          'L1',
          'L2',
          'L3',
          'End Client Round',
        ].includes(s.name));
      }
      if (mainStatus.name === 'Offered') {
        return mainStatus.subStatuses.filter(s => [
          'Offer Issued',
          'Offer On Hold',
          'Offer Declined'
        ].includes(s.name));
      }
    }
  
    // L1 or L1 Hold or Reschedule L1 -> L1, L1 Selected, L1 Rejected, L1 Hold, Reschedule L1
    if ((selectedSubStatus?.name === 'L1' || 
         selectedSubStatus?.name === 'L1 Hold' || 
         selectedSubStatus?.name === 'Reschedule L1') && 
        mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => [
        'L1',
        'L1 Selected',
        'L1 Rejected',
        'L1 Hold',
        'Reschedule L1',
      ].includes(s.name));
    }
  
    // L1 Selected -> L2 or all Interview statuses except Technical Assessment, or all Offered statuses
    if (selectedSubStatus?.name === 'L1 Selected') {
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => [
          'L2',
          'L3',
          'End Client Round',
        ].includes(s.name));
      }
      if (mainStatus.name === 'Offered') {
        return mainStatus.subStatuses.filter(s => [
          'Offer Issued',
          'Offer On Hold',
          'Offer Declined'
        ].includes(s.name));
      }
    }
  
    // L2 or L2 Hold or Reschedule L2 -> L2, L2 Selected, L2 Rejected, L2 Hold, Reschedule L2
    if ((selectedSubStatus?.name === 'L2' || 
         selectedSubStatus?.name === 'L2 Hold' || 
         selectedSubStatus?.name === 'Reschedule L2') && 
        mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => [
        'L2',
        'L2 Selected',
        'L2 Rejected',
        'L2 Hold',
        'Reschedule L2',
      ].includes(s.name));
    }
  
    // L2 Selected -> L3 or all Interview statuses except Technical Assessment, L1, or all Offered statuses
    if (selectedSubStatus?.name === 'L2 Selected') {
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => [
          'L3',
          'End Client Round',
        ].includes(s.name));
      }
      if (mainStatus.name === 'Offered') {
        return mainStatus.subStatuses.filter(s => [
          'Offer Issued',
          'Offer On Hold',
          'Offer Declined'
        ].includes(s.name));
      }
    }
  
    // L3 or L3 Hold or Reschedule L3 -> L3, L3 Selected, L3 Rejected, L3 Hold, Reschedule L3
    if ((selectedSubStatus?.name === 'L3' || 
         selectedSubStatus?.name === 'L3 Hold' || 
         selectedSubStatus?.name === 'Reschedule L3') && 
        mainStatus.name === 'Interview') {
      return mainStatus.subStatuses.filter(s => [
        'L3',
        'L3 Selected',
        'L3 Rejected',
        'L3 Hold',
        'Reschedule L3',
      ].includes(s.name));
    }
  
    // L3 Selected -> End Client Round, or all Offered statuses
    if (selectedSubStatus?.name === 'L3 Selected') {
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => [
          'End Client Round',
        ].includes(s.name));
      }
      if (mainStatus.name === 'Offered') {
        return mainStatus.subStatuses.filter(s => [
          'Offer Issued',
          'Offer On Hold',
          'Offer Declined'
        ].includes(s.name));
      }
    }
  
    // End Client Round or End Client Hold or Reschedule End Client Round -> End Client Round, End Client Selected, End Client Rejected, End Client Hold, Reschedule End Client Round, or all Offered statuses
    if (selectedSubStatus?.name === 'End Client Round' || 
        selectedSubStatus?.name === 'End Client Hold' || 
        selectedSubStatus?.name === 'Reschedule End Client Round') {
      if (mainStatus.name === 'Interview') {
        return mainStatus.subStatuses.filter(s => [
          'End Client Round',
          'End Client Selected',
          'End Client Rejected',
          'End Client Hold',
          'Reschedule End Client Round'
        ].includes(s.name));
      }
      if (mainStatus.name === 'Offered') {
        return mainStatus.subStatuses.filter(s => [
          'Offer Issued',
          'Offer On Hold',
          'Offer Declined'
        ].includes(s.name));
      }
    }
  
    // End Client Selected -> all Offered statuses
    if (selectedSubStatus?.name === 'End Client Selected' && mainStatus.name === 'Offered') {
      return mainStatus.subStatuses.filter(s => [
        'Offer Issued',
        'Offer On Hold',
        'Offer Declined'
      ].includes(s.name));
    }
  
    // Offer Issued -> Joined, No Show
    if (selectedSubStatus?.name === 'Offer Issued' && mainStatus.name === 'Joined') {
      return mainStatus.subStatuses.filter(s => [
        'Joined',
        'No Show'
      ].includes(s.name));
    }
  
    // Offer On Hold -> Offer Issued
    if (selectedSubStatus?.name === 'Offer On Hold' && mainStatus.name === 'Offered') {
      return mainStatus.subStatuses.filter(s => s.name === 'Offer Issued');
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
        className={`${className} text-left`} 
        style={getStatusStyle()}
      >
        {/* Display the current main status and sub-status */}
        <SelectValue>
          {selectedMainStatus && selectedSubStatus 
            ? `${selectedSubStatus.name}`
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
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
import { isTerminalStatus } from '@/utils/statusTransitionHelper'; // Import the helper

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

  // Load all statuses on mount (No changes here)
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllStatuses();
        const pipelineOrder = ['New', 'Processed', 'Interview', 'Offered', 'Joined'];
        const sortedData = [...data].sort((a, b) => {
          const aIndex = pipelineOrder.indexOf(a.name);
          const bIndex = pipelineOrder.indexOf(b.name);
          return aIndex - bIndex;
        });
        
        setStatuses(sortedData);
        
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
          if (!found) console.warn(`Status with ID ${value} not found`);
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

  const handleStatusChange = (newValue: string) => { // (No changes here)
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

  // *** MODIFIED LOGIC STARTS HERE ***

  const getFilteredSubStatuses = (mainStatus: MainStatus): SubStatus[] => {
    if (!mainStatus.subStatuses || mainStatus.subStatuses.length === 0) return [];
    if (!selectedMainStatus || !selectedSubStatus) {
      return mainStatus.name === 'New' ? mainStatus.subStatuses : [];
    }
  
    // Use the helper to check for any terminal status
    if (isTerminalStatus(selectedSubStatus.name)) {
      return [];
    }
  
    let baseOptions: SubStatus[] = [];
  
    // --- Start of Your Original Logic (modified to populate baseOptions) ---
    if (selectedMainStatus.name === 'New Applicants' && mainStatus.name === 'Processed') {
      baseOptions = mainStatus.subStatuses.filter(s => s.name === 'Processed (Internal)');
    } else if ((selectedSubStatus.name === 'Processed (Internal)' || selectedSubStatus.name === 'Internal Hold' || selectedSubStatus.name === 'Candidate on hold') && mainStatus.name === 'Processed') {
      baseOptions = mainStatus.subStatuses.filter(s => ['Processed (Client)', 'Duplicate (Internal)', 'Internal Reject', 'Internal Hold'].includes(s.name));
    } else if (selectedSubStatus.name === 'Processed (Client)' || selectedSubStatus.name === 'Client Hold' || selectedSubStatus.name === 'Candidate on hold') {
      if (mainStatus.name === 'Processed') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Duplicate (Client)', 'Client Reject', 'Client Hold'].includes(s.name));
      } else if (mainStatus.name === 'Interview') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Technical Assessment', 'L1', 'L2', 'L3', 'End Client Round'].includes(s.name));
      }
    } else if ((selectedSubStatus.name === 'Technical Assessment' || selectedSubStatus.name === 'Technical Hold' || selectedSubStatus.name === 'Reschedule Technical Assessment') && mainStatus.name === 'Interview') {
      baseOptions = mainStatus.subStatuses.filter(s => ['Technical Assessment', 'Reschedule Technical Assessment', 'Technical Assessment Selected', 'Technical Assessment Rejected', 'Technical Hold', 'L1', 'L2', 'L3', 'End Client Round'].includes(s.name));
    } else if (selectedSubStatus.name === 'Technical Assessment Selected') {
      if (mainStatus.name === 'Interview') {
        baseOptions = mainStatus.subStatuses.filter(s => ['L1', 'L2', 'L3', 'End Client Round'].includes(s.name));
      } else if (mainStatus.name === 'Offered') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Offer Issued', 'Offer On Hold', 'Offer Declined'].includes(s.name));
      }
    } else if ((selectedSubStatus.name === 'L1' || selectedSubStatus.name === 'L1 Hold' || selectedSubStatus.name === 'Reschedule L1') && mainStatus.name === 'Interview') {
      baseOptions = mainStatus.subStatuses.filter(s => ['L1', 'L1 Selected', 'L1 Rejected', 'L1 Hold', 'Reschedule L1'].includes(s.name));
    } else if (selectedSubStatus.name === 'L1 Selected') {
      if (mainStatus.name === 'Interview') {
        baseOptions = mainStatus.subStatuses.filter(s => ['L2', 'L3', 'End Client Round'].includes(s.name));
      } else if (mainStatus.name === 'Offered') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Offer Issued', 'Offer On Hold', 'Offer Declined'].includes(s.name));
      }
    } else if ((selectedSubStatus.name === 'L2' || selectedSubStatus.name === 'L2 Hold' || selectedSubStatus.name === 'Reschedule L2') && mainStatus.name === 'Interview') {
      baseOptions = mainStatus.subStatuses.filter(s => ['L2', 'L2 Selected', 'L2 Rejected', 'L2 Hold', 'Reschedule L2'].includes(s.name));
    } else if (selectedSubStatus.name === 'L2 Selected') {
      if (mainStatus.name === 'Interview') {
        baseOptions = mainStatus.subStatuses.filter(s => ['L3', 'End Client Round'].includes(s.name));
      } else if (mainStatus.name === 'Offered') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Offer Issued', 'Offer On Hold', 'Offer Declined'].includes(s.name));
      }
    } else if ((selectedSubStatus.name === 'L3' || selectedSubStatus.name === 'L3 Hold' || selectedSubStatus.name === 'Reschedule L3') && mainStatus.name === 'Interview') {
      baseOptions = mainStatus.subStatuses.filter(s => ['L3', 'L3 Selected', 'L3 Rejected', 'L3 Hold', 'Reschedule L3'].includes(s.name));
    } else if (selectedSubStatus.name === 'L3 Selected') {
      if (mainStatus.name === 'Interview') {
        baseOptions = mainStatus.subStatuses.filter(s => ['End Client Round'].includes(s.name));
      } else if (mainStatus.name === 'Offered') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Offer Issued', 'Offer On Hold', 'Offer Declined'].includes(s.name));
      }
    } else if ((selectedSubStatus.name === 'End Client Round' || selectedSubStatus.name === 'End Client Hold' || selectedSubStatus.name === 'Reschedule End Client Round') && (mainStatus.name === 'Interview' || mainStatus.name === 'Offered')) {
      if (mainStatus.name === 'Interview') {
        baseOptions = mainStatus.subStatuses.filter(s => ['End Client Round', 'End Client Selected', 'End Client Rejected', 'End Client Hold', 'Reschedule End Client Round'].includes(s.name));
      } else if (mainStatus.name === 'Offered') {
        baseOptions = mainStatus.subStatuses.filter(s => ['Offer Issued', 'Offer On Hold', 'Offer Declined'].includes(s.name));
      }
    } else if (selectedSubStatus.name === 'End Client Selected' && mainStatus.name === 'Offered') {
      baseOptions = mainStatus.subStatuses.filter(s => ['Offer Issued', 'Offer On Hold', 'Offer Declined'].includes(s.name));
    } else if (selectedSubStatus.name === 'Offer Issued' && mainStatus.name === 'Joined') {
      baseOptions = mainStatus.subStatuses.filter(s => ['Joined', 'No Show'].includes(s.name));
    } else if (selectedSubStatus.name === 'Offer On Hold' && mainStatus.name === 'Offered') {
      baseOptions = mainStatus.subStatuses.filter(s => s.name === 'Offer Issued');
    }
    // --- End of Your Original Logic ---
  
    // --- Augmentation Step: Add "No Show" and "Dropped" statuses ---
    let finalOptions = [...baseOptions];
    const allSubStatuses = statuses.flatMap(ms => ms.subStatuses || []);
  
    // 1. Add "No Show" status if we are in a relevant interview step
    if (mainStatus.name === 'Interview') {
      const interviewMap: { [key: string]: string } = {
        'Technical Assessment': 'Technical Assessment No Show',
        'L1': 'L1 No Show',
        'L2': 'L2 No Show',
        'L3': 'L3 No Show',
        'End Client Round': 'End Client Round No Show',
      };
      // Find which interview step we are currently in
      const currentInterviewStepName = Object.keys(interviewMap).find(step => selectedSubStatus.name.includes(step));
      if (currentInterviewStepName) {
        const noShowStatusName = interviewMap[currentInterviewStepName];
        const noShowStatus = allSubStatuses.find(s => s.name === noShowStatusName);
        if (noShowStatus && !finalOptions.some(opt => opt.id === noShowStatus.id)) {
            finalOptions.push(noShowStatus);
        }
      }
    }
  
    // 2. *** MODIFIED LOGIC HERE ***
    // Add "Candidate Dropped" status only to the CURRENT main status group
    const droppedStatus = allSubStatuses.find(s => s.name === 'Candidate Dropped');
    
    // This condition checks:
    // a) "Candidate Dropped" status exists.
    // b) The main status group we are currently rendering (`mainStatus`) is the same as the candidate's current main status (`selectedMainStatus`).
    // c) The candidate's current main status is one where dropping is a valid action.
    if (
        droppedStatus &&
        mainStatus.id === selectedMainStatus.id && 
        ['Processed', 'Interview', 'Offered', 'Joined'].includes(selectedMainStatus.name)
    ) {
        if (!finalOptions.some(opt => opt.id === droppedStatus.id)) {
            finalOptions.push(droppedStatus);
        }
    }
  
    return finalOptions;
  };
  
  // *** MODIFIED LOGIC ENDS HERE ***

  const getStatusStyle = () => { // (No changes here)
    if (selectedSubStatus?.color) {
      return {
        backgroundColor: `${selectedSubStatus.color}20`,
        borderColor: selectedSubStatus.color,
        color: selectedSubStatus.color
      };
    }
    if (selectedMainStatus?.color) {
      return {
        backgroundColor: `${selectedMainStatus.color}20`,
        borderColor: selectedMainStatus.color,
        color: selectedMainStatus.color
      };
    }
    return {};
  };

  if (loading) { // (No changes here)
    return (
      <div className="h-9 bg-gray-100 rounded-md animate-pulse"></div>
    );
  }

  return ( // (No changes here)
    <Select value={value} onValueChange={handleStatusChange}>
      <SelectTrigger 
        className={`${className} text-left`} 
        style={getStatusStyle()}
      >
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
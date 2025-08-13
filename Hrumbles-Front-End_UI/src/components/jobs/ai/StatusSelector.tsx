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

const isTerminalStatus = (statusName: string): boolean => {
  const terminalBGVStatuses = [
    'All Checks Clear',
    'Minor Discrepancy',
    'Major Discrepancy',
    'Verification Not Required',
    'Candidate Withdrawn'
  ];
  return terminalBGVStatuses.includes(statusName);
};

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

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllStatuses();
        const pipelineOrder = ['Initiated', 'In Progress', 'On Hold', 'Completed', 'Closed'];
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

  const getFilteredSubStatuses = (mainStatus: MainStatus): SubStatus[] => {
    if (!mainStatus.subStatuses || mainStatus.subStatuses.length === 0) return [];
    if (!selectedMainStatus || !selectedSubStatus) {
      return mainStatus.name === 'Initiated' ? mainStatus.subStatuses : [];
    }
  
    if (isTerminalStatus(selectedSubStatus.name)) {
      return [];
    }
  
    let baseOptions: SubStatus[] = [];
  
    // BGV workflow transitions
    if (selectedMainStatus.name === 'Initiated') {
      if (mainStatus.name === 'Initiated') {
        baseOptions = mainStatus.subStatuses;
      } else if (mainStatus.name === 'In Progress') {
        baseOptions = mainStatus.subStatuses.filter(s => s.name === 'Verification Started');
      }
    } else if (selectedMainStatus.name === 'In Progress') {
      if (mainStatus.name === 'In Progress') {
        baseOptions = mainStatus.subStatuses.filter(s => {
          const verificationSteps = [
            'Verification Started',
            'Address Verification',
            'Education Verification',
            'Employment Verification',
            'Criminal Record Verification',
            'Reference Check'
          ];
          const currentIndex = verificationSteps.indexOf(selectedSubStatus.name);
          return verificationSteps.slice(currentIndex).includes(s.name);
        });
      } else if (mainStatus.name === 'On Hold') {
        baseOptions = mainStatus.subStatuses;
      } else if (mainStatus.name === 'Completed' && selectedSubStatus.name === 'Reference Check') {
        baseOptions = mainStatus.subStatuses;
      }
    } else if (selectedMainStatus.name === 'On Hold' && mainStatus.name === 'In Progress') {
      baseOptions = mainStatus.subStatuses;
    } else if (selectedMainStatus.name === 'Completed' && mainStatus.name === 'Closed') {
      baseOptions = mainStatus.subStatuses;
    }

    return baseOptions;
  };

  const getStatusStyle = () => {
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
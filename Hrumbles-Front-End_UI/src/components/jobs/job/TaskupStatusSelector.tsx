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
}

// This is a map defining the entire workflow graph for Taskup.
const workflowMap: Record<string, string[]> = {
  // Initial Stages
  'New Applicants': ['Duplicate Applicants', 'Rejected by CHRO', 'Forwarded by CHRO'],
  'Forwarded by CHRO': ['Submitted to Client'],
  
  // Post-Submission & Interview Stages (Unlocking multiple options)
  'Submitted to Client': ['Candidate No-Show', 'Telephonic Interview', 'Face-to-Face Interview', 'Virtual Interview', 'CV Rejected by Client'],
  'Telephonic Interview': ['Rejected by Client', 'Candidate Withdrew', 'Face-to-Face Interview', 'Virtual Interview'],
  'Face-to-Face Interview': ['Level 1 Interview (L1)', 'Level 2 Interview (L2)', 'Level 3 – Management Round', 'Rejected by Client', 'Candidate Withdrew'],
  'Virtual Interview': ['Level 1 Interview (L1)', 'Level 2 Interview (L2)', 'Level 3 – Management Round', 'Rejected by Client', 'Candidate Withdrew'],

  // Interview Levels
  'Level 1 Interview (L1)': ['Level 2 Interview (L2)', 'Level 3 – Management Round', 'Rejected by Client', 'Candidate Withdrew'],
  'Level 2 Interview (L2)': ['Level 3 – Management Round', 'Rejected by Client', 'Candidate Withdrew'],
  'Level 3 – Management Round': ['Company’s Hiring Decision', 'Candidate’s Decision'],

  // Decision Paths
  'Company’s Hiring Decision': ['Shortlisted for Next Steps', 'Training Scheduled', 'Offer Released', 'Offer Declined by Candidate', 'Candidate’s Decision'],
  'Candidate’s Decision': ['Not Interested', 'Interested & Proceeding'],
  
  // Offer and Post-Offer Flow
  'Shortlisted for Next Steps': ['Offer Released', 'Training Scheduled'],
  'Training Scheduled': ['Offer Released'],
  'Interested & Proceeding': ['Offer Released'],
  'Offer Released': ['Joined', 'Offer Declined by Candidate'], // <-- Leads to the new 'Joined' status

  // Joined Flow
  'Joined': ['Completed 1 Month', 'Did Not Complete 1 Month'],

  // Billing Flow
  'Completed 1 Month': ['Billing Completed', 'Billing Pending'],

  // Terminal/End States (empty array means no further steps)
  'Duplicate Applicants': [],
  'Rejected by CHRO': ['Fresher – Not Eligible', 'CV Not Suitable', 'Potential Fit for Other Role'], // This is a branch, not terminal
  'Fresher – Not Eligible': [],
  'CV Not Suitable': [],
  'Potential Fit for Other Role': [],
  'Candidate No-Show': [],
  'Rejected by Client': [],
  'CV Rejected by Client': [],
  'Candidate Withdrew': [],
  'Offer Declined by Candidate': [],
  'Not Interested': [],
  'Did Not Complete 1 Month': [],
  'Billing Completed': [],
  'Billing Pending': [],
};


export const TaskupStatusSelector: React.FC<StatusSelectorProps> = ({ value, onChange, className }) => {
  const [statuses, setStatuses] = useState<MainStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubStatus, setSelectedSubStatus] = useState<SubStatus | null>(null);
  const [selectedMainStatus, setSelectedMainStatus] = useState<MainStatus | null>(null);

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllStatuses();
        setStatuses(data);

        if (value) {
          for (const main of data) {
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

  const getFilteredStatuses = () => {
    if (!selectedSubStatus) return statuses; // Show all if no status is set

    const allowedNextStatusNames = workflowMap[selectedSubStatus.name] || [];
    if (allowedNextStatusNames.length === 0) return []; // Terminal state

    const filteredStatuses: MainStatus[] = [];

    statuses.forEach(main => {
      const availableSubStatuses = main.subStatuses?.filter(sub =>
        allowedNextStatusNames.includes(sub.name)
      );
      if (availableSubStatuses && availableSubStatuses.length > 0) {
        filteredStatuses.push({ ...main, subStatuses: availableSubStatuses });
      }
    });

    return filteredStatuses;
  };

  const getStatusStyle = () => {
    const color = selectedSubStatus?.color || selectedMainStatus?.color || '#777777';
    return {
      backgroundColor: `${color}20`,
      borderColor: color,
      color: color
    };
  };

  if (loading) {
    return <div className="h-9 bg-gray-100 rounded-md animate-pulse"></div>;
  }

  const filtered = getFilteredStatuses();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} style={getStatusStyle()}>
        <SelectValue>
          {selectedSubStatus?.name || "Select status"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filtered.length === 0 && selectedSubStatus && (
            <div className="p-2 text-sm text-gray-500">No further steps from "{selectedSubStatus.name}".</div>
        )}
        {filtered.map((mainStatus) => (
          <SelectGroup key={mainStatus.id}>
            <SelectLabel style={{ color: mainStatus.color }}>{mainStatus.name}</SelectLabel>
            {mainStatus.subStatuses?.map((subStatus) => (
              <SelectItem key={subStatus.id} value={subStatus.id}>
                {subStatus.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
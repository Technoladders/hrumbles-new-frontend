// src/pages/jobs/ai/AiStatusSelector.tsx
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVerificationStatuses } from './hooks/useVerificationStatuses';
import { updateCandidateBgvStatus } from '@/services/bgvService';

interface Props {
  candidateId: string;
  currentSubStatusId: string | null;
  onUpdate: () => void;
}

export const AiStatusSelector = ({ candidateId, currentSubStatusId, onUpdate }: Props) => {
  const { selectOptions, isLoading } = useVerificationStatuses();
  const user = useSelector((state: any) => state.auth.user);

  const handleStatusChange = async (newStatusId: string) => {
    if (!newStatusId || newStatusId === currentSubStatusId) return;
    
    toast.promise(updateCandidateBgvStatus(candidateId, newStatusId, user.id), {
      loading: 'Updating status...',
      success: (success) => {
        if (success) {
          onUpdate();
          return 'Status updated successfully!';
        } else {
          // This allows the promise to "fail" without throwing an unhandled rejection
          throw new Error('Failed to update status.');
        }
      },
      error: 'An error occurred.',
    });
  };

 return (
    <Select
      value={currentSubStatusId || ''}
      onValueChange={handleStatusChange}
      disabled={isLoading} // <-- KEY CHANGE
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading statuses..." : "Select a status..."} />
      </SelectTrigger>
      <SelectContent>
        {selectOptions.map(group => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
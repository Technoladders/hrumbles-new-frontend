// src/pages/jobs/ai/AssignCandidateToJobModal.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllJobs } from '@/services/jobService';
import { JobData } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssignSuccess: () => void;
  candidateId: string | null;
  candidateName: string;
}

export const AssignCandidateToJobModal = ({ isOpen, onClose, onAssignSuccess, candidateId, candidateName }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: jobs = [] } = useQuery<JobData[]>({
    queryKey: ['allJobsList'],
    queryFn: getAllJobs,
  });

  const selectedJobTitle = jobs.find(job => job.id === selectedJobId)?.title || "Select a job...";

  const handleAssign = async () => {
    if (!candidateId || !selectedJobId) return;
    setIsAssigning(true);
    try {
      // Use a simple RPC to create the link in job_candidates table
      const { error } = await supabase.rpc('assign_candidate_to_job_by_id', {
        p_candidate_id: candidateId,
        p_job_id: selectedJobId
      });

      if (error) throw error;
      
      toast.success(`${candidateName} assigned successfully!`);
      onAssignSuccess(); // This will refetch data and close the modal

    } catch (err: any) {
      toast.error("Failed to assign candidate", { description: err.message });
    } finally {
      setIsAssigning(false);
    }
  };
  
  // Reset state when modal is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedJobId(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Candidate to Job</DialogTitle>
          <DialogDescription>Assign <span className="font-semibold">{candidateName}</span> to an active job opening.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                {selectedJobTitle}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search jobs..." />
                <CommandEmpty>No job found.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {jobs.map((job) => (
                      <CommandItem key={job.id} value={job.title} onSelect={() => { setSelectedJobId(job.id); setOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", selectedJobId === job.id ? "opacity-100" : "opacity-0")} />
                        {job.title} ({job.jobId})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedJobId || isAssigning}>
            {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign to Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
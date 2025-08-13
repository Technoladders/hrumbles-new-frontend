// src/pages/jobs/ai/AddCandidateJobSelectModal.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllJobs } from '@/services/jobService';
import { JobData } from '@/lib/types';

interface Props {
  onClose: () => void;
  onBack: () => void;
  onJobSelected: (jobId: string) => void;
  isSaving: boolean;
}

export const AddCandidateJobSelectModal = ({ onClose, onBack, onJobSelected, isSaving }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs = [] } = useQuery<JobData[]>({
    queryKey: ['allJobsList'],
    queryFn: getAllJobs,
  });

  const selectedJobTitle = jobs.find(job => job.id === selectedJobId)?.title || "Select a job...";

  // --- KEY CHANGE: REMOVED <Dialog> and <DialogContent> wrappers ---
  return (
    <div>
      <DialogHeader>
        <DialogTitle>Step 3: Assign to Job</DialogTitle>
        <DialogDescription>Finally, select the job you want to assign this candidate to.</DialogDescription>
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
      <DialogFooter className="flex justify-between w-full">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => onJobSelected(selectedJobId!)} disabled={!selectedJobId || isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Assign Candidate"}
        </Button>
      </DialogFooter>
    </div>
  );
};
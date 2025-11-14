import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import Editor from "react-simple-wysiwyg";
import { Briefcase, Users, Clock, MessageSquare, PlusCircle, Calendar, Trash2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Interface for a single candidate with their time
interface CandidateWithTime {
  id: string;
  name: string;
  submissionDate: string;
  mainStatus?: string;
  subStatus?: string;
  hours: number;
  minutes: number;
}

// Interface for available candidates (for dropdown)
interface AvailableCandidate {
  id: string;
  name: string;
  submissionDate: string;
  mainStatus?: string;
  subStatus?: string;
}

// UPDATED: JobLog interface with per-candidate time tracking
export interface JobLog {
  jobId: string;
  jobTitle: string;
  clientName: string;
  candidates: CandidateWithTime[]; // Changed from submissions to candidates with time
  challenges: string;
  job_display_id?: string;
  job_type?: string;
  submission_type?: string;
  job_type_category?: string;
}

interface JobLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobLog: JobLog | null;
  onSave: (updatedLog: JobLog) => void;
  timesheetDate: string;
}

export const JobLogDialog: React.FC<JobLogDialogProps> = ({ 
  open, 
  onOpenChange, 
  jobLog, 
  onSave, 
  timesheetDate 
}) => {
  const [challenges, setChallenges] = useState('');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  
  // State for candidate management
  const [localCandidates, setLocalCandidates] = useState<CandidateWithTime[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState<AvailableCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');

  // Load job log data when dialog opens
  useEffect(() => {
    if (jobLog) {
      console.log('JobLog data:', jobLog);
      setChallenges(jobLog.challenges || '');
      setLocalCandidates(jobLog.candidates || []);
    }
  }, [jobLog]);

  // Fetch all candidates for this job when dialog opens
  useEffect(() => {
    if (open && jobLog?.jobId) {
      fetchJobCandidates();
    }
  }, [open, jobLog?.jobId, timesheetDate]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsEditorVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsEditorVisible(false);
    }
  }, [open]);

  const fetchJobCandidates = async () => {
    if (!jobLog?.jobId) return;

    try {
      // Fetch ALL candidates for this job (not just today's)
      const { data: candidates, error } = await supabase
        .from("hr_job_candidates")
        .select(`
          id, 
          name, 
          submission_date, 
          applied_date, 
          created_at,
          main_status_id,
          sub_status_id,
          status:job_statuses!hr_job_candidates_main_status_id_fkey(name),
          sub_status:job_statuses!hr_job_candidates_sub_status_id_fkey(name)
        `)
        .eq("job_id", jobLog.jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCandidates: AvailableCandidate[] = candidates.map((c: any) => ({
        id: c.id,
        name: c.name,
        submissionDate: c.submission_date || c.applied_date || c.created_at,
        mainStatus: c.status?.name || 'N/A',
        subStatus: c.sub_status?.name || 'N/A',
      }));

      setAvailableCandidates(formattedCandidates);
    } catch (error) {
      console.error("Error fetching job candidates:", error);
      toast.error("Failed to load candidates for this job.");
    }
  };

  const handleAddCandidate = () => {
    if (!selectedCandidateId) {
      toast.error("Please select a candidate first.");
      return;
    }

    // Check if candidate already added
    if (localCandidates.some(c => c.id === selectedCandidateId)) {
      toast.error("This candidate has already been added.");
      return;
    }

    const candidateToAdd = availableCandidates.find(c => c.id === selectedCandidateId);
    if (!candidateToAdd) return;

    const newCandidate: CandidateWithTime = {
      ...candidateToAdd,
      hours: 0,
      minutes: 0,
    };

    setLocalCandidates(prev => [...prev, newCandidate]);
    setSelectedCandidateId('');
    toast.success(`${candidateToAdd.name} added to this job log.`);
  };

  const handleRemoveCandidate = (candidateId: string) => {
    const candidate = localCandidates.find(c => c.id === candidateId);
    setLocalCandidates(prev => prev.filter(c => c.id !== candidateId));
    toast.info(`${candidate?.name} removed from this job log.`);
  };

  const handleCandidateTimeChange = (candidateId: string, field: 'hours' | 'minutes', value: number) => {
    setLocalCandidates(prev => prev.map(c => 
      c.id === candidateId ? { ...c, [field]: value } : c
    ));
  };

  const handleSave = () => {
    if (!jobLog) return;

    // Validate that at least one candidate has time logged
    const totalMinutes = localCandidates.reduce((sum, c) => sum + (c.hours * 60) + c.minutes, 0);
    if (totalMinutes === 0) {
      toast.error("Please log time for at least one candidate.");
      return;
    }

    const updatedLog: JobLog = {
      ...jobLog,
      candidates: localCandidates,
      challenges,
    };

    onSave(updatedLog);
    onOpenChange(false);
    toast.success("Job log saved successfully!");
  };

  if (!jobLog) return null;

  // Get candidates not yet added to this log
  const unaddedCandidates = availableCandidates.filter(
    ac => !localCandidates.some(lc => lc.id === ac.id)
  );

  // Calculate total time across all candidates
  const totalHours = localCandidates.reduce((sum, c) => sum + c.hours, 0);
  const totalMinutes = localCandidates.reduce((sum, c) => sum + c.minutes, 0);
  const displayTotalHours = totalHours + Math.floor(totalMinutes / 60);
  const displayTotalMinutes = totalMinutes % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Briefcase className="h-6 w-6 mr-3 text-indigo-600" />
              <div>
                <DialogTitle className="text-xl font-bold text-gray-800">
                  Log Time: {jobLog.jobTitle}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">{jobLog.clientName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-600">Total Time</p>
              <p className="text-2xl font-bold text-indigo-600">
                {displayTotalHours}h {displayTotalMinutes}m
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6 flex-grow overflow-auto pr-2">

          {/* Add Candidate Section */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center mb-3">
              <PlusCircle className="h-5 w-5 mr-3 text-indigo-600" />
              <Label className="font-semibold text-indigo-800">Select Candidate to Add</Label>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a candidate..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {unaddedCandidates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      All candidates have been added or no candidates available.
                    </div>
                  ) : (
                    unaddedCandidates.map(candidate => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        <div className="flex flex-col py-1">
                          <span className="font-medium">{candidate.name}</span>
                          <span className="text-xs text-gray-500">
                            📅 {format(new Date(candidate.submissionDate), 'MMM dd, yyyy')}
                            {candidate.mainStatus && candidate.mainStatus !== 'N/A' && (
                              <span className="ml-2 text-emerald-600">• {candidate.mainStatus}</span>
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleAddCandidate}
                disabled={!selectedCandidateId}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Selected Candidates with Time Tracking */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-3 text-blue-600" />
                <Label className="font-semibold text-blue-800">Candidates & Time Logged</Label>
              </div>
              <span className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md">
                {localCandidates.length} candidate{localCandidates.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {localCandidates.length > 0 ? (
              <div className="space-y-3">
                {localCandidates.map(candidate => (
                  <div key={candidate.id} className="p-4 bg-white rounded-md border border-blue-100 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-800">{candidate.name}</span>
                          <span className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                            📅 {format(new Date(candidate.submissionDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {candidate.mainStatus && candidate.mainStatus !== 'N/A' && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-full">
                              Main: {candidate.mainStatus}
                            </span>
                          )}
                          {candidate.subStatus && candidate.subStatus !== 'N/A' && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 border border-blue-300 rounded-full">
                              Sub: {candidate.subStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCandidate(candidate.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Time Input for This Candidate */}
                    <div className="flex items-center gap-3 pt-3 border-t border-blue-100">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <Label className="text-sm font-medium text-gray-700 min-w-[80px]">Time Spent:</Label>
                      
                      <div className="flex items-center gap-2">
                        <Select 
                          value={String(candidate.hours)} 
                          onValueChange={(value) => handleCandidateTimeChange(candidate.id, 'hours', parseInt(value))}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 13 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i} hour{i !== 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select 
                          value={String(candidate.minutes)} 
                          onValueChange={(value) => handleCandidateTimeChange(candidate.id, 'minutes', parseInt(value))}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {m} min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(candidate.hours > 0 || candidate.minutes > 0) && (
                        <span className="ml-auto px-2.5 py-1 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-md">
                          {candidate.hours}h {candidate.minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  No candidates added yet. Select candidates above to track time.
                </p>
              </div>
            )}
          </div>

          {/* Challenges/Notes Section */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center mb-2">
              <MessageSquare className="h-5 w-5 mr-3 text-indigo-600" />
              <Label className="text-base font-semibold text-gray-700">Challenges / Notes</Label>
            </div>
            <div className="mt-1 border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400">
              {isEditorVisible && (
                <Editor
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={localCandidates.length === 0}
          >
            <PlusCircle className="h-4 w-4 mr-2"/>
            Save Log
          </Button>
        </DialogFooter>

        <style>{`
          .rsw-editor ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
          .rsw-editor ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
          .rsw-editor li { display: list-item !important; margin-left: 0.5rem !important; }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
// src/pages/jobs/ai/AiCandidatesList.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobData, Candidate } from '@/lib/types';
import { useVerificationStatuses } from './hooks/useVerificationStatuses';
import { AiStatusSelector } from './AiStatusSelector';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  job: JobData;
  candidates: Candidate[];
  onCandidateUpdate: () => void;
}

export const AiCandidatesList = ({ job, candidates, onCandidateUpdate }: Props) => {
  const { mainStatuses, isLoading: areStatusesLoading } = useVerificationStatuses();
  const [activeTab, setActiveTab] = useState('all');

  // Set the first main status as the default tab once loaded
  if (activeTab === 'all' && !areStatusesLoading && mainStatuses.length > 0) {
      setActiveTab(mainStatuses[0].id);
  }

  const filteredCandidates = useMemo(() => {
    if (activeTab === 'all') return candidates;
    return candidates.filter(c => c.main_status_id === activeTab);
  }, [candidates, activeTab]);

  return (
    <Card>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="p-2 border-b w-full justify-start flex-wrap h-auto">
          {areStatusesLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <>
              <TabsTrigger value="all">All ({candidates.length})</TabsTrigger>
              {mainStatuses.map(status => (
                <TabsTrigger key={status.id} value={status.id}>
                  {status.name} ({candidates.filter(c => c.main_status_id === status.id).length})
                </TabsTrigger>
              ))}
            </>
          )}
        </TabsList>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead className="w-[300px]">Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No candidates in this stage.</TableCell></TableRow>}
            {filteredCandidates.map(candidate => (
              <TableRow key={candidate.id}>
                <TableCell className="font-medium">
                  <Link to={`/jobs/${job.id}/candidate/${candidate.id}/bgv`} className="hover:underline text-blue-600">
      {candidate.name}
    </Link>
                 </TableCell>
                <TableCell>
                  <AiStatusSelector 
                    candidateId={candidate.id} 
                    currentSubStatusId={candidate.sub_status_id}
                    onUpdate={onCandidateUpdate} 
                  />
                </TableCell>
                <TableCell>{candidate.email}</TableCell>
                <TableCell>{candidate.phone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Tabs>
    </Card>
  );
};
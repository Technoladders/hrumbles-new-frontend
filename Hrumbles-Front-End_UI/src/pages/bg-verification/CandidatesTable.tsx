// src/pages/jobs/ai/CandidatesTable.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, Copy, Check, Eye, Briefcase, Pencil, UserPlus } from 'lucide-react';

import { toast } from 'sonner';
import moment from 'moment';

const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

// --- COPIED FROM CandidatesList.tsx FOR REUSE ---
const HiddenContactCell = ({ email, phone }: { email?: string; phone?: string }) => {
  const [justCopied, setJustCopied] = useState<'email' | 'phone' | null>(null);

  const copyToClipboard = (value: string, field: 'email' | 'phone') => {
    navigator.clipboard.writeText(value);
    setJustCopied(field);
    toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} copied!`);
    setTimeout(() => setJustCopied(null), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {email && (
        <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Mail className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-2 flex items-center gap-2"><span className="text-sm">{email}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(email, 'email')}>{justCopied === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></PopoverContent></Popover>
      )}
      {phone && (
        <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Phone className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-2 flex items-center gap-2"><span className="text-sm">{phone}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(phone, 'phone')}>{justCopied === 'phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></PopoverContent></Popover>
      )}
    </div>
  );
};

// --- NEW HELPER FOR DISPLAYING RESULTS ---
const renderVerificationResult = (verification: any) => {
  if (!verification) {
    return <Badge variant="outline">Not Verified</Badge>;
  }

  const { response_data: res } = verification;
  const status = res.status === 200 ? res.data?.code : res.status;

  switch (status) {
    case 1:
    case 1014:
    case 1013:
    case 1022:
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    case 9:
    case 1015:
      return <Badge className='bg-amber-100 text-amber-800'>Not Found</Badge>;
   
  }
};

interface Props {
  candidates: any[];
  organizationId: string;
   onAssignClick: (candidateId: string, candidateName: string) => void;
}

export const CandidatesTable = ({ candidates, organizationId, onAssignClick }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Assigned Job</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Verified By</TableHead>
              <TableHead>Last Verification</TableHead>
              <TableHead>Added By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {candidates.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24">No candidates found.</TableCell></TableRow>}
            {candidates.map(candidate => {
              const candidateProfilePath = candidate.job_id
                ? `/jobs/unassigned/candidate/${candidate.id}/bgv`
                : `/jobs/unassigned/candidate/${candidate.id}/bgv`;

              const verification = candidate.latest_verification;
              const verifiedBy = verification?.user ? `${verification.user.first_name} ${verification.user.last_name}` : 'N/A';
              const addedBy = candidate.creator ? `${candidate.creator.first_name} ${candidate.creator.last_name}` : 'System';

              return (
                <TableRow key={candidate.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Link to={candidateProfilePath} className="hover:underline">{candidate.name}</Link>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/jobs/${candidate.job_id}`)} className='hover:underline' >{candidate.job_title}</TableCell>
                  <TableCell><HiddenContactCell email={candidate.email} phone={candidate.phone} /></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{verifiedBy}</span>
                      {verification && <span className="text-xs text-gray-500">{moment(verification.created_at).fromNow()}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{renderVerificationResult(verification)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{addedBy}</span>
                      <span className="text-xs text-gray-500">{moment(candidate.created_at).fromNow()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
  <TooltipProvider delayDuration={100}>
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(candidateProfilePath)}
            disabled={!candidate.job_id}
          >
            <span className="sr-only">View Details</span>
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View Details</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onAssignClick(candidate.id, candidate.name)}
          >
            <span className="sr-only">Assign to Job</span>
            <UserPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Assign to Job</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
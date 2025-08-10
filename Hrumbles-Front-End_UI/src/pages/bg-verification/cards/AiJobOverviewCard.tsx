// src/pages/jobs/ai/cards/AiJobOverviewCard.tsx
import { Briefcase, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobData } from "@/lib/types";

interface Props { job: JobData; candidateCount: number; }

export const AiJobOverviewCard = ({ job, candidateCount }: Props) => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase size={18} /> Job Overview</CardTitle></CardHeader>
    <CardContent className="space-y-2 text-sm">
      <div className="flex justify-between"><span>Job Title:</span> <span className="font-semibold text-right">{job.title}</span></div>
      <div className="flex justify-between"><span>Job ID:</span> <span>{job.jobId}</span></div>
      <div className="flex justify-between"><span>Location:</span> <span className="text-right">{job.location.join(', ')}</span></div>
      <div className="flex justify-between"><span>Total Candidates:</span> <span className="font-bold">{candidateCount}</span></div>
    </CardContent>
  </Card>
);
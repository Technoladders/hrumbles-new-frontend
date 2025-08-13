import { Briefcase, FileText, Clock, User, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobData, Candidate } from "@/lib/types";

interface Props {
  job: JobData;
  candidates: Candidate[];
}

export const AiJobOverviewCard = ({ job, candidates }: Props) => (
  <Card className="md:col-span-1 purple-gradient">
    <CardHeader className="pb-2 pt-4">
      <CardTitle className="text-lg font-semibold text-white flex items-center">
        <Briefcase className="mr-2" size={18} />
        Job Overview
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-2">
      <ul className="space-y-3">
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <FileText size={16} className="mr-2 text-white" />
            <span className="text-sm">Job Title:</span>
          </div>
          <span className="font-small text-sm text-right text-white">{job.title}</span>
        </li>
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <Briefcase size={16} className="mr-2 text-white" />
            <span>Job ID:</span>
          </div>
          <span className="font-small text-sm text-right text-white">{job.jobId}</span>
        </li>
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <Clock size={16} className="mr-2 text-white" />
            <span>Hiring Mode:</span>
          </div>
          <span className="font-small text-sm text-right text-white">{job.hiringMode}</span>
        </li>
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <User size={16} className="mr-2 text-white" />
            <span>Job Type:</span>
          </div>
          <span className="font-small text-sm text-right text-white">{job.type}</span>
        </li>
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <Briefcase size={16} className="mr-2 text-white" />
            <span>Client Name:</span>
          </div>
          <span className="font-small text-sm text-right text-white">{job.clientDetails?.clientName || job.clientOwner}</span>
        </li>
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <MapPin size={16} className="mr-2 text-white" />
            <span>Job Location:</span>
          </div>
          <div className="text-right">
            {job.location && job.location.length > 0 ? (
              <Badge variant="outline" className="bg-blue-50">
                {job.location.join(", ")}
              </Badge>
            ) : (
              <span className="font-medium">Remote</span>
            )}
          </div>
        </li>
        <li className="flex items-start justify-between">
          <div className="flex items-center text-sm text-white">
            <Users size={16} className="mr-2 text-white" />
            <span>Candidates Required:</span>
          </div>
          <Badge className="bg-white text-black">{job?.numberOfCandidates}</Badge>
        </li>
      </ul>
    </CardContent>
  </Card>
);
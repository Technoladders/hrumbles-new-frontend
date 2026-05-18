
import { Briefcase, FileText, Clock, User, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/jobs/ui/card";
import { Badge } from "@/components/jobs/ui/badge";
import { JobData, Candidate } from "@/lib/types";
import { useSelector } from "react-redux";

interface JobOverviewCardProps {
  job: JobData;
  candidates: Candidate[];
}

const JobOverviewCard = ({ job, candidates }: JobOverviewCardProps) => {

    const userRole = useSelector((state: any) => state.auth.role);
  const isVendor = userRole === "vendor";

  // Format budget for display
  const formatBudget = (amount: any, type: string) => {
    if (!amount) return "N/A";
    return `₹${Number(amount).toLocaleString('en-IN')} ${type || ''}`.trim();
  };

  console.log("Rendering JobOverviewCard with job data:", job);

return (
    <Card className="md:col-span-1 purple-gradient">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Briefcase className="mr-2" size={18} />
          Job Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ul className="space-y-3">
          {/* Always shown */}
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

          {/* Hidden from vendor */}
          {!isVendor && (
            <>
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
                <span className="font-small text-sm text-right text-white">
                  {job.clientDetails?.clientName || job.clientOwner}
                </span>
              </li>
            </>
          )}

          {/* Always shown */}
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
                <span className="font-medium text-white">Remote</span>
              )}
            </div>
          </li>
          <li className="flex items-start justify-between">
            <div className="flex items-center text-sm text-white">
              <Users size={16} className="mr-2 text-white" />
              <span>Candidates Required:</span>
            </div>
            <Badge className="bg-white text-black">{job.numberOfCandidates}</Badge>
          </li>
          <li className="flex items-start justify-between">
            <div className="flex items-center text-sm text-white">
              <Users size={16} className="mr-2 text-white" />
              <span>Candidates Added:</span>
            </div>
            <Badge className="bg-white text-black">{candidates.length}</Badge>
          </li>

          {/* Budget — always shown, label changes for vendor */}
          <li className="flex items-start justify-between">
            <div className="flex items-center text-sm text-white">
              <FileText size={16} className="mr-2 text-white" />
              <span>Budget:</span>
            </div>
            <span className="font-small text-sm text-right text-white">
              {formatBudget(job.hr_budget, job.hr_budget_type || job.budget_type)}
            </span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default JobOverviewCard;

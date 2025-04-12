
import { ChevronRight, FileText, Trophy } from "lucide-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CandidateData } from "@/services/candidateService";

interface CandidatesSummaryCardProps {
  jobId: string;
  candidates: CandidateData[];
  onAddCandidate: () => void;
}

const CandidatesSummaryCard = ({ jobId, candidates, onAddCandidate }: CandidatesSummaryCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>{candidates.length} total candidates</CardDescription>
          </div>
          <Button
            onClick={onAddCandidate}
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Add</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 mb-1">Screening</p>
              <p className="text-lg font-bold text-blue-700">
                {candidates.filter(c => c.status === "Screening").length}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-700 mb-1">Interviewing</p>
              <p className="text-lg font-bold text-yellow-700">
                {candidates.filter(c => c.status === "Interviewing").length}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 mb-1">Selected</p>
              <p className="text-lg font-bold text-green-700">
                {candidates.filter(c => c.status === "Selected").length}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700 mb-1">Rejected</p>
              <p className="text-lg font-bold text-red-700">
                {candidates.filter(c => c.status === "Rejected").length}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Recent Candidates</h4>
              <Link to={`/jobs/${jobId}`}>
                <Button variant="ghost" size="sm" className="h-7 text-primary">
                  <span>View All</span>
                  <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            
            <div className="space-y-2">
              {candidates.length === 0 ? (
                <div className="text-center p-4 border rounded-md border-dashed">
                  <p className="text-sm text-gray-500 mb-2">No candidates yet</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onAddCandidate}
                  >
                    Add Your First Candidate
                  </Button>
                </div>
              ) : (
                candidates.slice(0, 5).map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <FileText size={14} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{candidate.name}</p>
                        <p className="text-xs text-gray-500">{candidate.experience}</p>
                      </div>
                    </div>
                    
                    {getStatusBadge(candidate.status)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function for status badges
function getStatusBadge(status: string) {
  switch (status) {
    case "Screening":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Screening</Badge>;
    case "Interviewing":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Interviewing</Badge>;
    case "Selected":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Selected</Badge>;
    case "Rejected":
      return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Plus icon component
const Plus = (props) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
};

export default CandidatesSummaryCard;

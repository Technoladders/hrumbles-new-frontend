
import { Trophy } from "lucide-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { CandidateData } from "@/services/candidateService";

interface TopMatchesCardProps {
  candidates: CandidateData[];
}

const TopMatchesCard = ({ candidates }: TopMatchesCardProps) => {
  const topCandidates = candidates
    .filter(c => c.matchScore >= 80)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
    
  if (topCandidates.length === 0) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          <span>Top Matches</span>
        </CardTitle>
        <CardDescription>Candidates with high match scores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topCandidates.map((candidate) => (
            <div key={candidate.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Trophy size={14} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{candidate.name}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${candidate.matchScore}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{candidate.matchScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopMatchesCard;

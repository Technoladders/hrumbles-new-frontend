import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/jobs/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define the shape of the Redux state for useSelector
interface RootState {
  auth: {
    organization_id: string;
  };
}

interface TalentPoolMatch {
  id: string;
  candidate_name: string;
  matching_skill_count: number;
  matching_skills: string[];
}

interface TopTalentPoolMatchesCardProps {
  jobId: string;
}

const TopTalentPoolMatchesCard = ({ jobId }: TopTalentPoolMatchesCardProps) => {
  const organizationId = useSelector((state: RootState) => state.auth.organization_id);

  const { data: topMatches = [], isLoading } = useQuery({
    queryKey: ['topTalentPoolMatches', jobId],
    queryFn: async () => {
      if (!jobId || !organizationId) return [];

      const { data, error } = await supabase.rpc('get_top_talent_pool_matches', {
        p_job_id: jobId,
        p_organization_id: organizationId,
        p_limit: 20 // Fetch top 20 matches
      });

      if (error) {
        console.error('Error fetching top talent pool matches:', error);
        throw new Error(error.message);
      }
      return data as TalentPoolMatch[];
    },
    enabled: !!jobId && !!organizationId,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      );
    }

    if (topMatches.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          No matching candidates found in the Talent Pool.
        </div>
      );
    }

    return (
      <TooltipProvider delayDuration={100}>
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          {topMatches.map((candidate, index) => (
            <div 
              key={candidate.id} 
              className="flex items-center justify-between p-2 rounded-md transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 truncate">
                <span className="text-xs font-mono text-gray-400 w-5 text-center">
                  {index + 1}
                </span>
                <Link to={`/talent-pool/${candidate.id}`} className="text-sm font-medium text-gray-800 hover:text-purple-600 truncate">
                  {candidate.candidate_name}
                </Link>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="cursor-help bg-green-100 text-green-800 hover:bg-green-200">
                    {candidate.matching_skill_count} Skills Match
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold text-xs mb-1">Matching Skills:</p>
                  <ul className="list-disc pl-4 text-xs space-y-0.5">
                    {candidate.matching_skills?.map(skill => <li key={skill}>{skill}</li>)}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <Card className="md:col-span-1">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
          <Users className="mr-2 text-green-600" size={18} />
          Talent Pool Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default TopTalentPoolMatchesCard;
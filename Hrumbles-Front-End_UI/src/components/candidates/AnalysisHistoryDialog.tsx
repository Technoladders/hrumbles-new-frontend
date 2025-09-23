import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface AnalysisHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
}

const AnalysisHistoryDialog = ({ isOpen, onClose, candidateId, candidateName }: AnalysisHistoryDialogProps) => {
  const navigate = useNavigate();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['analysisHistory', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resume_analysis')
        .select(`
          job_id,
          candidate_id,
          overall_score,
          updated_at,
          hr_jobs ( title ),
          hr_employees!resume_analysis_created_by_fkey ( first_name, last_name )
        `)
        .eq('candidate_id', candidateId)
        .order('updated_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isOpen && !!candidateId,
  });
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  console.log("history", history)

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={{ content: { maxWidth: '600px', margin: 'auto' } }}>
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Analysis History for {candidateName}</h2>
        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : history.length === 0 ? (
          <p className="text-gray-500">No job comparisons found for this candidate.</p>
        ) : (
          <div className="space-y-4">
            {history.map((item: any) => (
              <div key={item.job_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.hr_jobs?.title || 'Unknown Job'}</p>
                  <p className="text-sm text-gray-500">
                    Analysed on {formatDate(item.updated_at)} by {item.hr_employees?.first_name || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">{item.overall_score}%</span>
                   <Button 
                      variant="ghost" 
                      size="icon"
                      // Navigate to the job view to see the candidate in that context
                       onClick={() => navigate(`/resume-analysis/${item.job_id}/${item.candidate_id}?talentId=${item.candidate_id}`)}
                      title="View in Job Context"
                    >
                      <Eye size={18} />
                    </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default AnalysisHistoryDialog;
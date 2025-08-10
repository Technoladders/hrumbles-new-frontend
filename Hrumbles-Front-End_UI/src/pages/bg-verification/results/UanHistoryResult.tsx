// src/pages/jobs/ai/results/UanHistoryResult.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const UanHistoryResult = ({ result }: { result: any }) => {
  const history = result.msg;
  if (!Array.isArray(history)) return <p>No history found.</p>;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="font-semibold">{history[0]?.name}'s Employment History</h3>
      {history.map((job: any, i: number) => (
        <Card key={i}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{job['Establishment Name']}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span><strong>Joined:</strong> {job.Doj}</span>
            <span><strong>Exited:</strong> {job.DateOfExitEpf === 'NA' ? 'Present' : job.DateOfExitEpf}</span>
            <span className="col-span-2"><strong>Member ID:</strong> {job.MemberId}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
// 
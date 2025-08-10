// src/pages/jobs/ai/cards/AiVerificationChartCard.tsx
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVerificationStatusCounts } from '@/services/bgvService'; 
import { PieChart as PieIcon } from 'lucide-react';

export const AiVerificationChartCard = ({ jobId }: { jobId: string }) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['verificationStatusCounts', jobId],
    queryFn: () => getVerificationStatusCounts(jobId),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><PieIcon size={18} /> Verification Pipeline</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p>Loading chart...</p>}
        {(!chartData || chartData.length === 0) && !isLoading && <p className="text-center text-gray-500 h-48 content-center">No candidate data to display.</p>}
        {chartData && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }}/>
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
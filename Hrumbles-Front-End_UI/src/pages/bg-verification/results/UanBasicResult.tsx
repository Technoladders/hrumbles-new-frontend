import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export const UanBasicResult = ({ result }: { result: any }) => {
  const uanDetails = result.msg?.uan_details?.[0];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-indigo-50 p-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-indigo-700">
          <User size={18} />
          UAN Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-gray-700"><strong>UAN:</strong> {uanDetails?.uan || 'N/A'}</p>
        <p className="text-gray-700"><strong>Name:</strong> {uanDetails?.name || 'N/A'}</p>
        <p className="text-gray-700"><strong>Date of Birth:</strong> {uanDetails?.date_of_birth || 'N/A'}</p>
      </CardContent>
    </Card>
  );
};
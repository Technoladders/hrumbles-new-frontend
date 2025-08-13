import { Card, CardContent } from '@/components/ui/card';
import { User, Briefcase, XCircle, AlertTriangle } from 'lucide-react';
import { UanBasicResult } from './results/UanBasicResult';
import { UanHistoryResult } from './results/UanHistoryResult';
import { LatestEmploymentResult } from './results/LatestEmploymentResult';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { LatestPassbookResult } from './results/LatestPassbookResult';

interface Props {
  resultData: any;
  verificationType: string;
}

export const VerificationResultDisplay = ({ resultData, verificationType }: Props) => {
  if (!resultData) return null;

  // 1. Check if the verification was successful
  if (isVerificationSuccessful(resultData, verificationType) || resultData.data?.code === '1022') {
    switch (verificationType) {
      case 'mobile_to_uan' :
      case 'pan_to_uan':
        return <UanBasicResult result={resultData} />;
      case 'uan_full_history':
        return <UanHistoryResult result={resultData} />;
      case 'latest_employment_mobile':
      case 'latest_employment_uan':
        return <LatestEmploymentResult result={resultData} />;
      case 'latest_passbook_mobile':
        return <LatestPassbookResult result={resultData} />;
      default:
        return <pre className="text-xs p-4 bg-gray-100 rounded-md">{JSON.stringify(resultData.msg || resultData.data, null, 2)}</pre>;
    }
  }

  // 2. Handle non-success states
  if (resultData.data?.code === '1015' || resultData.data?.code === '1023' || resultData.status === 9) {
    return (
      <Card className="border-none shadow-md bg-red-50">
        <CardContent className="p-4 flex items-center gap-2 text-sm font-medium text-red-600">
          <XCircle size={16} />
          {resultData.msg || resultData.data.message || 'Not found'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md bg-yellow-50">
      <CardContent className="p-4 flex items-center gap-2 text-sm font-medium text-yellow-600">
        <AlertTriangle size={16} />
        {resultData.message || 'Verification in progress...'}
      </CardContent>
    </Card>
  );
};
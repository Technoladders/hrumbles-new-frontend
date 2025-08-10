// src/pages/jobs/ai/VerificationDisplay.tsx

import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';
import { VerificationInputForm } from './VerificationInputForm';
import { UanBasicResult, UanHistoryResult } from './results'; // We will create these
import { Button } from '@/components/ui/button';


interface Props {
  title: string;
  verificationType: keyof BGVState['inputs'];
  // ... other props from VerificationInputForm ...
}

export const VerificationDisplay = (props: Props) => {
  const { verificationType, state, onVerify } = props;
  const result = state.results[verificationType];

  // If we have a final result, display it
  if (result && (result.data?.status === 1 || result.data?.status === 0)) {
    return (
      <div>
        {verificationType === 'mobile_to_uan' && <UanBasicResult result={result.data} />}
        {verificationType === 'pan_to_uan' && <UanBasicResult result={result.data} />}
        {verificationType === 'uan_full_history' && <UanHistoryResult result={result.data} />}
        
        <Button variant="outline" size="sm" className="mt-4" onClick={() => onVerify(verificationType)}>
          Verify Again
        </Button>
      </div>
    );
  }
  
  // Otherwise, show the input form
  return <VerificationInputForm {...props} />;
};
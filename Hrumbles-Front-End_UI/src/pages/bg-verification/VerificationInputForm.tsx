// src/pages/jobs/ai/VerificationInputForm.tsx

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';
import { VerificationResultDisplay } from './VerificationResultDisplay';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils'; 
import { Candidate } from '@/lib/types';

interface Props {
  title: string;
  verificationType: keyof BGVState['inputs'];
  inputs: { name: keyof BGVState['inputs']; placeholder: string; label: string }[];
  state: BGVState;
  onInputChange: (type: keyof BGVState['inputs'], value: string) => void;
  onVerify: (type: keyof BGVState['inputs']) => void;
  onBack: () => void;
  candidate: Candidate;
}

export const VerificationInputForm = ({ title, verificationType, inputs, state, onInputChange, onVerify, onBack, candidate }: Props) => {
  const [agreed, setAgreed] = useState(true);
  const isLoading = state.loading[verificationType];
  const result = state.results[verificationType];

  console.log("result", result)

  // if (result && isVerificationSuccessful(result.data, verificationType)) {
  //   return (
  //     <div className="animate-fade-in">
  //       <div className="flex items-center mb-4">
  //         <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-gray-500 hover:bg-gray-100"><ArrowLeft /></Button>
  //         <h3 className="text-lg font-semibold text-gray-800">{title} - Result</h3>
  //       </div>
  //       <VerificationResultDisplay resultData={result.data} verificationType={verificationType} />
  //       <Button variant="outline" size="sm" className="mt-4" onClick={() => onVerify(verificationType)} disabled={isLoading}>
  //         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
  //         Verify Again
  //       </Button>
  //     </div>
  //   );
  // }
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-gray-500 hover:bg-gray-100"><ArrowLeft /></Button>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      
      {inputs.map(input => (
        <div key={input.name} className="space-y-2">
          <Label htmlFor={input.name} className="text-gray-700"><span className="text-red-500 mr-1">*</span>{input.label}</Label>
          <Input id={input.name} placeholder={input.placeholder} value={state.inputs[input.name]} onChange={(e) => onInputChange(input.name, e.target.value)} disabled={isLoading} />
        </div>
      ))}

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox id={`terms-${verificationType}`} checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} />
        <label htmlFor={`terms-${verificationType}`} className="text-sm text-gray-600">I agree this data is shared with informed consent...</label>
      </div>
      
      <Button onClick={() => onVerify(verificationType)} disabled={isLoading || !agreed} className="w-full bg-indigo-600 hover:bg-indigo-700">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
      </Button>

           {/* --- NEW: Results section that renders below the form --- */}
      {result && (
        <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-2">Verification Result</h4>
            <VerificationResultDisplay resultData={result} verificationType={verificationType} candidate={candidate} />
        </div>
      )}

    </div>
  );
};
// 
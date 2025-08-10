// src/pages/jobs/ai/VerificationTabContent.tsx

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';


interface Props {
  verificationType: keyof BGVState['inputs'];
  inputs: { name: keyof BGVState['inputs']; placeholder: string; label: string }[];
  state: BGVState;
  onInputChange: (type: keyof BGVState['inputs'], value: string) => void;
  onVerify: (type: keyof BGVState['inputs']) => void;
}

export const VerificationTabContent = ({ verificationType, inputs, state, onInputChange, onVerify }: Props) => {
  const [agreed, setAgreed] = useState(true); // Default to checked as in the image
  const isLoading = state.loading[verificationType];
  const result = state.results[verificationType];

  const renderResult = () => {
    if (!result) return null;
    if (result.status === 'pending') return <p className="text-sm text-yellow-600 flex items-center gap-2"><AlertTriangle size={16}/> {result.message}</p>;
    if (result.data?.status === 9) return <div className="flex items-center gap-2 text-sm text-red-600"><XCircle size={16}/> {result.data.msg}</div>;
    if (result.data?.status === 1 || result.data?.status === 0) return (
      <div className="p-3 border rounded-md bg-green-50 text-xs mt-4">
        <div className="flex items-center gap-2 text-green-700 font-semibold mb-2"><CheckCircle size={16}/> Verification Success</div>
        <pre className="whitespace-pre-wrap text-green-900">{JSON.stringify(result.data.msg, null, 2)}</pre>
      </div>
    );
    return <p className="text-sm text-red-600">An unknown error occurred.</p>;
  };

  return (
    <div className="pt-4 space-y-4">
      {inputs.map(input => (
        <div key={input.name} className="space-y-1">
          <Label htmlFor={input.name}><span className="text-red-500">*</span> {input.label}</Label>
          <Input
            id={input.name}
            placeholder={input.placeholder}
            value={state.inputs[input.name]}
            onChange={(e) => onInputChange(input.name, e.target.value)}
            disabled={isLoading}
          />
        </div>
      ))}
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} />
        <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          I agree that this data is shared with the informed consent of owner / user for the purpose of verification and processing.
        </label>
      </div>
      <Button onClick={() => onVerify(verificationType)} disabled={isLoading || !agreed}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
      </Button>

      <div className="mt-4">{renderResult()}</div>
    </div>
  );
};
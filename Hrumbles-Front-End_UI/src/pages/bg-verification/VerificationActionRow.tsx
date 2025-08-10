import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';

interface Props {
  title: string;
  verificationType: keyof BGVState['inputs'];
  inputs: { name: keyof BGVState['inputs']; placeholder: string }[];
  state: BGVState;
  onInputChange: (type: keyof BGVState['inputs'], value: string) => void;
  onVerify: (type: keyof BGVState['inputs']) => void;
}

export const VerificationActionRow = ({ title, verificationType, inputs, state, onInputChange, onVerify }: Props) => {
  const isLoading = state.loading[verificationType];
  const result = state.results[verificationType];

  const renderResult = () => {
    if (!result) return null;
    if (result.status === 'pending') return <p className="text-sm text-yellow-600">{result.message}</p>;
    if (result.data?.status === 9) return <div className="flex items-center gap-2 text-sm text-red-600"><XCircle size={16}/> {result.data.msg}</div>;
    if (result.data?.status === 1) return (
      <div className="p-2 border rounded-md bg-green-50 text-xs">
        <div className="flex items-center gap-2 text-green-700 font-semibold mb-2"><CheckCircle size={16}/> Verification Success</div>
        <pre className="whitespace-pre-wrap">{JSON.stringify(result.data.msg, null, 2)}</pre>
      </div>
    );
    return <p className="text-sm text-red-600">An unknown error occurred.</p>;
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <h4 className="font-semibold">{title}</h4>
      <div className="flex items-end gap-2">
        {inputs.map(input => (
          <div key={input.name} className="flex-grow">
            <Input
              placeholder={input.placeholder}
              value={state.inputs[input.name]}
              onChange={(e) => onInputChange(input.name, e.target.value)}
              disabled={isLoading}
            />
          </div>
        ))}
        <Button onClick={() => onVerify(verificationType)} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
        </Button>
      </div>
      <div className="mt-2">{renderResult()}</div>
    </div>
  );
};
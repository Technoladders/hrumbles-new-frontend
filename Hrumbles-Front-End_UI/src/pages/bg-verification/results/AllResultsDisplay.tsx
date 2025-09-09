// src/pages/jobs/ai/results/AllResultsDisplay.tsx

import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';
import { Candidate } from '@/lib/types';
import { VerificationResultDisplay } from '../VerificationResultDisplay';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { generateComprehensiveReport } from '@/lib/generateComprehensiveReport'; // We will create this next

interface Props {
  candidate: Candidate;
  results: BGVState['results'];
  onBack: () => void;
}

const resultOrder = [
    'mobile_to_uan',
    'pan_to_uan',
    'latest_employment_uan',
    'latest_employment_mobile',
    'uan_full_history',
    'latest_passbook_mobile',
];

const resultTitles: { [key: string]: string } = {
    mobile_to_uan: 'UAN Lookup by Mobile',
    pan_to_uan: 'UAN Lookup by PAN',
    latest_employment_uan: 'Latest Employment (UAN)',
    latest_employment_mobile: 'Latest Employment (Mobile/PAN)',
    uan_full_history: 'Full Employment History (UAN)',
    latest_passbook_mobile: 'EPFO Passbook',
};


export const AllResultsDisplay = ({ candidate, results, onBack }: Props) => {
    const successfulResults = resultOrder.filter(key => 
        results[key] && isVerificationSuccessful(results[key].data, key)
    );

    const handleDownload = () => {
        generateComprehensiveReport(candidate, results);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-gray-500 hover:bg-gray-100"><ArrowLeft /></Button>
                    <h3 className="text-xl font-semibold text-gray-800">All Verification Results</h3>
                </div>
                <Button onClick={handleDownload} disabled={successfulResults.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                </Button>
            </div>

            {successfulResults.length > 0 ? (
                <div className="space-y-8">
                    {successfulResults.map(key => (
                        <div key={key}>
                            <h4 className="text-lg font-bold text-indigo-700 mb-2 pb-1 border-b-2 border-indigo-200">{resultTitles[key]}</h4>
                            <VerificationResultDisplay 
                                resultData={results[key].data}
                                verificationType={key}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-10">No successful verifications found for this candidate yet.</p>
            )}
        </div>
    );
};
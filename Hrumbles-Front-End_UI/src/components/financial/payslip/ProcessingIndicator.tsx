
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProcessingIndicatorProps {
  progress: number;
  isOcrProcessing: boolean;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  progress,
  isOcrProcessing,
}) => {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {isOcrProcessing ? 'OCR Processing' : 'Processing payslip'}
        </span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      {isOcrProcessing && (
        <p className="text-xs text-muted-foreground mt-1">
          Extracting text from image using OCR. This may take a moment...
        </p>
      )}
    </div>
  );
};

export default ProcessingIndicator;

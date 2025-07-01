
import { useState, useCallback } from 'react';
import { extractPayslipData, PayslipData } from '@/utils/payslip-extractor';
import { toast } from 'sonner';

interface UsePayslipUploaderResult {
  file: File | null;
  loading: boolean;
  error: string | null;
  extractedData: PayslipData | null;
  showConfirmation: boolean;
  progress: number;
  isOcrProcessing: boolean;
  handleFile: (file: File | null) => void;
  processPayslip: () => Promise<void>;
  handleConfirmExtraction: () => void;
  handleRetryExtraction: () => void;
  handleConfirmCancel: () => void;
  updateExtractedDataField: (field: string, value: any) => void;
  setShowConfirmation: (show: boolean) => void;
}

export const usePayslipUploader = (paymentId?: string, onComplete?: () => void): UsePayslipUploaderResult => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<PayslipData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  
  const handleFile = useCallback((file: File | null) => {
    setFile(file);
    setError(null);
    setExtractedData(null);
    setShowConfirmation(false);
    setProgress(0);
  }, []);
  
  const processPayslip = async () => {
    if (!file) {
      setError('Please select a file to process');
      return;
    }

    setLoading(true);
    setIsOcrProcessing(file.type.includes('image'));
    setProgress(20);

    try {
      // Process the file and extract data
      const result = await extractPayslipData(file);
      
      // Ensure required fields are present
      const validatedData = {
        ...result,
        // Add fixedAllowance if it's missing
        fixedAllowance: result.fixedAllowance || 0,
      };
      
      setExtractedData(validatedData);
      setProgress(100);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error processing payslip:', error);
      setError('Failed to extract data from the file');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmExtraction = () => {
    // Here you would typically send the extractedData to your backend
    // to update the payment information.
    console.log('Confirmed data:', extractedData);
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setShowConfirmation(false);
      toast.success('Payslip data saved successfully!');
      
      // Call onComplete if it's provided
      if (onComplete) {
        onComplete();
      }
    }, 1500);
  };
  
  const handleRetryExtraction = () => {
    setShowConfirmation(false);
    processPayslip();
  };
  
  const handleConfirmCancel = () => {
    setShowConfirmation(false);
  };
  
  const updateExtractedDataField = (field: string, value: any) => {
    setExtractedData(prev => {
      if (prev) {
        return { ...prev, [field]: value };
      }
      return prev;
    });
  };
  
  return {
    file,
    loading,
    error,
    extractedData,
    showConfirmation,
    progress,
    isOcrProcessing,
    handleFile,
    processPayslip,
    handleConfirmExtraction,
    handleRetryExtraction,
    handleConfirmCancel,
    updateExtractedDataField,
    setShowConfirmation
  };
};

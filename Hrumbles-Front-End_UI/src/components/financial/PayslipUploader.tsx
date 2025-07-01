
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FileDropZone from './payslip/FileDropZone';
import ProcessingIndicator from './payslip/ProcessingIndicator';
import PayslipConfirmationDialog from './payslip/PayslipConfirmationDialog';
import { usePayslipUploader } from './payslip/usePayslipUploader';

interface PayslipUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId?: string;
}

const PayslipUploader: React.FC<PayslipUploaderProps> = ({
  open,
  onOpenChange,
  paymentId,
}) => {
  const {
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
  } = usePayslipUploader(paymentId, () => onOpenChange(false));
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Payslip</DialogTitle>
            <DialogDescription>
              Upload a PDF, DOCX, or image file to extract payslip data. For images, we'll use OCR to extract text.
            </DialogDescription>
          </DialogHeader>
          
          <FileDropZone 
            file={file}
            error={error}
            loading={loading}
            onFileChange={handleFile}
          />
          
          {loading && (
            <ProcessingIndicator 
              progress={progress}
              isOcrProcessing={isOcrProcessing}
            />
          )}
          
          {file && !loading && (
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => handleFile(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={processPayslip}
              >
                Process Payslip
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <PayslipConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        extractedData={extractedData}
        onUpdateField={updateExtractedDataField}
        onConfirm={handleConfirmExtraction}
        onRetry={handleRetryExtraction}
        onCancel={handleConfirmCancel}
      />
    </>
  );
};

export default PayslipUploader;

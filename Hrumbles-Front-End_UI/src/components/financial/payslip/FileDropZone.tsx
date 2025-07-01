
import React, { useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { getFileIcon } from '@/utils/file-utils';
import { validatePayslipFile } from '@/utils/payslip-extractor';

interface FileDropZoneProps {
  file: File | null;
  error: string | null;
  loading: boolean;
  onFileChange: (file: File | null) => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  file,
  error,
  loading,
  onFileChange,
}) => {
  const [dragActive, setDragActive] = useState(false);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
    const validation = validatePayslipFile(file);
    
    if (!validation.valid) {
      onFileChange(null);
      return;
    }
    
    onFileChange(file);
  };
  
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center ${
        dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
      } ${error ? 'border-destructive/50 bg-destructive/5' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        id="payslip-upload"
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
        onChange={handleChange}
        disabled={loading}
      />
      
      {file ? (
        <div className="py-4">
          {getFileIcon(file.type)}
          <p className="text-sm font-medium mb-1">{file.name}</p>
          <p className="text-xs text-gray-500">
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
      ) : (
        <div className="py-4">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm font-medium">
            Drag and drop your payslip, or{' '}
            <label 
              htmlFor="payslip-upload" 
              className="text-primary cursor-pointer hover:underline"
            >
              browse
            </label>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, DOCX, JPG or PNG, up to 5MB
          </p>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-destructive flex items-center justify-center mt-2">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;


export interface UploadedFile {
  name: string;
  type: string;
  url?: string;
  size?: number;
}

export interface UploadFieldProps {
  label: string;
  value?: string;
  required?: boolean;
  onUpload: (file: File) => Promise<void>;
  showProgress?: boolean;
  currentFile?: UploadedFile | null;
  onRemove?: () => void;
  error?: string;
  multiple?: boolean;
  compact?: boolean;
}

export const formatFileSize = (size: number): string => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

export const getFileType = (type: string | undefined): string => {
  if (!type) return '';
  const parts = type.split('/');
  if (parts.length < 2) return type.toUpperCase();
  const extension = parts[1];
  if (!extension) return type.toUpperCase();
  return extension.toUpperCase();
};

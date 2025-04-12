
import React from "react";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { Document } from "@/services/types/employee.types";
import { getErrorMessage, getDocumentByType, getValidationType } from "../utils/documentUtils";

interface DocumentFieldProps {
  form: UseFormReturn<any>;
  documentType: Document['documentType'];
  documents: Document[];
  label: string;
  required?: boolean;
  updateDocumentNumber: (type: Document['documentType'], value: string) => void;
}

export const DocumentField: React.FC<DocumentFieldProps> = ({
  form,
  documentType,
  documents,
  label,
  required,
  updateDocumentNumber,
}) => {
  const validationType = getValidationType(documentType);
  const currentDocument = getDocumentByType(documents, documentType);
  const [localValue, setLocalValue] = React.useState(currentDocument?.documentNumber || '');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalValue(currentDocument?.documentNumber || '');
  }, [currentDocument?.documentNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = documentType === 'pan' ? e.target.value.toUpperCase() : e.target.value;
    setLocalValue(value);
    updateDocumentNumber(documentType, value);
    
    // Clear error when field is empty
    if (value.length === 0) {
      setError(null);
    }
  };

  const handleBlur = () => {
    if (localValue.length > 0) {
      const validationError = getErrorMessage(validationType, localValue);
      setError(validationError);
    }
  };

  return (
    <FormField
      control={form.control}
      name={validationType}
      render={({ field }) => (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {label}{required && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-1">
            <Input
              {...field}
              value={localValue}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={`Enter ${label}`}
              className={`h-9 ${error ? 'border-red-500' : ''}`}
            />
            {error && (
              <p className="text-[10px] font-light text-red-500 pl-1">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
};

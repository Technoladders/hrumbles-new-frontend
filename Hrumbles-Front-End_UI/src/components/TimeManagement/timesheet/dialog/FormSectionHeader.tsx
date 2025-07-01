
import React from 'react';

interface FormSectionHeaderProps {
  title: string;
  required?: boolean;
  description?: string;
}

export const FormSectionHeader: React.FC<FormSectionHeaderProps> = ({ 
  title, 
  required = false, 
  description 
}) => {
  return (
    <div className="mb-2">
      <h3 className="text-base font-medium flex items-center">
        {title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
};


import React, { useState, useEffect } from "react";
import { UploadField } from "./UploadField";
import { EducationFormProps } from "./types";
import { uploadDocument } from "@/utils/uploadDocument";
import { toast } from "sonner";
import { FormField } from "./FormField";
import { useForm } from "react-hook-form";

export const EducationForm: React.FC<EducationFormProps> = ({ onComplete, initialData }) => {
  const [ssc, setSsc] = useState<File | null>(null);
  const [hsc, setHsc] = useState<File | null>(null);
  const [degree, setDegree] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, watch } = useForm({
    defaultValues: {
      type: initialData?.type || 'degree',
      institute: initialData?.institute || '',
      yearCompleted: initialData?.yearCompleted || ''
    }
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({
    ssc: false,
    hsc: false,
    degree: false,
    institute: false,
    yearCompleted: false
  });

  const watchedFields = watch(['type', 'institute', 'yearCompleted']);

  useEffect(() => {
    if (initialData) {
      // Handle initial data if provided
    }
  }, [initialData]);

  useEffect(() => {
    const [type, institute, yearCompleted] = watchedFields;
    
    const newErrors = {
      ssc: !ssc,
      hsc: !hsc,
      degree: !degree,
      institute: !institute,
      yearCompleted: !yearCompleted
    };
    setErrors(newErrors);

    const educationData = {
      type,
      institute,
      yearCompleted,
      ssc,
      hsc,
      degree
    };
    
    const isComplete = !Object.values(newErrors).some(error => error);
    onComplete(isComplete, educationData);
  }, [ssc, hsc, degree, watchedFields, onComplete]);

  const handleFileUpload = async (file: File, type: 'ssc' | 'hsc' | 'degree') => {
    try {
      setIsSubmitting(true);
      
      switch (type) {
        case 'ssc':
          setSsc(file);
          setErrors(prev => ({ ...prev, ssc: false }));
          break;
        case 'hsc':
          setHsc(file);
          setErrors(prev => ({ ...prev, hsc: false }));
          break;
        case 'degree':
          setDegree(file);
          setErrors(prev => ({ ...prev, degree: false }));
          break;
      }
      
      toast.success(`${type.toUpperCase()} document uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${type} document:`, error);
      toast.error(`Failed to upload ${type.toUpperCase()} document`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-[622px] max-w-full flex-col text-sm font-medium ml-[15px]">
      <div className="text-[rgba(48,64,159,1)] font-bold">Education</div>
      <div className="text-[rgba(80,80,80,1)] text-xs mt-1">
        Add your course and certificate here.
      </div>

      <div className="mt-6 space-y-6">
        <FormField
          id="institute"
          label="Institute Name"
          required
          register={register}
          error={errors.institute ? { message: "Institute name is required" } : undefined}
        />

        <FormField
          id="yearCompleted"
          label="Year Completed"
          required
          register={register}
          error={errors.yearCompleted ? { message: "Year completed is required" } : undefined}
        />

        <div>
          <UploadField 
            label="SSC" 
            required 
            onUpload={(file) => handleFileUpload(file, 'ssc')}
            showProgress
            value={ssc?.name}
            currentFile={ssc ? { name: ssc.name, type: ssc.type } : null}
            error={errors.ssc ? "SSC certificate is required" : undefined}
          />
        </div>

        <div>
          <UploadField 
            label="HSC/Diploma" 
            required 
            onUpload={(file) => handleFileUpload(file, 'hsc')}
            showProgress
            value={hsc?.name}
            currentFile={hsc ? { name: hsc.name, type: hsc.type } : null}
            error={errors.hsc ? "HSC/Diploma certificate is required" : undefined}
          />
        </div>

        <div>
          <UploadField 
            label="Degree" 
            required 
            onUpload={(file) => handleFileUpload(file, 'degree')}
            showProgress
            value={degree?.name}
            currentFile={degree ? { name: degree.name, type: degree.type } : null}
            error={errors.degree ? "Degree certificate is required" : undefined}
          />
        </div>
      </div>
    </div>
  );
};

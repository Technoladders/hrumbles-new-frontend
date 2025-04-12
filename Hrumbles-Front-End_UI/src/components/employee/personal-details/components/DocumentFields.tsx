
import React from "react";
import { FormField } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { PersonalDetailsFormSchema } from "../schema/personalDetailsSchema";
import { IdDocumentField } from "../IdDocumentField"; // Fixed import path

interface DocumentFieldsProps {
  form: UseFormReturn<PersonalDetailsFormSchema>;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
}

export const DocumentFields: React.FC<DocumentFieldsProps> = ({ form, setValue, watch }) => {
  const errors = form.formState.errors;

  return (
    <>
      <FormField
        control={form.control}
        name="aadharNumber"
        render={({ field }) => (
          <IdDocumentField
            label="Aadhar Number"
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('aadharUrl', '');
            }}
            onDocumentUpload={(url) => setValue('aadharUrl', url)}
            documentUrl={watch('aadharUrl')}
            onDocumentDelete={() => setValue('aadharUrl', '')}
            error={errors.aadharNumber?.message}
            placeholder="Enter 12-digit Aadhar number"
            required
            pattern="\d{12}"
          />
        )}
      />

      <FormField
        control={form.control}
        name="panNumber"
        render={({ field }) => (
          <IdDocumentField
            label="PAN Number"
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('panUrl', '');
            }}
            onDocumentUpload={(url) => setValue('panUrl', url)}
            documentUrl={watch('panUrl')}
            onDocumentDelete={() => setValue('panUrl', '')}
            error={errors.panNumber?.message}
            placeholder="Enter PAN number"
            required
            pattern="[A-Z]{5}[0-9]{4}[A-Z]"
          />
        )}
      />

      <FormField
        control={form.control}
        name="uanNumber"
        render={({ field }) => (
          <IdDocumentField
            label="UAN Number"
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('uanUrl', '');
            }}
            onDocumentUpload={(url) => setValue('uanUrl', url)}
            documentUrl={watch('uanUrl')}
            onDocumentDelete={() => setValue('uanUrl', '')}
            error={errors.uanNumber?.message}
            placeholder="Enter 12-digit UAN number (optional)"
            pattern="\d{12}"
          />
        )}
      />

      <FormField
        control={form.control}
        name="esicNumber"
        render={({ field }) => (
          <IdDocumentField
            label="ESIC Number"
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              setValue('esicUrl', '');
            }}
            onDocumentUpload={(url) => setValue('esicUrl', url)}
            documentUrl={watch('esicUrl')}
            onDocumentDelete={() => setValue('esicUrl', '')}
            error={errors.esicNumber?.message}
            placeholder="Enter 17-digit ESIC number (optional)"
            pattern="\d{17}"
          />
        )}
      />
    </>
  );
};

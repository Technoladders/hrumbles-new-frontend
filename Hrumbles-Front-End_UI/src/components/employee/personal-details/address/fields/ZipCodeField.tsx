
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface ZipCodeFieldProps {
  form: UseFormReturn<any>;
  prefix: string;
  disabled?: boolean;
  required?: boolean;
}

export const ZipCodeField: React.FC<ZipCodeFieldProps> = ({ form, prefix, disabled, required = true }) => {
  return (
    <FormField
      control={form.control}
      name={`${prefix}.zipCode`}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-[#1A1F2C] font-semibold">
            ZIP Code{required && <span className="text-[#DD0101]">*</span>}
          </FormLabel>
          <FormControl>
            <Input 
              {...field}
              disabled={disabled}
              className="h-12 border-[#C8C8C9] focus:border-[#9b87f5]"
              placeholder="Enter ZIP code"
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

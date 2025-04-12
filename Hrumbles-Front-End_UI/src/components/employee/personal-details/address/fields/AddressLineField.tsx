
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface AddressLineFieldProps {
  form: UseFormReturn<any>;
  prefix: string;
  disabled?: boolean;
  required?: boolean;
}

export const AddressLineField: React.FC<AddressLineFieldProps> = ({ form, prefix, disabled, required = true }) => {
  return (
    <FormField
      control={form.control}
      name={`${prefix}.addressLine1`}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-[#1A1F2C] font-semibold">
            Address Line 1{required && <span className="text-[#DD0101]">*</span>}
          </FormLabel>
          <FormControl>
            <Input 
              {...field}
              disabled={disabled}
              className="h-12 border-[#C8C8C9] focus:border-[#9b87f5]"
              placeholder="Enter address"
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

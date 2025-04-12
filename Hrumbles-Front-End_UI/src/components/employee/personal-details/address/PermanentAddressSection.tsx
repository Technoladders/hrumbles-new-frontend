
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressFields } from "./AddressFields";

interface PermanentAddressSectionProps {
  form: UseFormReturn<any>;
}

export const PermanentAddressSection: React.FC<PermanentAddressSectionProps> = ({ form }) => {
  const handleSameAsPresent = (checked: boolean) => {
    if (checked) {
      const presentAddress = form.getValues("presentAddress");
      form.setValue("permanentAddress", { ...presentAddress }, { shouldValidate: true });
    } else {
      // Clear permanent address when unchecking
      form.setValue("permanentAddress", {
        addressLine1: "",
        country: "",
        state: "",
        city: "",
        zipCode: ""
      }, { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-sm font-semibold text-[#1A1F2C]">Permanent Address</h3>
        <FormField
          control={form.control}
          name="sameAsPresent"
          render={({ field }) => (
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="sameAsPresent"
                checked={field.value}
                onCheckedChange={(checked: boolean) => {
                  field.onChange(checked);
                  handleSameAsPresent(checked);
                }}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor="sameAsPresent"
                className="text-xs font-medium leading-none text-gray-700 whitespace-nowrap"
              >
                Same as present address
              </label>
            </div>
          )}
        />
      </div>
      <AddressFields 
        form={form} 
        prefix="permanentAddress" 
        disabled={form.watch("sameAsPresent")}
        required={!form.watch("sameAsPresent")}
      />
    </div>
  );
};

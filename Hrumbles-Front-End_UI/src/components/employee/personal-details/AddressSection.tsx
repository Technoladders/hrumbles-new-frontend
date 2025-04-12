
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { PresentAddressSection } from "./address/PresentAddressSection";
import { PermanentAddressSection } from "./address/PermanentAddressSection";

interface AddressSectionProps {
  form: UseFormReturn<any>;
}

export const AddressSection: React.FC<AddressSectionProps> = ({ form }) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[rgba(48,64,159,1)] font-bold">Contact Info</div>
        <div className="text-[rgba(80,80,80,1)] text-xs mt-1 mb-4">
          Add your address details here.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="w-full">
          <PresentAddressSection form={form} />
        </div>
        <div className="w-full">
          <PermanentAddressSection form={form} />
        </div>
      </div>
    </div>
  );
};

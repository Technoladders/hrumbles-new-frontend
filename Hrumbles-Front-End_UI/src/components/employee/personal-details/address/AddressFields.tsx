
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { AddressLineField } from "./fields/AddressLineField";
import { CountryField } from "./fields/CountryField";
import { StateField } from "./fields/StateField";
import { CityField } from "./fields/CityField";
import { ZipCodeField } from "./fields/ZipCodeField";

interface AddressFieldsProps {
  form: UseFormReturn<any>;
  prefix: string;
  disabled?: boolean;
  required?: boolean;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({ form, prefix, disabled, required = true }) => {
  return (
    <div className="space-y-3">
      <div className="text-xs">
        <AddressLineField form={form} prefix={prefix} disabled={disabled} required={required} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-xs">
          <CountryField form={form} prefix={prefix} disabled={disabled} required={required} />
        </div>
        <div className="text-xs">
          <StateField form={form} prefix={prefix} disabled={disabled} required={required} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-xs">
          <CityField form={form} prefix={prefix} disabled={disabled} required={required} />
        </div>
        <div className="text-xs">
          <ZipCodeField form={form} prefix={prefix} disabled={disabled} required={required} />
        </div>
      </div>
    </div>
  );
};

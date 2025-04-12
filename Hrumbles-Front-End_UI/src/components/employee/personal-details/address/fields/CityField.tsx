
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { City } from "country-state-city";

interface CityFieldProps {
  form: UseFormReturn<any>;
  prefix: string;
  disabled?: boolean;
  required?: boolean;
}

export const CityField: React.FC<CityFieldProps> = ({ form, prefix, disabled, required = true }) => {
  const countryCode = form.watch(`${prefix}.country`);
  const stateCode = form.watch(`${prefix}.state`);
  const cities = City.getCitiesOfState(countryCode, stateCode);

  return (
    <FormField
      control={form.control}
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-[#1A1F2C] font-semibold">
            City{required && <span className="text-[#DD0101]">*</span>}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled || !stateCode}>
            <FormControl>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};


import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Country } from "country-state-city";

interface CountryFieldProps {
  form: UseFormReturn<any>;
  prefix: string;
  disabled?: boolean;
  required?: boolean;
}

export const CountryField: React.FC<CountryFieldProps> = ({ form, prefix, disabled, required = true }) => {
  const countries = Country.getAllCountries();

  const handleCountryChange = (value: string) => {
    form.setValue(`${prefix}.country`, value);
    // Clear dependent fields
    form.setValue(`${prefix}.state`, '');
    form.setValue(`${prefix}.city`, '');
  };

  return (
    <FormField
      control={form.control}
      name={`${prefix}.country`}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-[#1A1F2C] font-semibold">
            Country{required && <span className="text-[#DD0101]">*</span>}
          </FormLabel>
          <Select onValueChange={handleCountryChange} defaultValue={field.value} disabled={disabled}>
            <FormControl>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.isoCode} value={country.isoCode}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};

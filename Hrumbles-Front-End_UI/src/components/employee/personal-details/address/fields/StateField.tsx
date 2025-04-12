
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { State } from "country-state-city";

interface StateFieldProps {
  form: UseFormReturn<any>;
  prefix: string;
  disabled?: boolean;
  required?: boolean;
}

export const StateField: React.FC<StateFieldProps> = ({ form, prefix, disabled, required = true }) => {
  const countryCode = form.watch(`${prefix}.country`);
  const states = State.getStatesOfCountry(countryCode);

  const handleStateChange = (value: string) => {
    form.setValue(`${prefix}.state`, value);
    // Clear city when state changes
    form.setValue(`${prefix}.city`, '');
  };

  return (
    <FormField
      control={form.control}
      name={`${prefix}.state`}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-[#1A1F2C] font-semibold">
            State{required && <span className="text-[#DD0101]">*</span>}
          </FormLabel>
          <Select onValueChange={handleStateChange} defaultValue={field.value} disabled={disabled || !countryCode}>
            <FormControl>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};


import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";

interface AddressFieldsProps {
  form: UseFormReturn<ClientFormValues>;
  type: "billing" | "shipping";
}

const AddressFields: React.FC<AddressFieldsProps> = ({ form, type }) => {
  const prefix = type === "billing" ? "billing_address" : "shipping_address";
  
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name={`${prefix}.street`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Address</FormLabel>
            <FormControl>
              <Input placeholder="Street Address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`${prefix}.city`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="City" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${prefix}.state`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input placeholder="State" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`${prefix}.zipCode`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ZIP Code</FormLabel>
              <FormControl>
                <Input placeholder="ZIP Code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${prefix}.country`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input placeholder="Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default AddressFields;

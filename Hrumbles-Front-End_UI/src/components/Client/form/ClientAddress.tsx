import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { Checkbox } from "../../ui/checkbox";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";

interface ClientAddressProps {
  form: UseFormReturn<ClientFormValues>;
}

const AddressFields: React.FC<{ form: UseFormReturn<ClientFormValues>; type: "billing" | "shipping" }> = ({ form, type }) => (
  <div className="space-y-2">
    <FormField
      control={form.control}
      name={`${type}_address.street`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm">Street</FormLabel>
          <FormControl>
            <Input placeholder="Street" className="h-8 text-sm" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="grid grid-cols-2 gap-2">
      <FormField
        control={form.control}
        name={`${type}_address.city`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">City</FormLabel>
            <FormControl>
              <Input placeholder="City" className="h-8 text-sm" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${type}_address.state`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">State</FormLabel>
            <FormControl>
              <Input placeholder="State" className="h-8 text-sm" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <FormField
        control={form.control}
        name={`${type}_address.country`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Country</FormLabel>
            <FormControl>
              <Input placeholder="Country" className="h-8 text-sm" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${type}_address.zipCode`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Zip Code</FormLabel>
            <FormControl>
              <Input placeholder="Zip Code" className="h-8 text-sm" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

const ClientAddress: React.FC<ClientAddressProps> = ({ form }) => {
  const copyBillingToShipping = () => {
    const billingAddress = form.getValues("billing_address");
    form.setValue("shipping_address", billingAddress);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Billing Address</h3>
        <AddressFields form={form} type="billing" />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="copy-address" onCheckedChange={(checked) => checked && copyBillingToShipping()} />
        <label htmlFor="copy-address" className="text-sm text-muted-foreground">
          Copy Billing Address to Shipping Address
        </label>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
        <AddressFields form={form} type="shipping" />
      </div>
    </div>
  );
};

export default ClientAddress;
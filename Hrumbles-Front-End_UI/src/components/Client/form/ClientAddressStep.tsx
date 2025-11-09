import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { Checkbox } from "../../ui/checkbox";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { motion } from "framer-motion";

interface ClientAddressStepProps {
  form: UseFormReturn<ClientFormValues>;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1 },
  }),
};

const AddressFields: React.FC<{ form: UseFormReturn<ClientFormValues>; type: "billing" | "shipping" }> = ({ form, type }) => (
  <div className="space-y-4">
    <FormField
      control={form.control}
      name={`${type}_address.street`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm">Street Address</FormLabel>
          <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control} name={`${type}_address.city`}
        render={({ field }) => (
          <FormItem><FormLabel className="text-sm">City</FormLabel><FormControl><Input placeholder="Anytown" {...field} /></FormControl><FormMessage /></FormItem>
        )}
      />
      <FormField
        control={form.control} name={`${type}_address.state`}
        render={({ field }) => (
          <FormItem><FormLabel className="text-sm">State / Province</FormLabel><FormControl><Input placeholder="State" {...field} /></FormControl><FormMessage /></FormItem>
        )}
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control} name={`${type}_address.country`}
        render={({ field }) => (
          <FormItem><FormLabel className="text-sm">Country</FormLabel><FormControl><Input placeholder="Country" {...field} /></FormControl><FormMessage /></FormItem>
        )}
      />
      <FormField
        control={form.control} name={`${type}_address.zipCode`}
        render={({ field }) => (
          <FormItem><FormLabel className="text-sm">Zip / Postal Code</FormLabel><FormControl><Input placeholder="12345" {...field} /></FormControl><FormMessage /></FormItem>
        )}
      />
    </div>
  </div>
);

const ClientAddressStep: React.FC<ClientAddressStepProps> = ({ form }) => {
  const [useShipping, setUseShipping] = React.useState(true);

  const copyBillingToShipping = (checked: boolean) => {
    if (checked) {
      const billingAddress = form.getValues("billing_address");
      form.setValue("shipping_address", billingAddress, { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6">
        <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800">Address Information</h3>
            <p className="text-gray-500 text-sm">Enter the billing and shipping addresses.</p>
        </div>

        <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Billing Address</h3>
            <AddressFields form={form} type="billing" />
        </motion.div>

        <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible" className="flex items-center space-x-2">
            <Checkbox id="copy-address" checked={useShipping} onCheckedChange={(checked) => {
                setUseShipping(Boolean(checked));
                if (checked) copyBillingToShipping(true);
            }} />
            <label htmlFor="copy-address" className="text-sm text-gray-600 cursor-pointer">
            Shipping address is the same as billing address
            </label>
        </motion.div>
        
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
                opacity: useShipping ? 0 : 1, 
                height: useShipping ? 0 : 'auto'
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
        >
            <div className="p-4 border rounded-lg">
                 <h3 className="text-lg font-semibold mb-4 text-gray-800">Shipping Address</h3>
                <AddressFields form={form} type="shipping" />
            </div>
        </motion.div>
    </div>
  );
};

export default ClientAddressStep;
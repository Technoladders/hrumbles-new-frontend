import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Checkbox } from "../../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { motion } from "framer-motion";

interface ClientDetailsStepProps {
  form: UseFormReturn<ClientFormValues>;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: "spring", stiffness: 100 },
  }),
};

const ClientDetailsStep: React.FC<ClientDetailsStepProps> = ({ form }) => {
  const showCommissionFields = form.watch("service_type")?.includes("permanent");

  return (
    <div className="space-y-6">
       <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">Client Details</h3>
        <p className="text-gray-500 text-sm">Provide the core details for this client.</p>
      </div>
      <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible">
          <FormField
            control={form.control}
            name="service_type"
            render={() => (
              <FormItem className="p-4 border rounded-lg bg-gray-50/50">
                <FormLabel className="text-sm font-semibold">Type of Service *</FormLabel>
                <div className="flex gap-6 pt-2">
                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => {
                      const selected = field.value || [];
                      return (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="contractual"
                            checked={selected.includes("contractual")}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...selected, "contractual"]
                                : selected.filter((v) => v !== "contractual");
                              field.onChange(newValue);
                            }}
                          />
                          <label htmlFor="contractual" className="text-sm cursor-pointer">Contractual</label>
                        </div>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => {
                      const selected = field.value || [];
                      return (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="permanent"
                            checked={selected.includes("permanent")}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...selected, "permanent"]
                                : selected.filter((v) => v !== "permanent");
                              field.onChange(newValue);
                            }}
                          />
                          <label htmlFor="permanent" className="text-sm cursor-pointer">Permanent</label>
                        </div>
                      );
                    }}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible">
            <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-sm">Display Name *</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Quantum Inc." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </motion.div>
        <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible">
            <FormField
            control={form.control}
            name="client_name"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-sm">Legal Client Name *</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Quantum Solutions Pvt. Ltd." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </motion.div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible">
            <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-sm">Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="INR">₹ (INR)</SelectItem>
                    <SelectItem value="USD">$ (USD)</SelectItem>
                    <SelectItem value="GBP">£ (GBP)</SelectItem>
                    <SelectItem value="EUR">€ (EUR)</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </motion.div>
        <motion.div custom={4} variants={itemVariants} initial="hidden" animate="visible">
            <FormField
            control={form.control}
            name="internal_contact"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="text-sm">Internal Point of Contact</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </motion.div>
      </div>

        {/* --- NEWLY ADDED SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div custom={5} variants={itemVariants} initial="hidden" animate="visible">
          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Payment Terms</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>
        <motion.div custom={6} variants={itemVariants} initial="hidden" animate="visible">
          <FormField
            control={form.control}
            name="end_client"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">End Client (if applicable)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="End Client Name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>
      </div>
      {/* --- END OF NEWLY ADDED SECTION --- */}
      
      {showCommissionFields && (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t"
        >
          <FormField
            control={form.control}
            name="commission_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Commission Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commission_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Commission Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={form.watch("commission_type") === "percentage" ? "% value" : "Amount"}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>
      )}
    </div>
  );
};

export default ClientDetailsStep;
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Checkbox } from "../../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";

interface ClientBasicInfoProps {
  form: UseFormReturn<ClientFormValues>;
}

const ClientBasicInfo: React.FC<ClientBasicInfoProps> = ({ form }) => {
  const showCommissionFields = form.watch("service_type")?.includes("permanent");

  return (
    <div className="space-y-2">
      <FormField
        control={form.control}
        name="service_type"
        render={() => (
          <FormItem>
            <FormLabel className="text-sm">Type of Service</FormLabel>
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => {
                  const selected = field.value || [];
                  return (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selected.includes("contractual")}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...selected, "contractual"]
                            : selected.filter((v) => v !== "contractual");
                          field.onChange(newValue);
                        }}
                      />
                      <label className="text-sm">Contractual</label>
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
                        checked={selected.includes("permanent")}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...selected, "permanent"]
                            : selected.filter((v) => v !== "permanent");
                          field.onChange(newValue);
                        }}
                      />
                      <label className="text-sm">Permanent</label>
                    </div>
                  );
                }}
              />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Display Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Display Name"
                  className="h-8 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="client_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Client Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Client Name"
                  className="h-8 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Currency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
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
        <FormField
          control={form.control}
          name="internal_contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Internal Contact</FormLabel>
              <FormControl>
                <Input
                  placeholder="Internal Contact"
                  className="h-8 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name="payment_terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Payment Terms</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className="h-8 text-sm">
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
        <FormField
          control={form.control}
          name="end_client"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">End Client</FormLabel>
              <FormControl>
                <Input
                  placeholder="End Client"
                  className="h-8 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {showCommissionFields && (
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="commission_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Commission Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
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
                    placeholder={form.watch("commission_type") === "percentage" ? "%" : "Amount"}
                    className="h-8 text-sm"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default ClientBasicInfo;
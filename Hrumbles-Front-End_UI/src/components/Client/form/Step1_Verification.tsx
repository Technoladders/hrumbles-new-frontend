// components/Client/form/Step1_Verification.tsx
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Checkbox } from "../../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { UseFormReturn } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { Button } from "../../ui/button";
import { Loader2, Search } from "lucide-react";

interface Step1Props {
  form: UseFormReturn<ClientFormValues>;
  onVerify: () => void;
  isVerifying: boolean;
  isVerified: boolean;
  onManualEntry: () => void;
}

const Step1_Verification: React.FC<Step1Props> = ({ form, onVerify, isVerifying, isVerified, onManualEntry }) => {
  const showCommissionFields = form.watch("service_type")?.includes("permanent");

  return (
    <div className="space-y-4">
      {/* --- COMPANY VERIFICATION SECTION --- */}
      <FormField
        control={form.control}
        name="company_search_term"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Company Name Search</FormLabel>
            <div className="flex items-center gap-2">
              <FormControl>
                <Input
                  placeholder="Enter Company Name to Verify & Autofill"
                  className="h-8 text-sm"
                  {...field}
                  disabled={isVerified}
                />
              </FormControl>
              {!isVerified && (
                <Button type="button" size="sm" onClick={onVerify} disabled={isVerifying || !field.value}>
                  {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Verify</span>
                </Button>
              )}
            </div>
            {!isVerified && (
              <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={onManualEntry}>
                or, enter details manually
              </Button>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="border-t border-gray-200 my-4" />

      {/* --- BASIC INFO SECTION --- */}
      <FormField
        control={form.control}
        name="service_type"
        render={() => (
          <FormItem>
            <FormLabel className="text-sm">Type of Service*</FormLabel>
            <div className="flex gap-4">
              {/* ... Checkbox logic remains the same ... */}
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
              <FormLabel className="text-sm">Display Name*</FormLabel>
              <FormControl>
                <Input placeholder="Display Name" className="h-8 text-sm" {...field} disabled={isVerified} />
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
              <FormLabel className="text-sm">Legal Client Name*</FormLabel>
              <FormControl>
                <Input placeholder="Legal Name" className="h-8 text-sm" {...field} disabled={isVerified} />
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
          render={({ field }) => ( <FormItem> ... </FormItem> )}
        />
        <FormField
          control={form.control}
          name="payment_terms"
          render={({ field }) => ( <FormItem> ... </FormItem> )}
        />
      </div>

      {showCommissionFields && (
        <div className="grid grid-cols-2 gap-2">
          {/* ... Commission fields remain the same ... */}
        </div>
      )}
    </div>
  );
};

export default Step1_Verification;
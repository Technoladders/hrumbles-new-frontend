
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "./bank/FormField";
import { DocumentUploads } from "./bank/DocumentUploads";
import { bankAccountSchema, type BankFormData } from "./bank/bankAccountSchema";
import { BankDetails } from "@/services/types/employee.types";
import { toast } from "sonner";

interface BankAccountFormProps {
  onComplete: (completed: boolean, formData?: BankDetails) => void;
  initialData?: BankDetails | null;
  isSubmitting?: boolean;
}

export const BankAccountForm: React.FC<BankAccountFormProps> = ({
  onComplete,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<BankFormData>({
    resolver: zodResolver(bankAccountSchema),
    mode: "onChange",
    defaultValues: initialData ? {
      ...initialData,
      accountType: initialData.accountType as "savings" | "current"
    } : undefined
  });

  const formValues = {
    cancelledCheque: watch("cancelledCheque"),
    passbookCopy: watch("passbookCopy")
  };

  const transformDocumentValue = (value: string | File | { url?: string }): string | File => {
    if (value instanceof File) return value;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && 'url' in value) return value.url || '';
    return '';
  };

  const transformedFormValues = {
    cancelledCheque: transformDocumentValue(formValues.cancelledCheque),
    passbookCopy: transformDocumentValue(formValues.passbookCopy)
  };

  const onSubmit = async (data: BankFormData) => {
    try {
      if (!formValues.cancelledCheque || !formValues.passbookCopy) {
        toast.error("Please upload all required documents");
        return;
      }

      // Ensure all required fields are present and correctly typed
      const transformedData: BankDetails = {
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
        branchName: data.branchName,
        accountType: data.accountType,
        bankPhone: data.bankPhone || "",
        cancelledCheque: transformDocumentValue(formValues.cancelledCheque),
        passbookCopy: transformDocumentValue(formValues.passbookCopy)
      };

      onComplete(true, transformedData);
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to save bank details");
    }
  };

  return (
    <div className="w-full rounded-lg">
      <div className="flex items-center gap-1.5 text-[#30409F] mb-3">
        <Banknote className="h-4 w-4" />
        <span className="text-sm font-semibold">Bank Account Details</span>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            id="accountHolderName"
            label="Account Holder Name"
            register={register}
            error={errors.accountHolderName}
            placeholder="Enter account holder name"
          />

          <FormField
            id="accountNumber"
            label="Account Number"
            register={register}
            error={errors.accountNumber}
            placeholder="Enter account number"
          />

          <FormField
            id="ifscCode"
            label="IFSC Code"
            register={register}
            error={errors.ifscCode}
            placeholder="Enter IFSC code"
            className="uppercase"
          />

          <FormField
            id="bankName"
            label="Bank Name"
            register={register}
            error={errors.bankName}
            placeholder="Enter bank name"
          />

          <FormField
            id="branchName"
            label="Branch Name"
            register={register}
            error={errors.branchName}
            placeholder="Enter branch name"
          />

          <div className="relative space-y-1">
            <label htmlFor="accountType" className="text-xs font-semibold text-[#303030]">
              Account Type<span className="text-[#DD0101]">*</span>
            </label>
            <Select
              onValueChange={(value: "savings" | "current") => setValue("accountType", value)}
              defaultValue={initialData?.accountType}
            >
              <SelectTrigger
                id="accountType"
                className="h-7 text-xs border-[#E4E4E4] rounded-lg hover:border-[#30409F]/50 focus:ring-2 focus:ring-[#30409F]/20"
              >
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="current">Current</SelectItem>
              </SelectContent>
            </Select>
            {errors.accountType && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-[#DD0101]">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.accountType.message}</span>
              </div>
            )}
          </div>

          <FormField
            id="bankPhone"
            label="Bank Phone Number"
            register={register}
            error={errors.bankPhone}
            type="tel"
            placeholder="Enter bank phone number"
          />
        </div>

        <div className="pt-3">
          <DocumentUploads setValue={setValue} formValues={transformedFormValues} />
        </div>

        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            className="bg-[#30409F] hover:bg-[#30409F]/90"
            disabled={isSubmitting || !isValid || !formValues.cancelledCheque || !formValues.passbookCopy}
          >
            {isSubmitting ? "Saving..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
};

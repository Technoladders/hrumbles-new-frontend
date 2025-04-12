
import React, {useEffect} from "react";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { PersonalDetailsFormSchema } from "../schema/personalDetailsSchema";

interface BasicDetailsFieldsProps {
  form: UseFormReturn<PersonalDetailsFormSchema>;
  isCheckingEmail?: boolean;
  emailError?: string | null;
  isCheckingPhone?: boolean;
  phoneError?: string | null;
}

export const BasicDetailsFields: React.FC<BasicDetailsFieldsProps> = ({
  form,
  isCheckingEmail,
  emailError,
  isCheckingPhone,
  phoneError
}) => {
  const errors = form.formState.errors;

  // useEffect(() => {
  //   console.log("Current Form State:", form.getValues());
  // }, [form.watch()]); 

  return (
    <>
      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              First Name<span className="text-red-500">*</span>
            </label>
            <Input
              {...field}
              placeholder="Enter first name"
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.firstName.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Last Name<span className="text-red-500">*</span>
            </label>
            <Input
              {...field}
              placeholder="Enter last name"
              className={errors.lastName ? "border-red-500" : ""}
            />
            {errors.lastName && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.lastName.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="employeeId"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Employee ID<span className="text-red-500">*</span>
            </label>
            <Input
              {...field}
              placeholder="Enter employee ID"
              className={errors.employeeId ? "border-red-500" : ""}
            />
            {errors.employeeId && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.employeeId.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Phone Number<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                {...field}
                type="tel"
                placeholder="Enter phone number"
                className={phoneError || errors.phone ? "border-red-500" : ""}
              />
              {isCheckingPhone && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>
            {(errors.phone || phoneError) && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{phoneError || errors.phone?.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Email<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                {...field}
                type="email"
                placeholder="Enter email address"
                className={emailError || errors.email ? "border-red-500" : ""}
              />
              {isCheckingEmail && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>
            {(errors.email || emailError) && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{emailError || errors.email?.message}</span>
              </div>
            )}
          </div>
        )}
      />
    </>
  );
};

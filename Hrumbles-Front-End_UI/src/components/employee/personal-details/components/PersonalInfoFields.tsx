
import React from "react";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BLOOD_GROUPS, MARITAL_STATUS, GENDER, PersonalDetailsFormSchema } from "../schema/personalDetailsSchema";

interface PersonalInfoFieldsProps {
  form: UseFormReturn<PersonalDetailsFormSchema>;
}

export const PersonalInfoFields: React.FC<PersonalInfoFieldsProps> = ({ form }) => {
  const errors = form.formState.errors;

  return (
    <>
      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Date of Birth<span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className={errors.dateOfBirth ? "border-red-500" : ""}
              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
              onChange={(e) => field.onChange(new Date(e.target.value))}
            />
            {errors.dateOfBirth && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.dateOfBirth.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Gender<span className="text-red-500">*</span>
            </label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.gender.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="bloodGroup"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Blood Group<span className="text-red-500">*</span>
            </label>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger className={errors.bloodGroup ? "border-red-500" : ""}>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bloodGroup && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.bloodGroup.message}</span>
              </div>
            )}
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="maritalStatus"
        render={({ field }) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Marital Status<span className="text-red-500">*</span>
            </label>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="married" id="married" />
                <Label htmlFor="married">Married</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unmarried" id="unmarried" />
                <Label htmlFor="unmarried">Unmarried</Label>
              </div>
            </RadioGroup>
            {errors.maritalStatus && (
              <div className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.maritalStatus.message}</span>
              </div>
            )}
          </div>
        )}
      />
    </>
  );
};

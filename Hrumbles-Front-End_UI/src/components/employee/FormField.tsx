
import React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  error?: { message?: string };
  required?: boolean;
  type?: string;
  register: any;
  className?: string;
  placeholder?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  required = true,
  type = "text",
  register,
  className,
  placeholder,
}) => {
  return (
    <div className="relative">
      <Label htmlFor={id} className="text-sm font-semibold text-[#303030]">
        {label}{required && <span className="text-[#DD0101]">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        {...register(id)}
        className={cn(
          "mt-2 h-11 border-[#E4E4E4] rounded-lg placeholder:text-[#8E8E8E]",
          "hover:border-[#30409F]/50 focus:ring-2 focus:ring-[#30409F]/20",
          error && "border-[#DD0101] hover:border-[#DD0101]/80 focus:ring-[#DD0101]/20",
          className
        )}
        placeholder={placeholder}
      />
      {error && (
        <div className="flex items-center gap-1 mt-1 text-xs text-[#DD0101]">
          <AlertCircle className="h-3 w-3" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
};

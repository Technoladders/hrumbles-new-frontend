
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
    <div className="relative space-y-1">
      <Label htmlFor={id} className="text-xs font-semibold text-[#303030]">
        {label}{required && <span className="text-[#DD0101]">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        {...register(id)}
        className={cn(
          "h-7 text-xs border-[#E4E4E4] rounded-lg placeholder:text-[#8E8E8E]",
          "hover:border-[#30409F]/50 focus:ring-2 focus:ring-[#30409F]/20",
          error && "border-[#DD0101] hover:border-[#DD0101]/80",
          className
        )}
        placeholder={placeholder}
      />
      {error && (
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#DD0101]">
          <AlertCircle className="h-3 w-3" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
};


import * as z from "zod";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export const bankAccountSchema = z.object({
  accountHolderName: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters")
    .regex(/^[A-Za-z\s.]+$/, "Name can only contain letters, spaces, and dots"),
  accountNumber: z
    .string()
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number cannot exceed 18 digits")
    .regex(/^\d+$/, "Account number can only contain numbers"),
  ifscCode: z
    .string()
    .length(11, "IFSC code must be exactly 11 characters")
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g., SBIN0123456)")
    .transform(val => val.toUpperCase()),
  bankName: z
    .string()
    .min(3, "Bank name must be at least 3 characters")
    .max(50, "Bank name cannot exceed 50 characters")
    .regex(/^[A-Za-z\s.]+$/, "Bank name can only contain letters, spaces, and dots"),
  branchName: z
    .string()
    .min(3, "Branch name must be at least 3 characters")
    .max(50, "Branch name cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9\s.-]+$/, "Branch name can only contain letters, numbers, spaces, dots, and dashes"),
  accountType: z.enum(["savings", "current"]) as z.ZodType<"savings" | "current">,
  bankPhone: z
    .string()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^\d+$/, "Phone number can only contain numbers"),
  cancelledCheque: z
    .string()
    .min(1, "Cancelled cheque is required")
    .or(z.instanceof(File))
    .or(z.object({ url: z.string() })),
  passbookCopy: z
    .string()
    .min(1, "Bank passbook/statement is required")
    .or(z.instanceof(File))
    .or(z.object({ url: z.string() })),
});

export type BankFormData = z.infer<typeof bankAccountSchema>;

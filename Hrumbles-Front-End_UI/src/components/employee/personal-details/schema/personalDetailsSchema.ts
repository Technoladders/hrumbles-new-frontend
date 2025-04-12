import * as z from "zod";

const addressSchema = z.object({
  addressLine1: z.string().min(1, "Address line is required"),
  country: z.string().optional().default(""),
  state: z.string().optional().default(""),
  city: z.string().optional().default(""),
  zipCode: z.string().optional().default("")
});

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
export const MARITAL_STATUS = ['married', 'unmarried'] as const;
export const GENDER = ['male', 'female', 'other'] as const;

export const personalDetailsSchema = z.object({
  profilePictureUrl: z.string().optional(),
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.coerce.date().max(new Date(), "Date of birth cannot be in the future"), 
  bloodGroup: z.enum(BLOOD_GROUPS, {
    required_error: "Blood group is required"
  }),
  gender: z.enum(GENDER, {
    required_error: "Gender is required"
  }),
  maritalStatus: z.enum(MARITAL_STATUS, {
    required_error: "Marital status is required"
  }),
  aadharNumber: z.string().regex(/^\d{12}$/, "Aadhar number must be 12 digits").optional(),
  aadharUrl: z.string().optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN number format").optional(),
  panUrl: z.string().optional(),
  uanNumber: z.string().regex(/^\d{12}$/, "UAN number must be 12 digits").optional(),
  uanUrl: z.string().optional(),
  esicNumber: z.string().regex(/^\d{17}$/, "ESIC number must be 17 digits").optional(),
  esicUrl: z.string().optional(),
  presentAddress: addressSchema,
  permanentAddress: addressSchema.optional(),
  sameAsPresent: z.boolean().optional()
});

export type PersonalDetailsFormSchema = z.infer<typeof personalDetailsSchema>;

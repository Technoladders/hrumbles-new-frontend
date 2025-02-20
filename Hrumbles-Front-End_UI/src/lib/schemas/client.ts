
import { z } from "zod";

export const clientFormSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  client_name: z.string().min(1, "Client name is required"),
  contact_person_first_name: z.string().min(1, "First name is required"),
  contact_person_last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  currency: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

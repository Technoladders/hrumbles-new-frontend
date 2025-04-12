import { z } from "zod";

export const clientFormSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  client_name: z.string().min(1, "Client name is required"),
  end_client: z.string().optional().default(""),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, "Contact name is required"),
        email: z.string().email("Invalid email address").optional().or(z.literal("")),
        phone: z.string().optional().or(z.literal("")),
        designation: z.string().optional().or(z.literal("")),
      })
    )
    .min(1, "At least one contact is required"),
  currency: z.string().default("INR"),
  service_type: z.array(z.string()).min(1, "At least one service type is required"),
  payment_terms: z.number().default(30),
  internal_contact: z.string().optional().default(""),
  billing_address: z.object({
    street: z.string().optional().default(""),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
    country: z.string().optional().default(""),
    zipCode: z.string().optional().default(""),
  }),
  shipping_address: z.object({
    street: z.string().optional().default(""),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
    country: z.string().optional().default(""),
    zipCode: z.string().optional().default(""),
  }),
  commission_type: z.enum(["percentage", "fixed"]).optional(), // Added
  commission_value: z.number().optional(), // Added
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
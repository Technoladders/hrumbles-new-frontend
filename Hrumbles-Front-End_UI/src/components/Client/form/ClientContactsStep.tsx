import React from "react";
import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { X, User, Mail, Briefcase, Phone as PhoneIcon } from "lucide-react";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { FormItem, FormMessage } from "@/components/ui/form";


interface ClientContactsStepProps {
  form: UseFormReturn<ClientFormValues>;
}

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05 },
    }),
  };

const ClientContactsStep: React.FC<ClientContactsStepProps> = ({ form }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">Contact Persons</h3>
        <p className="text-gray-500 text-sm">Add at least one primary contact for this client.</p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <motion.div
            key={field.id}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="p-4 border rounded-lg bg-gray-50/50 relative"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <FormItem>
                 <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        {...form.register(`contacts.${index}.name`)}
                        placeholder="Full Name"
                        className="pl-9 h-10"
                    />
                 </div>
                 <FormMessage>{form.formState.errors.contacts?.[index]?.name?.message}</FormMessage>
              </FormItem>

              {/* Email */}
              <FormItem>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        {...form.register(`contacts.${index}.email`)}
                        placeholder="Email Address"
                        className="pl-9 h-10"
                    />
                </div>
                <FormMessage>{form.formState.errors.contacts?.[index]?.email?.message}</FormMessage>
              </FormItem>
              
              {/* Phone */}
              <FormItem>
                <Controller
                  name={`contacts.${index}.phone`}
                  control={form.control}
                  render={({ field }) => (
                     <div className="relative">
                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <PhoneInput
                          {...field}
                          international
                          defaultCountry="IN"
                          placeholder="Phone Number"
                         className="phone-input pl-10 w-full h-10 rounded-md border border-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 text-base transition-all"
                        />
                     </div>
                  )}
                />
                 <FormMessage>{form.formState.errors.contacts?.[index]?.phone?.message}</FormMessage>
              </FormItem>

              {/* Designation */}
              <FormItem>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                    {...form.register(`contacts.${index}.designation`)}
                    placeholder="Designation"
                    className="pl-9 h-10"
                    />
                </div>
                 <FormMessage>{form.formState.errors.contacts?.[index]?.designation?.message}</FormMessage>
              </FormItem>
            </div>
             {fields.length > 1 && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                    onClick={() => remove(index)}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: fields.length * 0.05 }}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", email: "", phone: "", designation: "" })}
        >
          Add Another Contact
        </Button>
      </motion.div>
    </div>
  );
};

export default ClientContactsStep;

// Add this to your global CSS file (e.g., globals.css) to style the PhoneInput
/*
.phone-input .PhoneInputInput {
  border-radius: 0.375rem;
  border-width: 1px;
  height: 2.5rem;
  padding-left: 2.25rem;
  width: 100%;
  --tw-ring-color: hsl(var(--ring));
}

.phone-input .PhoneInputInput:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}
*/
// components/Client/form/Step2_Contacts.tsx
import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { X } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";

interface Step2Props {
  form: UseFormReturn<ClientFormValues>;
}

const Step2_Contacts: React.FC<Step2Props> = ({ form }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  return (
    <div className="space-y-6">
      {/* --- INTERNAL CONTACT --- */}
      <div>
        <h3 className="text-base font-semibold mb-2">Internal Contact</h3>
        <FormField
          control={form.control}
          name="internal_contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Point of Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Internal PoC" className="h-8 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* --- CLIENT CONTACTS --- */}
      <div>
        <h3 className="text-base font-semibold mb-2">Client Contacts*</h3>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
              {/* ... field array inputs remain the same ... */}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", email: "", phone: "", designation: "" })}
          >
            Add Contact
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step2_Contacts;
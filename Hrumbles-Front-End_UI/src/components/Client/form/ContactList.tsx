import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { ClientFormValues } from "@/lib/schemas/client";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { X } from "lucide-react";

interface ContactListProps {
  form: UseFormReturn<ClientFormValues>;
}

const ContactList: React.FC<ContactListProps> = ({ form }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Contacts</h3>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
          <div>
            <label className="text-sm">Name</label>
            <Input
              {...form.register(`contacts.${index}.name`)}
              placeholder="Name"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <Input
              {...form.register(`contacts.${index}.email`)}
              placeholder="Email"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-sm">Phone</label>
            <Input
              {...form.register(`contacts.${index}.phone`)}
              placeholder="Phone"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-sm">Designation</label>
              <Input
                {...form.register(`contacts.${index}.designation`)}
                placeholder="Designation"
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => remove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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
  );
};

export default ContactList;
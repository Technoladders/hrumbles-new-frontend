
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface EmergencyContact {
  relationship: string;
  name: string;
  phone: string;
}

interface EmergencyContactsSectionProps {
  contacts: EmergencyContact[];
  onContactsChange: (contacts: EmergencyContact[]) => void;
  maritalStatus?: string;
}

export const EmergencyContactsSection: React.FC<EmergencyContactsSectionProps> = ({
  contacts,
  onContactsChange,
  maritalStatus
}) => {
  const getRelationshipOptions = () => {
    const baseOptions = ['Parent', 'Sibling', 'Other'];
    return maritalStatus === 'married' ? ['Spouse', ...baseOptions] : baseOptions;
  };

  const addEmergencyContact = () => {
    onContactsChange([...contacts, { relationship: "", name: "", phone: "" }]);
  };

  const removeEmergencyContact = (index: number) => {
    onContactsChange(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    onContactsChange(newContacts);
  };

  return (
    <div>
      <div className="text-[rgba(48,64,159,1)] font-bold">Emergency Contact</div>
      <div className="text-[rgba(80,80,80,1)] text-xs mt-1">
        Add emergency contact details here.
      </div>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Relationship</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={contact.relationship}
                    onValueChange={(value) => updateContact(index, "relationship", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRelationshipOptions().map((option) => (
                        <SelectItem key={option.toLowerCase()} value={option.toLowerCase()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(index, "name", e.target.value)}
                    placeholder="Enter name"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={contact.phone}
                    onChange={(e) => updateContact(index, "phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmergencyContact(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button
          type="button"
          variant="outline"
          className="text-[#DD0101] border-[#DD0101] mt-4"
          onClick={addEmergencyContact}
        >
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/94ba00a354d444e81c8d49b7bd51add7537c14e2c575d31fbdfae2aad48e7d91?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-4 shrink-0 mr-2"
            alt="Add icon"
          />
          Add Contact
        </Button>
      </div>
    </div>
  );
};

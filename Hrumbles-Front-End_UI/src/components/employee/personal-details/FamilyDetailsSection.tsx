
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface FamilyMember {
  relationship: string;
  name: string;
  occupation: string;
  phone: string;
}

interface FamilyDetailsSectionProps {
  familyMembers: FamilyMember[];
  onFamilyMembersChange: (members: FamilyMember[]) => void;
  maritalStatus?: string;
}

export const FamilyDetailsSection: React.FC<FamilyDetailsSectionProps> = ({
  familyMembers,
  onFamilyMembersChange,
  maritalStatus
}) => {
  const getRelationshipOptions = () => {
    const baseOptions = ['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter'];
    return maritalStatus === 'married' ? ['Spouse', ...baseOptions] : baseOptions;
  };

  const addFamilyMember = () => {
    onFamilyMembersChange([...familyMembers, { relationship: "", name: "", occupation: "", phone: "" }]);
  };

  const removeFamilyMember = (index: number) => {
    onFamilyMembersChange(familyMembers.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const newMembers = [...familyMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    onFamilyMembersChange(newMembers);
  };

  return (
    <div>
      <div className="text-[rgba(48,64,159,1)] font-bold">Family Details</div>
      <div className="text-[rgba(80,80,80,1)] text-xs mt-1">
        Add your family member details here.
      </div>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Relationship</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {familyMembers.map((member, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={member.relationship}
                    onValueChange={(value) => updateMember(index, "relationship", value)}
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
                    value={member.name}
                    onChange={(e) => updateMember(index, "name", e.target.value)}
                    placeholder="Enter name"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={member.occupation}
                    onChange={(e) => updateMember(index, "occupation", e.target.value)}
                    placeholder="Enter occupation"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={member.phone}
                    onChange={(e) => updateMember(index, "phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFamilyMember(index)}
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
          onClick={addFamilyMember}
        >
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/94b97c43fd3a409f8a2658d3c3f998e3/94ba00a354d444e81c8d49b7bd51add7537c14e2c575d31fbdfae2aad48e7d91?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-4 shrink-0 mr-2"
            alt="Add icon"
          />
          Add Family Member
        </Button>
      </div>
    </div>
  );
};

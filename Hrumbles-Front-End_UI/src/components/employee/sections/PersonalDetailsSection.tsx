
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { PersonalDetailsData } from "../types";

interface PersonalDetailsSectionProps {
  data: PersonalDetailsData;
  onEdit: () => void;
}

export const PersonalDetailsSection: React.FC<PersonalDetailsSectionProps> = ({
  data,
  onEdit,
}) => {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#30409F]">Personal Details</h2>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-sm text-gray-600">Employee ID</label>
          <p className="font-medium">{data.employeeId}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Full Name</label>
          <p className="font-medium">
            {data.firstName} {data.lastName}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Email</label>
          <p className="font-medium">{data.email}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Phone</label>
          <p className="font-medium">{data.phone}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Date of Birth</label>
          <p className="font-medium">
            {new Date(data.dateOfBirth).toLocaleDateString()}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Gender</label>
          <p className="font-medium">{data.gender}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Blood Group</label>
          <p className="font-medium">{data.bloodGroup}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Marital Status</label>
          <p className="font-medium">{data.maritalStatus}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-4">Present Address</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-600">Address Line 1</label>
            <p className="font-medium">{data.presentAddress.addressLine1}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Country</label>
            <p className="font-medium">{data.presentAddress.country}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">State</label>
            <p className="font-medium">{data.presentAddress.state}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">City</label>
            <p className="font-medium">{data.presentAddress.city}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">ZIP Code</label>
            <p className="font-medium">{data.presentAddress.zipCode}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-4">Permanent Address</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-600">Address Line 1</label>
            <p className="font-medium">{data.permanentAddress.addressLine1}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Country</label>
            <p className="font-medium">{data.permanentAddress.country}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">State</label>
            <p className="font-medium">{data.permanentAddress.state}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">City</label>
            <p className="font-medium">{data.permanentAddress.city}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">ZIP Code</label>
            <p className="font-medium">{data.permanentAddress.zipCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

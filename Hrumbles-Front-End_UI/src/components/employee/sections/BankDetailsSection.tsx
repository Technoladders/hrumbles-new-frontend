
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { BankDetails } from "@/services/types/employee.types";

interface BankDetailsSectionProps {
  data: BankDetails;
  onEdit: () => void;
}

export const BankDetailsSection: React.FC<BankDetailsSectionProps> = ({
  data,
  onEdit,
}) => {
  const getFileName = (file: string | File | undefined) => {
    if (!file) return "";
    if (file instanceof File) return file.name;
    return file.split('/').pop() || file;
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#30409F]">Bank Details</h2>
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
          <label className="text-sm text-gray-600">Account Holder Name</label>
          <p className="font-medium">{data.accountHolderName}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Account Number</label>
          <p className="font-medium">{data.accountNumber}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">IFSC Code</label>
          <p className="font-medium">{data.ifscCode}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Bank Name</label>
          <p className="font-medium">{data.bankName}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Branch Name</label>
          <p className="font-medium">{data.branchName}</p>
        </div>
        <div>
          <label className="text-sm text-gray-600">Account Type</label>
          <p className="font-medium">{data.accountType}</p>
        </div>
        {data.bankPhone && (
          <div>
            <label className="text-sm text-gray-600">Bank Phone</label>
            <p className="font-medium">{data.bankPhone}</p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Cancelled Cheque</label>
          {data.cancelledCheque ? (
            <div className="flex items-center gap-2">
              <span className="text-blue-600">{getFileName(data.cancelledCheque)}</span>
            </div>
          ) : (
            <span className="text-gray-400">No document uploaded</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Passbook Copy</label>
          {data.passbookCopy ? (
            <div className="flex items-center gap-2">
              <span className="text-blue-600">{getFileName(data.passbookCopy)}</span>
            </div>
          ) : (
            <span className="text-gray-400">No document uploaded</span>
          )}
        </div>
      </div>
    </div>
  );
};

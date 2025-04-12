import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientDetailsData } from "./types";

interface BudgetFieldProps {
  data: ClientDetailsData;
  onChange: (data: Partial<ClientDetailsData>) => void;
}

const BudgetField = ({ data, onChange }: BudgetFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="clientBudget">Client Budget <span className="text-red-500">*</span></Label>
      <div className="flex">
        <Input
          id="clientBudget"
          placeholder="Enter client budget"
          value={data.clientBudget.replace(" LPA", "")} // Ensure only numeric part is editable
          onChange={(e) => onChange({ clientBudget: `${e.target.value} LPA` })}
          className="rounded-r-none"
        />
        <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-100 text-gray-600 rounded-r-md">
          LPA
        </span>
      </div>
    </div>
  );
};

export default BudgetField;

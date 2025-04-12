
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientDetailsData } from "./types";

interface AssignJobFieldProps {
  data: ClientDetailsData;
  onChange: (data: Partial<ClientDetailsData>) => void;
}

// Mock data for assignable users - in a real app, this would come from an API
const MOCK_USERS = [
  { id: 1, name: "John Smith", role: "Recruiter" },
  { id: 2, name: "Emily Johnson", role: "Hiring Manager" },
  { id: 3, name: "David Clark", role: "HR Specialist" },
  { id: 4, name: "Sarah Wilson", role: "Team Lead" },
];

const AssignJobField = ({ data, onChange }: AssignJobFieldProps) => {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="assignedTo">Assign Job To</Label>
      <Select 
        value={data.assignedTo} 
        onValueChange={(value) => onChange({ assignedTo: value })}
      >
        <SelectTrigger id="assignedTo">
          <SelectValue placeholder="Select a person to assign this job" />
        </SelectTrigger>
        <SelectContent>
          {MOCK_USERS.map(user => (
            <SelectItem key={user.id} value={user.name}>
              {user.name} ({user.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500">
        This person will be responsible for managing this job
      </p>
    </div>
  );
};

export default AssignJobField;


import { LeaveType } from "@/types/leave-types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Pencil, HeartPulse, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface LeaveTypesTableProps {
  leaveTypes: LeaveType[];
  onEdit: (leaveType: LeaveType) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const getLeaveIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('sick')) return <HeartPulse className="h-4 w-4" />;
  return <Briefcase className="h-4 w-4" />;
};

export function LeaveTypesTable({
  leaveTypes,
  onEdit,
  onDelete,
  onToggleActive
}: LeaveTypesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Leave Type</TableHead>
          <TableHead>Annual Allowance</TableHead>
          <TableHead>Monthly Accrual</TableHead>
          <TableHead>Can Carry Forward</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaveTypes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No leave types found
            </TableCell>
          </TableRow>
        ) : (
          leaveTypes.map((leaveType) => (
            <TableRow key={leaveType.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: leaveType.color }}
                  ></div>
                  <div className="flex items-center gap-2">
                    {getLeaveIcon(leaveType.name)}
                    {leaveType.name}
                  </div>
                </div>
              </TableCell>
              <TableCell>{leaveType.annual_allowance} days</TableCell>
              <TableCell>{leaveType.monthly_allowance} days/month</TableCell>
              <TableCell>{leaveType.allow_carryforward ? "Yes" : "No"}</TableCell>
              <TableCell>
                <Switch
                  checked={leaveType.is_active}
                  onCheckedChange={(checked) => onToggleActive(leaveType.id, checked)}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(leaveType)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(leaveType.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

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
import { Briefcase, Pencil, Trash2, CalendarClock, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LeaveTypesTableProps {
  leaveTypes: LeaveType[];
  onEdit: (leaveType: LeaveType) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function LeaveTypesTable({
  leaveTypes,
  onEdit,
  onDelete,
  onToggleActive
}: LeaveTypesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Policy Name</TableHead>
            <TableHead>Allowance / Accrual</TableHead>
            <TableHead>Eligibility</TableHead>
            <TableHead>Settings</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaveTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No leave policies found. Create one to get started.
              </TableCell>
            </TableRow>
          ) : (
            leaveTypes.map((leaveType) => (
              <TableRow key={leaveType.id}>
                {/* Name & Icon */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm"
                      style={{ backgroundColor: leaveType.color }}
                    >
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{leaveType.name}</div>
                      {leaveType.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {leaveType.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Allowance Logic */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {leaveType.annual_allowance} Days / Year
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {leaveType.policy_settings?.accrual_frequency === 'monthly' 
                        ? 'Accrues Monthly' 
                        : 'Given Upfront'}
                    </div>
                  </div>
                </TableCell>

                {/* Eligibility Badges */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {leaveType.gender_eligibility?.map(g => (
                      <Badge key={g} variant="outline" className="text-[10px] px-1 py-0 h-5">
                        {g.substring(0, 1)}
                      </Badge>
                    ))}
                    {leaveType.policy_settings?.probation_period_days > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                        Probation: {leaveType.policy_settings.probation_period_days}d
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Feature Icons */}
                <TableCell>
                  <div className="flex gap-2">
                    {leaveType.policy_settings?.proration && (
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger><Badge variant="outline" className="text-xs">Pro-rated</Badge></TooltipTrigger>
                           <TooltipContent>Calculated based on joining date</TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                    )}
                    {leaveType.policy_settings?.carry_forward_limit > 0 && (
                       <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                         CF: {leaveType.policy_settings.carry_forward_limit}
                       </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Status Switch */}
                <TableCell>
                  <Switch
                    checked={leaveType.is_active}
                    onCheckedChange={(checked) => onToggleActive(leaveType.id, checked)}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(leaveType)}>
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onDelete(leaveType.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
    </div>
  );
}
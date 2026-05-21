// src/components/settings/RevertStatusEmployeeToggle.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Embed this inside the User Management employee table/list, one per row.
// Only visible when hr_organizations.revert_status_enabled === true.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/jobs/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RevertStatusEmployeeToggleProps {
  employeeId: string;
  employeeName: string;
  initialCanRevert: boolean;
  orgRevertEnabled: boolean; // pass hr_organizations.revert_status_enabled
}

const RevertStatusEmployeeToggle: React.FC<RevertStatusEmployeeToggleProps> = ({
  employeeId,
  employeeName,
  initialCanRevert,
  orgRevertEnabled,
}) => {
  const [canRevert, setCanRevert] = useState(initialCanRevert);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!orgRevertEnabled) return; // guard: feature must be on at org level

    setIsSaving(true);
    const { error } = await supabase
      .from('hr_employees')
      .update({ can_revert_status: checked })
      .eq('id', employeeId);

    if (error) {
      toast.error(`Failed to update permission for ${employeeName}.`);
      console.error('[RevertStatusEmployeeToggle]', error);
    } else {
      setCanRevert(checked);
      toast.success(
        checked
          ? `Revert permission granted to ${employeeName}.`
          : `Revert permission removed from ${employeeName}.`
      );
    }
    setIsSaving(false);
  };

  // Feature disabled at org level → show locked state
  if (!orgRevertEnabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 opacity-40 cursor-not-allowed select-none">
              <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
              <Switch checked={false} disabled className="scale-90" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Enable "Revert Status" for this organization first (Global Superadmin).</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <RotateCcw
              className={`h-3.5 w-3.5 ${canRevert ? 'text-amber-500' : 'text-gray-400'}`}
            />
            <Switch
              checked={canRevert}
              onCheckedChange={handleToggle}
              disabled={isSaving}
              className="scale-90 data-[state=checked]:bg-amber-500"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {canRevert
              ? `${employeeName} can revert candidate statuses. Click to remove.`
              : `Grant ${employeeName} the ability to revert candidate statuses.`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RevertStatusEmployeeToggle;
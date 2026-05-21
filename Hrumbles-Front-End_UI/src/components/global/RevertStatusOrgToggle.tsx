// src/components/superadmin/RevertStatusOrgToggle.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop this card into SingleOrganizationDashboard (or wherever the org's
// feature flags are managed in the Global Superadmin view).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RevertStatusOrgToggleProps {
  organizationId: string;
  initialEnabled: boolean;
  organizationName?: string;
}

const RevertStatusOrgToggle: React.FC<RevertStatusOrgToggleProps> = ({
  organizationId,
  initialEnabled,
  organizationName,
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('hr_organizations')
      .update({ revert_status_enabled: checked })
      .eq('id', organizationId);

    if (error) {
      toast.error('Failed to update setting. Please try again.');
      console.error('[RevertStatusOrgToggle]', error);
    } else {
      setEnabled(checked);
      toast.success(
        checked
          ? `Revert Status enabled for ${organizationName ?? 'this organization'}.`
          : `Revert Status disabled for ${organizationName ?? 'this organization'}.`
      );
    }
    setIsSaving(false);
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Left: icon + description */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
          <RotateCcw className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Revert Status</p>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xs">
            Allow designated employees in this organization to undo the latest
            candidate status change. The org superadmin controls which employees
            get this permission.
          </p>
          {enabled && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Active — org superadmin can now assign revert permissions
            </p>
          )}
        </div>
      </div>

      {/* Right: toggle */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Switch
          id={`revert-toggle-${organizationId}`}
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isSaving}
          className="data-[state=checked]:bg-amber-500"
        />
        <Label
          htmlFor={`revert-toggle-${organizationId}`}
          className="text-xs text-gray-400 cursor-pointer"
        >
          {enabled ? 'Enabled' : 'Disabled'}
        </Label>
      </div>
    </div>
  );
};

export default RevertStatusOrgToggle;
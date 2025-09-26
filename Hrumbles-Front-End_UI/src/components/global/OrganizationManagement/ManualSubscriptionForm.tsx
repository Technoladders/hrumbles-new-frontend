// src/components/global/OrganizationManagement/ManualSubscriptionForm.tsx
import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../../integrations/supabase/client'; // Adjust path
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Card is not used directly but may be from your UI kit
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Save, XCircle } from 'lucide-react'; // Added XCircle for clarity in status options
import { DateRangePicker } from 'react-date-range';
import { cn } from '@/lib/utils';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { toast } from 'sonner';

import { // <-- Ensure all Dialog components are imported
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ManualSubscriptionFormProps {
  organizationId: string;
  onUpdateSuccess: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const SUBSCRIPTION_STATUS_OPTIONS = ['trial', 'active', 'inactive', 'expired', 'canceled'];

const ManualSubscriptionForm: FC<ManualSubscriptionFormProps> = ({
  organizationId,
  onUpdateSuccess,
  isOpen,
  onClose,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>('trial');
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [currentTrialStartDate, setCurrentTrialStartDate] = useState<Date | null>(null);
  const [currentTrialEndDate, setCurrentTrialEndDate] = useState<Date | null>(null);
  const [currentTrialExtended, setCurrentTrialExtended] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsFetchingInitialData(false);
      setFormError(null); // Clear errors when closed
      return;
    }
    const fetchCurrentSubscription = async () => {
      setIsFetchingInitialData(true);
      setFormError(null);
      try {
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('subscription_status, subscription_plan, trial_start_date, trial_end_date, trial_extended')
          .eq('id', organizationId)
          .single();

        if (error) throw error;
        if (data) {
          setCurrentStatus(data.subscription_status || 'trial');
          setCurrentPlan(data.subscription_plan || '');
          setCurrentTrialStartDate(data.trial_start_date ? new Date(data.trial_start_date) : null);
          setCurrentTrialEndDate(data.trial_end_date ? new Date(data.trial_end_date) : null);
          setCurrentTrialExtended(data.trial_extended || false);
        }
      } catch (err: any) {
        console.error("Error fetching current subscription details:", err.message);
        setFormError(err.message || "Failed to load current subscription details.");
      } finally {
        setIsFetchingInitialData(false);
      }
    };
    fetchCurrentSubscription();
  }, [organizationId, isOpen]);

  const handleSave = async () => {
    setIsLoading(true);
    setFormError(null);
    try {
      if (!currentStatus) {
        throw new Error("Subscription status is required.");
      }
      if (currentStatus === 'active' && !currentPlan) {
        throw new Error("Subscription plan is required for 'Active' status.");
      }
      if (currentStatus === 'trial' && (!currentTrialStartDate || !currentTrialEndDate)) {
        throw new Error("Trial period dates are required for 'Trial' status.");
      }

      const { error } = await supabase.rpc('update_organization_subscription_details', {
        p_org_id: organizationId,
        p_subscription_status: currentStatus,
        p_subscription_plan: currentPlan || null,
        p_trial_start_date: currentTrialStartDate?.toISOString() || null,
        p_trial_end_date: currentTrialEndDate?.toISOString() || null,
        p_trial_extended: currentTrialExtended,
      });

      if (error) throw error;

      toast.success("Subscription details updated successfully!");
      onUpdateSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error updating subscription details:", err.message);
      setFormError(err.message || "Failed to update subscription details.");
      toast.error("Failed to update subscription details.");
    } finally {
      setIsLoading(false);
    }
  };

  const dateRangeState = [
    {
      startDate: currentTrialStartDate || new Date(),
      endDate: currentTrialEndDate || new Date(),
      key: 'selection',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-6 bg-white rounded-lg shadow-2xl animate-fade-in-up"> {/* Increased width, added styling */}
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Save size={24} className="text-purple-600" /> Manage Subscription
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Manually update trial and subscription details for this organization.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6"> {/* Increased gap, added padding */}
          {isFetchingInitialData ? (
            <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
          ) : (
            <>
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                  <XCircle size={16} /> {formError}
                </div>
              )}

              {/* Subscription Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4"> {/* Responsive grid */}
                <Label htmlFor="status" className="md:text-right text-base font-medium">Status</Label>
                <Select value={currentStatus} onValueChange={setCurrentStatus}>
                  <SelectTrigger id="status" className="md:col-span-3 text-base h-10"> {/* Larger trigger */}
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status} className="text-base">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Plan */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="plan" className="md:text-right text-base font-medium">Plan</Label>
                <Input
                  id="plan"
                  value={currentPlan}
                  onChange={(e) => setCurrentPlan(e.target.value)}
                  placeholder="e.g., Basic, Pro, Enterprise"
                  className="md:col-span-3 h-10 text-base"
                />
              </div>

              {/* Trial Dates */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                <Label htmlFor="trial-dates" className="md:text-right text-base font-medium">Trial Period</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="trial-dates"
                      variant="outline"
                      className={cn(
                        'md:col-span-3 justify-start text-left font-normal h-10 text-base',
                        !currentTrialStartDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentTrialStartDate ? (
                        currentTrialEndDate ? (
                          <>
                            {moment(currentTrialStartDate).format('MMM D, YYYY')} -{' '}
                            {moment(currentTrialEndDate).format('MMM D, YYYY')}
                          </>
                        ) : (
                          moment(currentTrialStartDate).format('MMM D, YYYY')
                        )
                      ) : (
                        <span>Pick trial dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DateRangePicker
                      ranges={dateRangeState}
                      onChange={item => {
                        setCurrentTrialStartDate(item.selection.startDate);
                        setCurrentTrialEndDate(item.selection.endDate);
                      }}
                      showSelectionPreview={true}
                      moveRangeOnFirstSelection={false}
                      months={1}
                      direction="horizontal"
                      className="rounded-lg shadow-xl" // Added styling to date picker
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Trial Extended Checkbox */}
              <div className="flex items-center space-x-3 col-span-full justify-end"> {/* Ensured it's full width */}
                <Checkbox
                  id="trial-extended"
                  checked={currentTrialExtended}
                  onCheckedChange={(checked) => setCurrentTrialExtended(!!checked)}
                  className="h-5 w-5" // Larger checkbox
                />
                <Label htmlFor="trial-extended" className="text-base font-medium leading-none"> {/* Larger label */}
                  Trial Extended (e.g., to 21 days)
                </Label>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="ghost" className="text-base">Cancel</Button> {/* Cancel button */}
          <Button type="submit" onClick={handleSave} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white text-base">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualSubscriptionForm;
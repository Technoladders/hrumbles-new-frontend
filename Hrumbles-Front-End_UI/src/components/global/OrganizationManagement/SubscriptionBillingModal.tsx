import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { addDays, format, addMonths, addYears } from 'date-fns';
import { Loader2, Calculator, Settings2, Users, IndianRupee, CalendarClock } from 'lucide-react';

interface SubscriptionBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
  initialData?: {
    planId?: string | null;
    limits?: {
        admin: number;
        employee: number;
        organization_superadmin: number;
    };
    expiryDate?: string | null;
  };
}

const SubscriptionBillingModal: React.FC<SubscriptionBillingModalProps> = ({ 
  isOpen, onClose, organizationId, onSuccess, initialData
}) => {
  const creatorOrgId = useSelector((state: any) => state.auth.organization_id);
  const creatorUserId = useSelector((state: any) => state.auth.user?.id);

  // --- STATE ---
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  
  // Configuration
  const [pricingMode, setPricingMode] = useState<'standard' | 'role_based'>('standard');
  
  // --- NEW: PERIOD & VALIDITY STATE ---
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  
  // Initialize Start Date (Today)
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Initialize End Date (Prioritize initialData.expiryDate)
  const [endDate, setEndDate] = useState<string>(
    initialData?.expiryDate 
      ? format(new Date(initialData.expiryDate), 'yyyy-MM-dd') 
      : format(addMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  
  // Initialize Limits (Prioritize initialData.limits)
  const [limits, setLimits] = useState({ 
    admin: initialData?.limits?.admin || 0, 
    employee: initialData?.limits?.employee || 0, 
    organization_superadmin: initialData?.limits?.organization_superadmin || 1 
  });

  // Rates
  const [baseRate, setBaseRate] = useState<number>(0);
  const [roleRates, setRoleRates] = useState({ admin: 0, employee: 0, organization_superadmin: 0 });
  
  const [isProcessing, setIsProcessing] = useState(false);

 // --- FETCH PLANS & PRE-FILL ---
  useEffect(() => {
    if (isOpen) {
      const fetchPlansAndInit = async () => {
        const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
        setPlans(data || []);

        if (data && data.length > 0) {
            const currentPlanName = initialData?.planId;
            const matchingPlan = data.find(p => p.name === currentPlanName);

            // 1. Set Plan ID & Rates
            if (matchingPlan) {
                setSelectedPlanId(matchingPlan.id);
                // Set default rates from DB
                setBaseRate(Number(matchingPlan.price_monthly));
                setRoleRates({
                    admin: matchingPlan.role_rates?.admin || 0,
                    employee: matchingPlan.role_rates?.employee || 0,
                    organization_superadmin: matchingPlan.role_rates?.organization_superadmin || 0
                });
            } else {
                // If no plan matches (or it's custom/trial), maybe default to first or keep empty
                // setSelectedPlanId(data[0].id); 
            }

            // 2. Set Limits (The Fix: Explicitly check initialData again here to ensure sync)
            if (initialData?.limits) {
                setLimits({
                    admin: initialData.limits.admin || 0,
                    employee: initialData.limits.employee || 0,
                    organization_superadmin: initialData.limits.organization_superadmin || 0
                });
            } else if (matchingPlan?.limits) {
                // Only fall back to plan defaults if no initialData was provided
                setLimits(matchingPlan.limits);
            }

            // 3. Set Dates
            if (initialData?.expiryDate) {
                 setEndDate(format(new Date(initialData.expiryDate), 'yyyy-MM-dd'));
                 // Optional: Detect if it looks like a yearly/monthly cycle based on difference
                 setBillingCycle('custom'); 
            }
        }
      };
      fetchPlansAndInit();
    }
  }, [isOpen, initialData]); 

  // --- HANDLE PLAN SELECTION (User Manually Changes Dropdown) ---
  const handlePlanSelection = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    // When USER changes the plan, we overwrite limits with the new Plan's defaults
    setLimits(plan.limits || { admin: 0, employee: 0, organization_superadmin: 1 });
    
    setBaseRate(Number(plan.price_monthly) || 0);
    setRoleRates({
        admin: plan.role_rates?.admin || Number(plan.price_monthly) || 0,
        employee: plan.role_rates?.employee || Number(plan.price_monthly) || 0,
        organization_superadmin: plan.role_rates?.organization_superadmin || Number(plan.price_monthly) || 0
    });
  }; 

  // --- HANDLE CYCLE CHANGE ---
  const handleCycleChange = (cycle: 'monthly' | 'quarterly' | 'yearly' | 'custom') => {
    setBillingCycle(cycle);
    const start = new Date(startDate);
    let end = new Date();

    switch (cycle) {
      case 'monthly': end = addMonths(start, 1); break;
      case 'quarterly': end = addMonths(start, 3); break;
      case 'yearly': end = addYears(start, 1); break;
      case 'custom': end = new Date(endDate); break; // Keep existing
    }
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  // --- HANDLE START DATE CHANGE ---
  const handleStartDateChange = (dateStr: string) => {
    setStartDate(dateStr);
    // Recalculate end date based on current cycle
    const start = new Date(dateStr);
    let end = new Date();
    if (billingCycle === 'monthly') end = addMonths(start, 1);
    else if (billingCycle === 'quarterly') end = addMonths(start, 3);
    else if (billingCycle === 'yearly') end = addYears(start, 1);
    else end = new Date(endDate); 
    
    setEndDate(format(end, 'yyyy-MM-dd'));
  }

  // --- CALCULATOR ---
  const calculation = useMemo(() => {
    let monthlySubtotal = 0;
    const totalUsers = (limits.admin || 0) + (limits.employee || 0) + (limits.organization_superadmin || 0);

    // 1. Calculate Monthly Unit Price
    if (pricingMode === 'standard') {
        monthlySubtotal = totalUsers * baseRate;
    } else {
        monthlySubtotal = 
            (limits.admin * roleRates.admin) + 
            (limits.employee * roleRates.employee) + 
            (limits.organization_superadmin * roleRates.organization_superadmin);
    }

    // 2. Apply Multiplier based on Cycle
    let multiplier = 1; // Monthly
    if (billingCycle === 'quarterly') multiplier = 3;
    if (billingCycle === 'yearly') multiplier = 12;

    const subtotal = monthlySubtotal * multiplier;
    const taxRate = 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    return { totalUsers, monthlySubtotal, subtotal, taxAmount, total, multiplier };
  }, [pricingMode, limits, baseRate, roleRates, billingCycle]);

  // --- SUBMIT ---
  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const planName = plans.find(p => p.id === selectedPlanId)?.name || 'Custom Plan';
      
      // Fetch Client Name
      const { data: orgData } = await supabase.from('hr_organizations').select('name').eq('id', organizationId).single();

      // 1. Prepare Configuration Payload
      const subscriptionConfig = {
        plan_name: planName,
        limits: limits,
        period: {
            cycle: billingCycle,
            start_date: new Date(startDate).toISOString(),
            end_date: new Date(endDate).toISOString(),
            duration_months: calculation.multiplier
        },
        pricing_details: {
            mode: pricingMode,
            base_rates: pricingMode === 'standard' ? { base: baseRate } : roleRates
        }
      };

   // 2. Generate Invoice Items
      let invoiceItems = [];
      const periodText = `(${billingCycle.toUpperCase()})\nValidity: ${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`;

      if (pricingMode === 'standard') {
        // Option A: Standard Pricing -> Show Total Users as Quantity
        invoiceItems.push({
            id: '1', 
            description: `${planName} Subscription ${periodText}`,
            quantity: calculation.totalUsers, 
            rate: baseRate * calculation.multiplier, 
            amount: calculation.subtotal 
        });
      } else {
        // Option B: Role-Based Pricing
        if (limits.organization_superadmin > 0) {
            invoiceItems.push({
                id: 'sa',
                description: `Super Admin Licenses ${periodText}`,
                quantity: limits.organization_superadmin,
                rate: roleRates.organization_superadmin * calculation.multiplier,
                amount: (limits.organization_superadmin * roleRates.organization_superadmin * calculation.multiplier)
            });
        }
        if (limits.admin > 0) {
            invoiceItems.push({
                id: 'ad',
                description: `Admin Licenses ${periodText}`,
                quantity: limits.admin,
                rate: roleRates.admin * calculation.multiplier,
                amount: (limits.admin * roleRates.admin * calculation.multiplier)
            });
        }
        if (limits.employee > 0) {
            invoiceItems.push({
                id: 'em',
                description: `Employee Licenses ${periodText}`,
                quantity: limits.employee,
                rate: roleRates.employee * calculation.multiplier,
                amount: (limits.employee * roleRates.employee * calculation.multiplier)
            });
        }
      }

      // 3. Create Invoice
      const invoicePayload = {
          invoice_number: `INV-${format(new Date(), 'yyyy')}-${Math.floor(1000 + Math.random() * 9000)}`,
          organization_client_id: organizationId,
          client_name: orgData?.name || 'Client',
          organization_id: creatorOrgId,
          created_by: creatorUserId,
          invoice_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
          status: calculation.total > 0 ? 'Draft' : 'Paid',
          currency: 'INR',
          subtotal: calculation.subtotal,
          tax_rate: 18,
          tax_amount: calculation.taxAmount,
          total_amount: calculation.total,
          type: 'Organization',
          items: invoiceItems,
          subscription_config: subscriptionConfig 
      };

      const { error: invError } = await supabase.from('hr_invoices').insert([invoicePayload]);
      if (invError) throw invError;

      // 4. Handle Free Plan
      if (calculation.total === 0) {
           await supabase.from('hr_organizations').update({
               subscription_status: 'trial',
               subscription_plan: planName,
               role_credit_limits: limits,
               trial_start_date: new Date(startDate).toISOString(),
               trial_end_date: new Date(endDate).toISOString(),
               subscription_expires_at: new Date(endDate).toISOString()
           }).eq('id', organizationId);
           toast.success("Free plan applied immediately.");
      } else {
           toast.success("Invoice generated. Plan activates upon payment.");
      }

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-purple-600" />
            Configure Subscription Validity
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
            {/* LEFT: SELECTION */}
            <div className="md:col-span-4 space-y-5 border-r pr-4">
                <div>
                  <Label>Plan</Label>
                  <Select value={selectedPlanId} onValueChange={handlePlanSelection}>
                      <SelectTrigger><SelectValue placeholder="Select Plan" /></SelectTrigger>
                      <SelectContent>
                          {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4"/> Validity Period
                    </h3>
                    
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs text-purple-700">Billing Cycle</Label>
                            <Select value={billingCycle} onValueChange={(v:any) => handleCycleChange(v)}>
                                <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly (30 Days)</SelectItem>
                                    <SelectItem value="quarterly">Quarterly (3 Months)</SelectItem>
                                    <SelectItem value="yearly">Yearly (12 Months)</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs text-purple-700">Start Date</Label>
                                <Input type="date" className="h-8 bg-white" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs text-purple-700">Expiry Date</Label>
                                <Input type="date" className="h-8 bg-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <Label>Pricing Model</Label>
                    <Tabs value={pricingMode} onValueChange={(v:any) => setPricingMode(v)} className="w-full mt-1">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="standard">Standard</TabsTrigger>
                            <TabsTrigger value="role_based">Role Based</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* RIGHT: CONFIG & SUMMARY */}
            <div className="md:col-span-8 space-y-6">
                 {/* LIMITS SECTION */}
                 <div className="bg-white p-4 border rounded shadow-sm">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4"/> License Quantities</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div><Label className="text-xs">Employees</Label><Input type="number" value={limits.employee} onChange={e => setLimits({...limits, employee: Number(e.target.value)})} /></div>
                        <div><Label className="text-xs">Admins</Label><Input type="number" value={limits.admin} onChange={e => setLimits({...limits, admin: Number(e.target.value)})} /></div>
                        <div><Label className="text-xs">Super Admins</Label><Input type="number" value={limits.organization_superadmin} onChange={e => setLimits({...limits, organization_superadmin: Number(e.target.value)})} /></div>
                    </div>
                </div>

                {/* PRICING SECTION */}
                <div className="bg-white p-4 border rounded shadow-sm">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><IndianRupee className="h-4 w-4"/> 
                        {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Unit Price
                    </h3>
                    {pricingMode === 'standard' ? (
                        <div><Label className="text-xs">Price per User</Label><Input type="number" value={baseRate} onChange={e => setBaseRate(Number(e.target.value))} /></div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label className="text-xs">Per Employee</Label><Input type="number" value={roleRates.employee} onChange={e => setRoleRates({...roleRates, employee: Number(e.target.value)})} /></div>
                            <div><Label className="text-xs">Per Admin</Label><Input type="number" value={roleRates.admin} onChange={e => setRoleRates({...roleRates, admin: Number(e.target.value)})} /></div>
                            <div><Label className="text-xs">Per SuperAdmin</Label><Input type="number" value={roleRates.organization_superadmin} onChange={e => setRoleRates({...roleRates, organization_superadmin: Number(e.target.value)})} /></div>
                        </div>
                    )}
                </div>

                {/* SUMMARY */}
                <div className="bg-slate-50 p-4 rounded border">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Total Licenses:</span><strong>{calculation.totalUsers} Users</strong>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                        <span>Monthly Cost:</span><span>₹{calculation.monthlySubtotal.toLocaleString()}</span>
                    </div>
                    {calculation.multiplier > 1 && (
                         <div className="flex justify-between text-sm text-green-600">
                            <span>Cycle Multiplier ({billingCycle}):</span><span>x {calculation.multiplier}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm mt-2">
                        <span>Subtotal:</span><span>₹{calculation.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Tax (18%):</span><span>₹{calculation.taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-purple-700 mt-2">
                        <span>Total Invoice:</span><span>₹{calculation.total.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-4">
             <Button variant="outline" onClick={onClose}>Cancel</Button>
             <Button onClick={handleSave} disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700">
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Confirm
             </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionBillingModal;



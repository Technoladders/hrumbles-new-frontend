import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
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
import { Loader2, Settings2, Users, IndianRupee, CalendarClock, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// --- HELPERS (FY Logic) ---
const getFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const startYear = month <= 3 ? year - 1 : year;
  const endYear = (startYear + 1).toString().slice(-2);
  return `${startYear.toString().slice(-2)}-${endYear}`;
};

const generateFYInvoiceNumber = async (orgId: string) => {
  const fy = getFinancialYear();
  const prefix = `x.ai/${fy}/`;
  const { data } = await supabase.from('hr_invoices').select('invoice_number').eq('organization_id', orgId).like('invoice_number', `${prefix}%`).order('invoice_number', { ascending: false }).limit(1);
  let nextNumber = "001";
  if (data && data.length > 0) {
    const parts = data[0].invoice_number.split('/');
    const lastNum = parts[parts.length - 1];
    nextNumber = (parseInt(lastNum) + 1).toString().padStart(3, '0');
  }
  return `${prefix}${nextNumber}`;
};

const SubscriptionBillingModal: React.FC<any> = ({ isOpen, onClose, organizationId, onSuccess, initialData }) => {
  const creatorOrgId = useSelector((state: any) => state.auth.organization_id);
  const creatorUserId = useSelector((state: any) => state.auth.user?.id);

  // --- STATE ---
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [taxMaster, setTaxMaster] = useState<{ tds: any[], tcs: any[] }>({ tds: [], tcs: [] });
  const [billerProfile, setBillerProfile] = useState<any>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);

    // NEW: Payment Terms State
  const [invoiceDate, setInvoiceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [paymentTerms, setPaymentTerms] = useState<string>('NET 30');
  
  const [pricingMode, setPricingMode] = useState<'standard' | 'role_based'>('standard');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(initialData?.expiryDate ? format(new Date(initialData.expiryDate), 'yyyy-MM-dd') : format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [limits, setLimits] = useState({ admin: initialData?.limits?.admin || 0, employee: initialData?.limits?.employee || 0, organization_superadmin: initialData?.limits?.organization_superadmin || 1 });
  const [baseRate, setBaseRate] = useState<number>(0);
  const [roleRates, setRoleRates] = useState({ admin: 0, employee: 0, organization_superadmin: 0 });
  const [taxMode, setTaxMode] = useState<'GST' | 'IGST'>('GST');
  
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'TDS' | 'TCS'>('none');
  const [adjustmentRateId, setAdjustmentRateId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        const { data: pData } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
        setPlans(pData || []);
        
        const { data: bProf } = await supabase.from('hr_organization_profile').select('*').eq('organization_id', creatorOrgId).single();
        setBillerProfile(bProf);
        
        const { data: cProf } = await supabase.from('hr_organization_profile').select('*').eq('organization_id', organizationId).single();
        setClientProfile(cProf);

        const { data: taxes } = await supabase.from('hr_tax_master').select('*').eq('is_active', true);
        if (taxes) {
            setTaxMaster({ tds: taxes.filter(t => t.type === 'TDS'), tcs: taxes.filter(t => t.type === 'TCS') });
        }

        if (bProf && cProf) {
            setTaxMode(bProf.state?.toLowerCase() === cProf.state?.toLowerCase() ? 'GST' : 'IGST');
        }
      };
      init();
    }
  }, [isOpen, organizationId, creatorOrgId]);

  // Handle Plan Loading Defaults
  useEffect(() => {
    if (isOpen && plans.length > 0 && initialData?.planId) {
        const matchingPlan = plans.find(p => p.name === initialData.planId);
        if (matchingPlan) {
            setSelectedPlanId(matchingPlan.id);
            setBaseRate(Number(matchingPlan.price_monthly));
            setRoleRates(matchingPlan.role_rates || { admin: 0, employee: 0, organization_superadmin: 0 });
        }
    }
  }, [isOpen, plans, initialData]);

  // --- CALCULATOR ---
  const calc = useMemo(() => {
    let monthlySubtotal = 0;
    const totalUsers = (limits.admin || 0) + (limits.employee || 0) + (limits.organization_superadmin || 0);
    if (pricingMode === 'standard') monthlySubtotal = totalUsers * baseRate;
    else monthlySubtotal = (limits.admin * roleRates.admin) + (limits.employee * roleRates.employee) + (limits.organization_superadmin * roleRates.organization_superadmin);

    const multiplier = billingCycle === 'yearly' ? 12 : billingCycle === 'quarterly' ? 3 : 1;
    const subtotal = monthlySubtotal * multiplier;
    const taxPercentage = 18; // Standard SaaS Tax
    const taxAmount = (subtotal * taxPercentage) / 100;
    
    const adjRate = [...taxMaster.tds, ...taxMaster.tcs].find(t => t.id === adjustmentRateId)?.value || 0;
    const adjValue = (subtotal * adjRate) / 100;

    return {
      totalUsers,
      subtotal,
      taxAmount,
      taxPercentage,
      adjustment: adjValue,
      multiplier,
      grandTotal: subtotal + taxAmount + (adjustmentType === 'TCS' ? adjValue : adjustmentType === 'TDS' ? -adjValue : 0)
    };
  }, [pricingMode, limits, baseRate, roleRates, billingCycle, adjustmentType, adjustmentRateId, taxMaster]);

  // --- SUBMIT ---
  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const planName = plans.find(p => p.id === selectedPlanId)?.name || 'Custom Plan';
      const invNum = await generateFYInvoiceNumber(creatorOrgId);

            // CALCULATION: Invoice Due Date based on chosen Invoice Date + Terms
      const baseInvDate = new Date(invoiceDate);
      let invoiceDueDate = baseInvDate;

      if (paymentTerms === 'Due on Receipt') {
          invoiceDueDate = baseInvDate;
      } else if (paymentTerms === 'custom') {
          invoiceDueDate = addDays(baseInvDate, 7); // Default custom offset
      } else {
          const days = parseInt(paymentTerms.replace('NET ', '')) || 0;
          invoiceDueDate = addDays(baseInvDate, days);
      }
      
      const subscriptionConfig = {
        plan_name: planName,
        limits: limits,
        period: { cycle: billingCycle, start_date: new Date(startDate).toISOString(), end_date: new Date(endDate).toISOString(), duration_months: calc.multiplier }
      };

      // Item Level Formatting
      const periodText = `Validity: ${format(new Date(startDate), 'dd MMM yy')} - ${format(new Date(endDate), 'dd MMM yy')}`;
      const items = [{
        id: '1',
        title: `${planName} Subscription`,
        description: `${billingCycle.toUpperCase()} Plan. ${periodText}`,
        quantity: pricingMode === 'standard' ? calc.totalUsers : 1,
        rate: pricingMode === 'standard' ? (baseRate * calc.multiplier) : calc.subtotal,
        amount: calc.subtotal,
        tax_percentage: calc.taxPercentage,
        tax_value: calc.taxAmount,
        total_amount: calc.subtotal + calc.taxAmount
      }];

      const payload = {
        invoice_number: invNum,
        organization_client_id: organizationId,
        client_name: clientProfile?.company_name || 'Client',
        organization_id: creatorOrgId,
        created_by: creatorUserId,
        invoice_date: invoiceDate,
        due_date: format(invoiceDueDate, 'yyyy-MM-dd'),
        status: calc.grandTotal > 0 ? 'Draft' : 'Paid',
        items,
        subtotal: calc.subtotal,
        tax_amount: calc.taxAmount,
        total_amount: calc.grandTotal,
        tax_applicable: true,
        tax_mode: taxMode,
       payment_terms: paymentTerms,
        subscription_config: subscriptionConfig,
        tds_amount: adjustmentType === 'TDS' ? calc.adjustment : 0,
        tcs_amount: adjustmentType === 'TCS' ? calc.adjustment : 0,
        tds_rate_id: adjustmentType === 'TDS' ? adjustmentRateId : null,
        tcs_rate_id: adjustmentType === 'TCS' ? adjustmentRateId : null,
        type: 'Organization'
      };

      const { error } = await supabase.from('hr_invoices').insert([payload]);
      if (error) throw error;

      if (calc.grandTotal === 0) {
        // Auto-activate free/trial plans
        await supabase.from('hr_organizations').update({
            subscription_status: 'active',
            subscription_plan: planName,
            role_credit_limits: limits,
            subscription_start_date: new Date(startDate).toISOString(),
            subscription_expires_at: new Date(endDate).toISOString()
        }).eq('id', organizationId);
      }

      toast.success("Subscription invoice generated successfully.");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-purple-600" /> Subscription Billing Configuration</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
            {/* LEFT SIDE: CONFIG */}
            <div className="md:col-span-5 space-y-6 border-r pr-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Select Plan</Label>
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger><SelectValue placeholder="Select Plan" /></SelectTrigger>
                        <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

<div className="bg-slate-50 p-4 rounded-xl border space-y-4 shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Validity & Payment</Label>
                    
                    <div className="grid grid-cols-2 gap-2">
                        {/* SELECTABLE INVOICE DATE */}
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400">INVOICE DATE</span>
                            <Input 
                                type="date" 
                                className="h-8 text-xs bg-white border-slate-200" 
                                value={invoiceDate} 
                                onChange={e => setInvoiceDate(e.target.value)} 
                            />
                        </div>

                        {/* PAYMENT TERMS */}
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400">PAYMENT TERMS</span>
                            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                                <SelectTrigger className="bg-white h-8 text-xs font-semibold border-purple-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                                    <SelectItem value="NET 15">NET 15</SelectItem>
                                    <SelectItem value="NET 30">NET 30</SelectItem>
                                    <SelectItem value="NET 45">NET 45</SelectItem>
                                    <SelectItem value="NET 60">NET 60</SelectItem>
                                    <SelectItem value="NET 90">NET 90</SelectItem>
                                    <SelectItem value="custom">Custom (7 Days)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    </div>

                    <Separator className="bg-slate-200"/>

                <div className="bg-slate-50 p-4 rounded-xl border space-y-4">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Validity & Cycle</Label>
                    <Select value={billingCycle} onValueChange={(v:any) => setBillingCycle(v)}>
                        <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><span className="text-[9px] font-bold text-slate-400">START</span><Input type="date" className="h-8 text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                        <div className="space-y-1"><span className="text-[9px] font-bold text-slate-400">EXPIRY</span><Input type="date" className="h-8 text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Pricing Model</Label>
                    <Tabs value={pricingMode} onValueChange={(v:any) => setPricingMode(v)} className="w-full">
                        <TabsList className="w-full grid grid-cols-2"><TabsTrigger value="standard">Standard</TabsTrigger><TabsTrigger value="role_based">By Role</TabsTrigger></TabsList>
                    </Tabs>
                </div>
            </div>

            {/* RIGHT SIDE: CALCULATION */}
            <div className="md:col-span-7 space-y-6">
                <div className="bg-white p-4 border rounded-xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold flex items-center gap-2"><Users className="h-4 w-4 text-slate-400"/> Licenses & Unit Rates</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1"><Label className="text-[10px]">SuperAdmin</Label><Input type="number" className="h-8" value={limits.organization_superadmin} onChange={e => setLimits({...limits, organization_superadmin: Number(e.target.value)})} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Admins</Label><Input type="number" className="h-8" value={limits.admin} onChange={e => setLimits({...limits, admin: Number(e.target.value)})} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Employees</Label><Input type="number" className="h-8" value={limits.employee} onChange={e => setLimits({...limits, employee: Number(e.target.value)})} /></div>
                    </div>
                    {pricingMode === 'standard' ? (
                        <div className="pt-2 border-t"><Label className="text-[10px]">Base Rate (per user/mo)</Label><Input type="number" className="h-8" value={baseRate} onChange={e => setBaseRate(Number(e.target.value))} /></div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                            <div className="space-y-1"><Label className="text-[10px]">Rate (SA)</Label><Input type="number" className="h-8" value={roleRates.organization_superadmin} onChange={e => setRoleRates({...roleRates, organization_superadmin: Number(e.target.value)})} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Rate (Admin)</Label><Input type="number" className="h-8" value={roleRates.admin} onChange={e => setRoleRates({...roleRates, admin: Number(e.target.value)})} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Rate (Emp)</Label><Input type="number" className="h-8" value={roleRates.employee} onChange={e => setRoleRates({...roleRates, employee: Number(e.target.value)})} /></div>
                        </div>
                    )}
                </div>

                {/* ZOHO STYLE TOTALS BOX */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between text-xs text-slate-400"><span>Sub Total</span><span className="font-bold text-white">₹{calc.subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs text-slate-400 italic"><span>Tax (GST 18%)</span><span className="text-white font-bold">₹{calc.taxAmount.toLocaleString()}</span></div>
                    
                    <div className="border-y border-slate-800 py-3 my-2 space-y-3">
                        <RadioGroup value={adjustmentType} onValueChange={(v: any) => { setAdjustmentType(v); setAdjustmentRateId(''); }} className="flex gap-4">
                            <div className="flex items-center space-x-1"><RadioGroupItem value="none" id="s0" className="border-slate-600"/><Label htmlFor="s0" className="text-[10px]">None</Label></div>
                            <div className="flex items-center space-x-1"><RadioGroupItem value="TDS" id="s1" className="border-slate-600"/><Label htmlFor="s1" className="text-[10px]">TDS (-)</Label></div>
                            <div className="flex items-center space-x-1"><RadioGroupItem value="TCS" id="s2" className="border-slate-600"/><Label htmlFor="s2" className="text-[10px]">TCS (+)</Label></div>
                        </RadioGroup>
                        {adjustmentType !== 'none' && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <Select value={adjustmentRateId} onValueChange={setAdjustmentRateId}>
                                    <SelectTrigger className="h-7 text-[10px] bg-slate-800 border-slate-700"><SelectValue placeholder="Select Rate..." /></SelectTrigger>
                                    <SelectContent>{(adjustmentType === 'TDS' ? taxMaster.tds : taxMaster.tcs).map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                                </Select>
                                <span className={`text-xs font-bold ${adjustmentType === 'TDS' ? 'text-red-400' : 'text-green-400'}`}>₹{calc.adjustment.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-purple-400 tracking-tighter">Payable Amount</span><span className="text-[8px] text-slate-500">{taxMode} Applied</span></div>
                        <span className="text-3xl font-black">₹{calc.grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
             <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Cancel</Button>
             <Button onClick={handleSave} disabled={isProcessing || !selectedPlanId} className="bg-purple-600 hover:bg-purple-700 px-10">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Generate Invoice & Activate"}
             </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionBillingModal;
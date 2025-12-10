import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, TrendingUp, AlertCircle } from "lucide-react";
import DynamicEarningsDeductions from '../DynamicEarningsEmployee'; // Reusing your existing component
import { useSelector } from "react-redux";
import { Separator } from "@/components/ui/separator";

interface CustomItem {
  id?: string;
  name: string;
  amount: number;
}

interface SalaryStructure {
  id?: string;
  employee_id: string;
  ctc: number;
  basic_salary: number;
  hra: number;
  lta: number;
  fixed_allowance: number;
  gratuity_enabled: boolean;
  gratuity_percentage: number;
  gratuity_amount: number;
  provident_fund: number;
  professional_tax: number;
  income_tax: number;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployee: { id: string; employee_id: string; first_name: string; last_name: string; position?: string } | null;
}

const EmployeeSalaryStructureDrawer = ({ isOpen, onOpenChange, selectedEmployee }: Props) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [loading, setLoading] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // --- State for Hike Logic ---
  const [currentCtcSnapshot, setCurrentCtcSnapshot] = useState<number>(0); // The CTC before editing
  const [hikePercentage, setHikePercentage] = useState<string>("0");
  
  // --- Main Structure State ---
  const [structure, setStructure] = useState<SalaryStructure>({
    employee_id: "",
    ctc: 0,
    basic_salary: 0,
    hra: 0,
    lta: 0,
    fixed_allowance: 0,
    gratuity_enabled: false,
    gratuity_percentage: 4.81,
    gratuity_amount: 0,
    provident_fund: 0,
    professional_tax: 0,
    income_tax: 0,
  });

  const [customEarnings, setCustomEarnings] = useState<CustomItem[]>([]);
  const [customDeductions, setCustomDeductions] = useState<CustomItem[]>([]);

  // Initialize
  useEffect(() => {
    if (isOpen && selectedEmployee) {
      fetchStructure();
    }
  }, [isOpen, selectedEmployee]);

  const fetchStructure = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_salary_structures")
        .select("*")
        .eq("employee_id", selectedEmployee.employee_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Load existing
        setIsNewRecord(false);
        setStructure({
          id: data.id,
          employee_id: data.employee_id,
          ctc: Number(data.ctc),
          basic_salary: Number(data.basic_salary),
          hra: Number(data.hra),
          lta: Number(data.lta),
          fixed_allowance: Number(data.fixed_allowance),
          gratuity_enabled: data.gratuity_enabled,
          gratuity_percentage: Number(data.gratuity_percentage),
          gratuity_amount: Number(data.gratuity_amount),
          provident_fund: Number(data.provident_fund),
          professional_tax: Number(data.professional_tax),
          income_tax: Number(data.income_tax),
        });
        setCurrentCtcSnapshot(Number(data.ctc));

        // Fetch Custom Items
        const { data: customData } = await supabase
            .from("salary_structure_custom_items")
            .select("*")
            .eq("structure_id", data.id);
            
        if (customData) {
            setCustomEarnings(customData.filter(i => i.type === 'earning').map(i => ({ name: i.name, amount: Number(i.amount) })));
            setCustomDeductions(customData.filter(i => i.type === 'deduction').map(i => ({ name: i.name, amount: Number(i.amount) })));
        }

      } else {
        // New Structure
        setIsNewRecord(true);
        setStructure(prev => ({ ...prev, employee_id: selectedEmployee.employee_id }));
        setCurrentCtcSnapshot(0);
        setHikePercentage("0");
      }
    } catch (error: any) {
      toast.error("Error loading structure: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Hike & CTC Logic ---

  const handleHikeChange = (val: string) => {
    setHikePercentage(val);
    const percentage = parseFloat(val);
    
    if (!isNaN(percentage) && currentCtcSnapshot > 0) {
      const increase = currentCtcSnapshot * (percentage / 100);
      const newCtc = currentCtcSnapshot + increase;
      setStructure(prev => ({ ...prev, ctc: Number(newCtc.toFixed(2)) }));
    }
  };

  // Add this function near handleHikeChange
const handleCurrentCtcChange = (val: string) => {
  const newVal = parseFloat(val) || 0;
  setCurrentCtcSnapshot(newVal);

  // If we have a Hike % entered, auto-update the New CTC based on this new baseline
  const hike = parseFloat(hikePercentage) || 0;
  if (hike > 0) {
    const increase = newVal * (hike / 100);
    setStructure(prev => ({ ...prev, ctc: Number((newVal + increase).toFixed(2)) }));
  } else {
    // If no hike yet, usually for a new employee, New CTC = Current CTC initially
    setStructure(prev => ({ ...prev, ctc: newVal }));
  }
};

  const handleCtcChange = (val: string) => {
    const newCtc = parseFloat(val) || 0;
    setStructure(prev => ({ ...prev, ctc: newCtc }));

    // Reverse Calculate Hike %
    if (currentCtcSnapshot > 0) {
      const diff = newCtc - currentCtcSnapshot;
      const perc = (diff / currentCtcSnapshot) * 100;
      setHikePercentage(perc.toFixed(2));
    }
  };

  // --- Field Handlers ---

  const handleChange = (field: keyof SalaryStructure, value: any) => {
    const numVal = typeof value === 'string' ? (parseFloat(value) || 0) : value;
    
    setStructure(prev => {
        const updated = { ...prev, [field]: numVal };
        
        // Auto-calc gratuity amount if enabled and percentage changes or is enabled
        if (field === 'gratuity_percentage' || field === 'gratuity_enabled') {
             if (updated.gratuity_enabled && updated.basic_salary > 0) {
                 updated.gratuity_amount = Number((updated.basic_salary * (updated.gratuity_percentage / 100)).toFixed(2));
             } else if (!updated.gratuity_enabled) {
                 updated.gratuity_amount = 0;
             }
        }
        
        // Auto-calc gratuity if Basic Salary changes manually
        if (field === 'basic_salary' && updated.gratuity_enabled) {
            updated.gratuity_amount = Number((numVal * (updated.gratuity_percentage / 100)).toFixed(2));
        }

        return updated;
    });
  };

  const handleCustomEarningsChange = (items: CustomItem[]) => setCustomEarnings(items);
  const handleCustomDeductionsChange = (items: CustomItem[]) => setCustomDeductions(items);

  // --- Calculations ---

  const calculateTotals = () => {
    const totalCustomEarnings = customEarnings.reduce((s, i) => s + (i.amount || 0), 0);
    const totalCustomDeductions = customDeductions.reduce((s, i) => s + (i.amount || 0), 0);

    // Sum of all earning components (Monthly components)
    // Note: CTC usually includes Gratuity. 
    // Gross Earnings (Take home eligible) usually excludes Gratuity.
    const monthlyGross = 
        structure.basic_salary + 
        structure.hra + 
        structure.lta + 
        structure.fixed_allowance + 
        totalCustomEarnings;

    const totalDeductions = 
        structure.provident_fund + 
        structure.professional_tax + 
        structure.income_tax + 
        totalCustomDeductions;

    // Derived Annual Value based on components entered
    // Formula: (Monthly Gross * 12) + (Gratuity Amount if enabled)
    // This is to compare against the Target CTC entered in Hike section
    const derivedAnnualCtc = (monthlyGross * 12) + (structure.gratuity_enabled ? structure.gratuity_amount : 0);

    return {
        monthlyGross,
        totalDeductions,
        netPay: monthlyGross - totalDeductions,
        derivedAnnualCtc
    };
  };

  const totals = calculateTotals();
  const ctcDifference = structure.ctc - totals.derivedAnnualCtc;

  // --- Save ---

  const handleSave = async () => {
    setLoading(true);
    try {
        // 1. Upsert Structure
        const { data: savedStructure, error: structError } = await supabase
            .from("employee_salary_structures")
            .upsert({
                employee_id: selectedEmployee!.employee_id,
                organization_id: organization_id,
                ctc: structure.ctc,
                basic_salary: structure.basic_salary,
                hra: structure.hra,
                lta: structure.lta,
                fixed_allowance: structure.fixed_allowance,
                gratuity_enabled: structure.gratuity_enabled,
                gratuity_percentage: structure.gratuity_percentage,
                gratuity_amount: structure.gratuity_amount,
                provident_fund: structure.provident_fund,
                professional_tax: structure.professional_tax,
                income_tax: structure.income_tax,
                updated_at: new Date().toISOString()
            }, { onConflict: 'employee_id' })
            .select()
            .single();

        if (structError) throw structError;

        // 2. Handle Custom Items (Delete old, Insert new)
        await supabase.from("salary_structure_custom_items").delete().eq("structure_id", savedStructure.id);
        
        const customItemsToInsert = [
            ...customEarnings.map(i => ({ structure_id: savedStructure.id, name: i.name, amount: i.amount, type: 'earning' })),
            ...customDeductions.map(i => ({ structure_id: savedStructure.id, name: i.name, amount: i.amount, type: 'deduction' }))
        ];

        if (customItemsToInsert.length > 0) {
            const { error: customError } = await supabase.from("salary_structure_custom_items").insert(customItemsToInsert);
            if (customError) throw customError;
        }

        // 3. Log Hike History if CTC changed significantly
        if (currentCtcSnapshot > 0 && Math.abs(structure.ctc - currentCtcSnapshot) > 1) {
             await supabase.from("salary_hike_history").insert({
                 employee_id: selectedEmployee!.employee_id,
                 previous_ctc: currentCtcSnapshot,
                 new_ctc: structure.ctc,
                 hike_percentage: parseFloat(hikePercentage) || 0
             });
        }

        toast.success("Salary Structure Updated Successfully");
        onOpenChange(false);

    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  };

  if (!selectedEmployee) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Salary Structure & Hike Manager</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Define breakdown for {selectedEmployee.first_name} {selectedEmployee.last_name}
          </p>
        </SheetHeader>

        <div className="space-y-6">
            
            {/* --- Appraisal / Hike Section --- */}
            <Card className="p-4 bg-amber-50/50 border-amber-200">
                <div className="flex items-center gap-2 mb-3 text-amber-800">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="font-semibold">Appraisal & CTC</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
    <Label className="text-muted-foreground">
        {isNewRecord ? "Current / Starting CTC" : "Current CTC"}
    </Label>
    <Input 
        type="number"
        value={currentCtcSnapshot} 
        onChange={(e) => handleCurrentCtcChange(e.target.value)}
        disabled={!isNewRecord} // <--- Only disabled if record exists in DB
        className={!isNewRecord ? "bg-gray-100" : "bg-white border-amber-300"} 
    />
</div>
                    <div className="space-y-1">
                        <Label className="text-amber-700">Hike Percentage (%)</Label>
                        <Input 
                            type="number" 
                            step="0.1"
                            value={hikePercentage}
                            onChange={(e) => handleHikeChange(e.target.value)}
                            className="border-amber-300 focus:ring-amber-400"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-semibold">New Annual CTC</Label>
                        <Input 
                            type="number" 
                            value={structure.ctc}
                            onChange={(e) => handleCtcChange(e.target.value)}
                            className="font-bold border-amber-300"
                        />
                    </div>
                </div>
                {Math.abs(ctcDifference) > 10 && (
                     <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-100 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                            Breakdown Mismatch: The sum of components ({totals.derivedAnnualCtc.toLocaleString('en-IN')}) 
                            is <strong>{Math.abs(ctcDifference).toLocaleString('en-IN')} {ctcDifference > 0 ? 'less' : 'more'}</strong> than the New CTC. 
                            Please adjust earnings below manually.
                        </span>
                     </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- Earnings --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Monthly Earnings</h3>
                    </div>
                    <Card className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Basic Salary</Label>
                            <Input 
                                type="number" 
                                value={structure.basic_salary} 
                                onChange={(e) => handleChange('basic_salary', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>House Rent Allowance (HRA)</Label>
                            <Input 
                                type="number" 
                                value={structure.hra} 
                                onChange={(e) => handleChange('hra', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Leave Travel Allowance (LTA)</Label>
                            <Input 
                                type="number" 
                                value={structure.lta} 
                                onChange={(e) => handleChange('lta', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fixed Allowance</Label>
                            <Input 
                                type="number" 
                                value={structure.fixed_allowance} 
                                onChange={(e) => handleChange('fixed_allowance', e.target.value)} 
                            />
                        </div>
                        
                        <Separator />
                        
                        {/* Gratuity Config */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="gratuity" 
                                    checked={structure.gratuity_enabled}
                                    onCheckedChange={(c) => handleChange('gratuity_enabled', c)}
                                />
                                <Label htmlFor="gratuity">Gratuity Eligible?</Label>
                            </div>
                            {structure.gratuity_enabled && (
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <Label className="text-xs">Rate (%)</Label>
                                        <Input 
                                            value={structure.gratuity_percentage} 
                                            onChange={(e) => handleChange('gratuity_percentage', e.target.value)} 
                                        />
                                    </div>
                                    <div className="w-2/3">
                                        <Label className="text-xs">Annual Amount</Label>
                                        <Input 
                                            value={structure.gratuity_amount} 
                                            readOnly 
                                            className="bg-gray-100" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <DynamicEarningsDeductions 
                            title="Custom Earnings" 
                            type="earnings" 
                            items={customEarnings} 
                            onChange={handleCustomEarningsChange} 
                        />
                    </Card>
                </div>

                {/* --- Deductions --- */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Monthly Deductions</h3>
                    <Card className="p-4 space-y-4">
                         <div className="space-y-2">
                            <Label>Provident Fund (PF)</Label>
                            <Input 
                                type="number" 
                                value={structure.provident_fund} 
                                onChange={(e) => handleChange('provident_fund', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Professional Tax (PT)</Label>
                            <Input 
                                type="number" 
                                value={structure.professional_tax} 
                                onChange={(e) => handleChange('professional_tax', e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Income Tax (TDS)</Label>
                            <Input 
                                type="number" 
                                value={structure.income_tax} 
                                onChange={(e) => handleChange('income_tax', e.target.value)} 
                            />
                        </div>

                        <Separator />

                        <DynamicEarningsDeductions 
                            title="Custom Deductions" 
                            type="deductions" 
                            items={customDeductions} 
                            onChange={handleCustomDeductionsChange} 
                        />
                    </Card>

                    {/* --- Summary --- */}
                    <Card className="p-4 bg-slate-50 mt-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Monthly Gross:</span>
                                <span className="font-semibold">{totals.monthlyGross.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Total Deductions:</span>
                                <span>- {totals.totalDeductions.toLocaleString('en-IN')}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-base font-bold text-green-700">
                                <span>Est. Net Pay:</span>
                                <span>{totals.netPay.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Structure & Hike'}
                </Button>
            </div>

        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EmployeeSalaryStructureDrawer;
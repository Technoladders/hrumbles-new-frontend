import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings, RefreshCcw, Plus, X, Calculator, Info } from "lucide-react";
import { useSelector } from "react-redux";

// --- Interfaces ---

interface CustomItem {
  id?: string;
  name: string;
  monthly: string;
  yearly: string;
}

interface SalaryConfig {
  basicPercent: number;     // e.g. 50% of CTC
  hraPercent: number;       // e.g. 50% of Basic
  ltaPercent: number;       // e.g. 10% of Basic
  pfEnabled: boolean;
  pfCapped: boolean;        // Cap at 1800?
  ptEnabled: boolean;
  gratuityEnabled: boolean;
  bonusEnabled: boolean;
}

interface SalaryState {
  ctc: string; // The Target
  
  // Earnings
  basic_m: string; basic_y: string;
  hra_m: string;   hra_y: string;
  lta_m: string;   lta_y: string;
  special_m: string; special_y: string; // Balancing figure
  
  // Benefits
  employer_pf_m: string; employer_pf_y: string;
  gratuity_m: string; gratuity_y: string;
  bonus_y: string; // Bonus is strictly yearly usually
  
  // Deductions
  employee_pf_m: string; employee_pf_y: string;
  pt_m: string; pt_y: string;
  tds_m: string; tds_y: string;
}

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployee: { id: string; employee_id: string; first_name: string; last_name: string; position?: string } | null;
}

const EmployeeSalaryStructureDrawer = ({ isOpen, onOpenChange, selectedEmployee }: Props) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [loading, setLoading] = useState(false);
  
  // --- Configuration (Percentages & Toggles) ---
  const [config, setConfig] = useState<SalaryConfig>({
    basicPercent: 50,
    hraPercent: 50,
    ltaPercent: 10,
    pfEnabled: true,
    pfCapped: true,
    ptEnabled: true,
    gratuityEnabled: true,
    bonusEnabled: false
  });

  // --- Main Salary State (Strings for full editability) ---
  const [salary, setSalary] = useState<SalaryState>({
    ctc: "",
    basic_m: "", basic_y: "",
    hra_m: "", hra_y: "",
    lta_m: "", lta_y: "",
    special_m: "", special_y: "",
    employer_pf_m: "", employer_pf_y: "",
    gratuity_m: "", gratuity_y: "",
    bonus_y: "",
    employee_pf_m: "", employee_pf_y: "",
    pt_m: "", pt_y: "",
    tds_m: "", tds_y: ""
  });

  const [customEarnings, setCustomEarnings] = useState<CustomItem[]>([]);
  const [customDeductions, setCustomDeductions] = useState<CustomItem[]>([]);

  // --- Helpers ---
  const parse = (val: string) => parseFloat(val) || 0;
  const format = (val: number) => Number(val.toFixed(2)).toString(); // Keep decimals for precision, or Math.round for clean UI? Req implies roundoff control.
  
  // --- Initialization ---
  useEffect(() => {
    if (isOpen && selectedEmployee) {
      fetchData();
    }
  }, [isOpen, selectedEmployee]);

  const fetchData = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("employee_salary_structures")
        .select("*")
        .eq("employee_id", selectedEmployee.employee_id)
        .maybeSingle();

      if (data) {
        // Hydrate Config
        setConfig({
            basicPercent: Number(data.config_basic_percent) || 50,
            hraPercent: Number(data.config_hra_percent) || 50,
            ltaPercent: Number(data.config_lta_percent) || 10,
            pfEnabled: data.provident_fund > 0,
            pfCapped: true,
            ptEnabled: data.professional_tax > 0,
            gratuityEnabled: data.gratuity_enabled,
            bonusEnabled: data.performance_bonus > 0
        });

        // Hydrate State (Helper to set pair)
        const setPair = (val: number) => ({ m: val.toString(), y: (val * 12).toFixed(0) });
        
        // Handling special casing for values derived from DB
        setSalary({
            ctc: data.ctc?.toString() || "",
            
            basic_m: data.basic_salary?.toString() || "", 
            basic_y: (data.basic_salary * 12).toFixed(0),
            
            hra_m: data.hra?.toString() || "", 
            hra_y: (data.hra * 12).toFixed(0),
            
            lta_m: data.lta?.toString() || "", 
            lta_y: (data.lta * 12).toFixed(0),
            
            special_m: data.other_allowance?.toString() || "", 
            special_y: (data.other_allowance * 12).toFixed(0),
            
            employer_pf_m: data.employer_pf?.toString() || "", 
            employer_pf_y: (data.employer_pf * 12).toFixed(0),
            
            gratuity_m: data.gratuity_amount ? (data.gratuity_amount / 12).toFixed(0) : "",
            gratuity_y: data.gratuity_amount?.toString() || "",
            
            bonus_y: data.performance_bonus?.toString() || "",
            
            employee_pf_m: data.provident_fund?.toString() || "", 
            employee_pf_y: (data.provident_fund * 12).toFixed(0),
            
            pt_m: data.professional_tax?.toString() || "", 
            pt_y: (data.professional_tax * 12).toFixed(0),
            
            tds_m: data.income_tax?.toString() || "", 
            tds_y: (data.income_tax * 12).toFixed(0)
        });

        // Custom Items
        const { data: customData } = await supabase
            .from("salary_structure_custom_items")
            .select("*")
            .eq("structure_id", data.id);
            
        if (customData) {
            setCustomEarnings(customData.filter(i => i.type === 'earning').map(i => ({ 
                name: i.name, monthly: i.amount.toString(), yearly: (i.amount * 12).toFixed(0) 
            })));
            setCustomDeductions(customData.filter(i => i.type === 'deduction').map(i => ({ 
                name: i.name, monthly: i.amount.toString(), yearly: (i.amount * 12).toFixed(0) 
            })));
        }

      } else {
        // Defaults
        setSalary(prev => ({ ...prev, ctc: "", basic_m: "", basic_y: "", employer_pf_m: "1800", employer_pf_y: "21600" }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Manual Editing ---

  const updateField = (fieldBase: string, type: 'm' | 'y', value: string) => {
      setSalary(prev => {
          const numVal = parseFloat(value) || 0;
          const otherKey = type === 'm' ? 'y' : 'm';
          const calculatedVal = type === 'm' ? numVal * 12 : numVal / 12;
          
          return {
              ...prev,
              [`${fieldBase}_${type}`]: value,
              [`${fieldBase}_${otherKey}`]: isNaN(numVal) ? "" : type === 'm' ? calculatedVal.toFixed(0) : calculatedVal.toFixed(2)
          };
      });
  };

  // --- Logic: Auto Distribute ---

  const handleAutoDistribute = () => {
    const ctc = parse(salary.ctc);
    if (!ctc) {
        toast.error("Please enter Annual CTC first");
        return;
    }

    // 1. Handle Bonus (Subtracted from CTC first if enabled)
    let pool = ctc;
    let bonusAmount = 0;
    if (config.bonusEnabled) {
        // Assumption: Bonus is 10% or manually set? 
        // For auto-calc, let's leave Bonus as 0 or keep existing value if user entered it.
        // Let's assume standard logic: Bonus is 0 initially in auto-calc unless we defined a rule.
        // We will just reserve space for it if a value exists, otherwise 0.
        bonusAmount = parse(salary.bonus_y); 
        pool -= bonusAmount;
    }

    const monthlyPool = pool / 12;

    // 2. Calculate Basic
    // Rule: Basic is X% of Monthly Pool (Standardized)
    const basic = monthlyPool * (config.basicPercent / 100);

    // 3. Benefits linked to Basic
    let employerPF = 0;
    if (config.pfEnabled) {
        const rawPF = basic * 0.12;
        employerPF = config.pfCapped ? Math.min(rawPF, 1800) : rawPF;
    }

    let gratuityMonthly = 0;
    if (config.gratuityEnabled) {
        gratuityMonthly = basic * 0.0481;
    }

    // 4. Allowances
    const hra = basic * (config.hraPercent / 100);
    const lta = basic * (config.ltaPercent / 100);

    // 5. Special / Other Allowance (Balancing Figure)
    // CTC/12 = Basic + HRA + LTA + Special + EmployerPF + GratuityMonthly
    // Special = (CTC/12) - (Basic + HRA + LTA + EmpPF + GratM)
    const special = monthlyPool - (basic + hra + lta + employerPF + gratuityMonthly);

    // 6. Deductions
    const employeePF = config.pfEnabled ? employerPF : 0; // Usually matches employer
    const pt = config.ptEnabled ? 200 : 0;

    // Update State
    const s = { ...salary };
    
    // Helper to batch update
    const set = (key: string, val: number) => {
        // @ts-ignore
        s[`${key}_m`] = format(val);
        // @ts-ignore
        s[`${key}_y`] = (val * 12).toFixed(0);
    };

    set('basic', basic);
    set('hra', hra);
    set('lta', lta);
    set('special', Math.max(0, special));
    set('employer_pf', employerPF);
    set('gratuity', gratuityMonthly);
    set('employee_pf', employeePF);
    set('pt', pt);

    setSalary(s);
    toast.success("Salary Distributed Automatically");
  };

  // --- Calculations for Summary ---
  
  const calculateTotals = () => {
      // Monthly Gross
      const grossM = parse(salary.basic_m) + parse(salary.hra_m) + parse(salary.lta_m) + parse(salary.special_m) + customEarnings.reduce((s,i) => s + parse(i.monthly), 0);
      const grossY = parse(salary.basic_y) + parse(salary.hra_y) + parse(salary.lta_y) + parse(salary.special_y) + customEarnings.reduce((s,i) => s + parse(i.yearly), 0);

      // Total Deductions
      const dedM = parse(salary.employee_pf_m) + parse(salary.pt_m) + parse(salary.tds_m) + customDeductions.reduce((s,i) => s + parse(i.monthly), 0);
      
      // CTC Calc
      // CTC = Gross + EmpPF + Gratuity + Bonus
      const ctcCalcY = grossY 
        + parse(salary.employer_pf_y) 
        + parse(salary.gratuity_y) 
        + parse(salary.bonus_y);

      return {
          grossM, grossY,
          dedM,
          netM: grossM - dedM,
          netY: (grossM - dedM) * 12,
          ctcCalcY
      };
  };

  const totals = calculateTotals();

  // --- Save ---

  const handleSave = async () => {
    setLoading(true);
    try {
        const payload = {
            employee_id: selectedEmployee!.employee_id,
            organization_id: organization_id,
            ctc: parse(salary.ctc),
            
            // Core Components
            basic_salary: parse(salary.basic_m),
            hra: parse(salary.hra_m),
            lta: parse(salary.lta_m),
            other_allowance: parse(salary.special_m),
            
            // Benefits
            employer_pf: parse(salary.employer_pf_m),
            gratuity_enabled: config.gratuityEnabled,
            gratuity_amount: parse(salary.gratuity_y),
            performance_bonus: parse(salary.bonus_y),
            
            // Deductions
            provident_fund: parse(salary.employee_pf_m),
            professional_tax: parse(salary.pt_m),
            income_tax: parse(salary.tds_m),
            
            // Config Snapshots
            config_basic_percent: config.basicPercent,
            config_hra_percent: config.hraPercent,
            
            updated_at: new Date().toISOString()
        };

        const { data: saved, error } = await supabase
            .from("employee_salary_structures")
            .upsert(payload, { onConflict: 'employee_id' })
            .select()
            .single();

        if (error) throw error;

        // Custom Items
        await supabase.from("salary_structure_custom_items").delete().eq("structure_id", saved.id);
        const customItems = [
            ...customEarnings.map(i => ({ structure_id: saved.id, name: i.name, amount: parse(i.monthly), type: 'earning' })),
            ...customDeductions.map(i => ({ structure_id: saved.id, name: i.name, amount: parse(i.monthly), type: 'deduction' }))
        ];
        if (customItems.length > 0) await supabase.from("salary_structure_custom_items").insert(customItems);

        toast.success("Structure Saved");
        onOpenChange(false);
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  };

  // --- Render Helpers ---

  const updateCustom = (list: CustomItem[], setList: any, idx: number, field: keyof CustomItem, val: string) => {
      const newList = [...list];
      newList[idx] = { ...newList[idx], [field]: val };
      
      // Auto calc pair
      if (field === 'monthly') newList[idx].yearly = (parseFloat(val||"0") * 12).toFixed(0);
      if (field === 'yearly') newList[idx].monthly = (parseFloat(val||"0") / 12).toFixed(2);
      
      setList(newList);
  };

  if (!selectedEmployee) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[1100px] overflow-y-auto bg-slate-50">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Salary Structure Calculator
          </SheetTitle>
        </SheetHeader>

        {/* --- Top Control Bar --- */}
        <Card className="p-4 mb-6 shadow-sm border-slate-200">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                    <Label className="text-base font-semibold text-slate-700">Target Annual CTC</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400 font-bold text-lg">₹</span>
                        <Input 
                            value={salary.ctc}
                            onChange={(e) => setSalary({...salary, ctc: e.target.value})}
                            className="pl-8 h-12 text-xl font-bold border-slate-300"
                            placeholder="e.g. 500000"
                        />
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-12 border-slate-300 px-4">
                                <Settings className="w-5 h-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <h4 className="font-semibold mb-3 border-b pb-2">Auto-Calc Logic</h4>
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <Label>Basic % (of CTC)</Label>
                                    <Input type="number" value={config.basicPercent} onChange={e=>setConfig({...config, basicPercent: Number(e.target.value)})} className="h-8" />
                                </div>
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <Label>HRA % (of Basic)</Label>
                                    <Input type="number" value={config.hraPercent} onChange={e=>setConfig({...config, hraPercent: Number(e.target.value)})} className="h-8" />
                                </div>
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <Label>LTA % (of Basic)</Label>
                                    <Input type="number" value={config.ltaPercent} onChange={e=>setConfig({...config, ltaPercent: Number(e.target.value)})} className="h-8" />
                                </div>
                                <Separator />
                                <div className="flex justify-between"><Label>PF Enabled</Label> <Switch checked={config.pfEnabled} onCheckedChange={c=>setConfig({...config, pfEnabled: c})} /></div>
                                <div className="flex justify-between"><Label>PF Capped (1800)</Label> <Switch checked={config.pfCapped} onCheckedChange={c=>setConfig({...config, pfCapped: c})} /></div>
                                <div className="flex justify-between"><Label>PT Enabled</Label> <Switch checked={config.ptEnabled} onCheckedChange={c=>setConfig({...config, ptEnabled: c})} /></div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button onClick={handleAutoDistribute} className="h-12 bg-blue-700 hover:bg-blue-800 flex-1 md:flex-none">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Auto Distribute
                    </Button>
                </div>
            </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* LEFT: EARNINGS & CONFIG */}
            <div className="space-y-6">
                
                {/* 1. Earnings */}
                <div className="bg-white rounded-lg border border-green-200 overflow-hidden shadow-sm">
                    <div className="bg-green-50/80 px-4 py-2 border-b border-green-100 flex justify-between items-center">
                        <h3 className="font-semibold text-green-800">💰 Earnings</h3>
                        <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Part of Monthly Gross</span>
                    </div>
                    <Header />
                    <div className="p-2 space-y-1">
                        <Row label="Basic Salary" field="basic" data={salary} update={updateField} />
                        <Row label="HRA" field="hra" data={salary} update={updateField} />
                        <Row label="LTA" field="lta" data={salary} update={updateField} />
                        <Row label="Fixed Allowance" field="special" data={salary} update={updateField} highlight />
                        
                        {/* Custom Earnings */}
                        {customEarnings.map((item, idx) => (
                             <div key={idx} className="grid grid-cols-12 gap-2 items-center py-1">
                                <div className="col-span-4 pl-2"><Input value={item.name} onChange={e=>updateCustom(customEarnings, setCustomEarnings, idx, 'name', e.target.value)} className="h-7 text-xs" placeholder="Name" /></div>
                                <div className="col-span-3"><Input value={item.monthly} onChange={e=>updateCustom(customEarnings, setCustomEarnings, idx, 'monthly', e.target.value)} className="h-7 text-right text-xs" /></div>
                                <div className="col-span-4"><Input value={item.yearly} onChange={e=>updateCustom(customEarnings, setCustomEarnings, idx, 'yearly', e.target.value)} className="h-7 text-right text-xs" /></div>
                                <div className="col-span-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCustomEarnings(customEarnings.filter((_, i) => i !== idx))}><X className="w-3 h-3 text-red-500" /></Button></div>
                             </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setCustomEarnings([...customEarnings, { name: '', monthly: '', yearly: '' }])} className="text-xs text-blue-600 pl-2">
                            <Plus className="w-3 h-3 mr-1" /> Add Custom
                        </Button>
                    </div>
                    <div className="bg-green-50 px-4 py-2 border-t border-green-100 flex justify-between font-semibold text-green-900 text-sm">
                        <span>Total Monthly Gross</span>
                        <span>₹{totals.grossM.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>

                {/* 2. Employer Benefits (CTC Components) */}
                <div className="bg-white rounded-lg border border-orange-200 overflow-hidden shadow-sm">
                    <div className="bg-orange-50/80 px-4 py-2 border-b border-orange-100 flex justify-between items-center">
                        <h3 className="font-semibold text-orange-800">🏢 Employer Benefits</h3>
                        <span className="text-[10px] text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Part of CTC</span>
                    </div>
                    <Header />
                    <div className="p-2 space-y-1">
                        <Row label="Employer PF" field="employer_pf" data={salary} update={updateField} disabled={!config.pfEnabled} />
                        
                        {/* Gratuity Toggle Row */}
                        <div className="grid grid-cols-12 gap-2 items-center py-1 border-t border-dashed border-slate-100 mt-1 pt-1">
                            <div className="col-span-4 pl-2 flex items-center gap-2">
                                <Switch checked={config.gratuityEnabled} onCheckedChange={c=>setConfig({...config, gratuityEnabled: c})} className="scale-75" />
                                <span className="text-sm font-medium text-slate-700">Gratuity</span>
                            </div>
                            <div className="col-span-3">
                                {config.gratuityEnabled && <Input value={salary.gratuity_m} onChange={e=>updateField('gratuity', 'm', e.target.value)} className="h-8 text-right font-mono text-sm" />}
                            </div>
                            <div className="col-span-4">
                                {config.gratuityEnabled && <Input value={salary.gratuity_y} onChange={e=>updateField('gratuity', 'y', e.target.value)} className="h-8 text-right font-mono text-sm" />}
                            </div>
                        </div>

                         {/* Bonus Toggle Row */}
                         <div className="grid grid-cols-12 gap-2 items-center py-1 border-t border-dashed border-slate-100 mt-1 pt-1">
                            <div className="col-span-4 pl-2 flex items-center gap-2">
                                <Switch checked={config.bonusEnabled} onCheckedChange={c=>setConfig({...config, bonusEnabled: c})} className="scale-75" />
                                <span className="text-sm font-medium text-slate-700">Perf. Bonus</span>
                            </div>
                            <div className="col-span-3 text-center text-xs text-slate-400 italic">
                                -- Yearly Only --
                            </div>
                            <div className="col-span-4">
                                {config.bonusEnabled && <Input value={salary.bonus_y} onChange={e=>setSalary({...salary, bonus_y: e.target.value})} className="h-8 text-right font-mono text-sm bg-purple-50" placeholder="Yearly Amount" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: DEDUCTIONS & SUMMARY */}
            <div className="space-y-6">
                 {/* 3. Deductions */}
                 <div className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-sm">
                    <div className="bg-red-50/80 px-4 py-2 border-b border-red-100 flex justify-between items-center">
                        <h3 className="font-semibold text-red-800">📉 Employee Deductions</h3>
                        <span className="text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Reduces Take Home</span>
                    </div>
                    <Header />
                    <div className="p-2 space-y-1">
                        <Row label="Employee PF" field="employee_pf" data={salary} update={updateField} disabled={!config.pfEnabled} />
                        <Row label="Professional Tax" field="pt" data={salary} update={updateField} disabled={!config.ptEnabled} />
                        <Row label="Income Tax (TDS)" field="tds" data={salary} update={updateField} />
                        
                        {/* Custom Deductions */}
                        {customDeductions.map((item, idx) => (
                             <div key={idx} className="grid grid-cols-12 gap-2 items-center py-1">
                                <div className="col-span-4 pl-2"><Input value={item.name} onChange={e=>updateCustom(customDeductions, setCustomDeductions, idx, 'name', e.target.value)} className="h-7 text-xs" placeholder="Name" /></div>
                                <div className="col-span-3"><Input value={item.monthly} onChange={e=>updateCustom(customDeductions, setCustomDeductions, idx, 'monthly', e.target.value)} className="h-7 text-right text-xs" /></div>
                                <div className="col-span-4"><Input value={item.yearly} onChange={e=>updateCustom(customDeductions, setCustomDeductions, idx, 'yearly', e.target.value)} className="h-7 text-right text-xs" /></div>
                                <div className="col-span-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCustomDeductions(customDeductions.filter((_, i) => i !== idx))}><X className="w-3 h-3 text-red-500" /></Button></div>
                             </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setCustomDeductions([...customDeductions, { name: '', monthly: '', yearly: '' }])} className="text-xs text-red-600 pl-2">
                            <Plus className="w-3 h-3 mr-1" /> Add Custom
                        </Button>
                    </div>
                </div>

                {/* 4. Final Summary */}
                <Card className="bg-slate-900 text-white p-5 shadow-xl">
                    <h3 className="text-lg font-semibold mb-4 border-b border-slate-700 pb-2">✅ Salary Overview</h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-slate-400 text-sm">Net Take Home (Monthly)</span>
                            <span className="text-2xl font-bold text-green-400">₹{totals.netM.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm text-slate-400">
                             <span>Gross: {totals.grossM.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                             <span>Deductions: {totals.dedM.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>

                        <Separator className="bg-slate-700" />

                        <div className="flex justify-between items-end">
                            <span className="text-slate-400 text-sm">Calculated Annual CTC</span>
                            <span className="text-xl font-bold text-white">₹{totals.ctcCalcY.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        
                        {/* Validation */}
                        {salary.ctc && Math.abs(parse(salary.ctc) - totals.ctcCalcY) > 100 && (
                             <div className="mt-2 bg-yellow-900/40 border border-yellow-700 p-2 rounded text-xs text-yellow-200 flex gap-2 items-start">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    Target CTC (₹{parse(salary.ctc).toLocaleString()}) differs from summation (₹{totals.ctcCalcY.toLocaleString()}). 
                                    {totals.ctcCalcY > parse(salary.ctc) ? 'Reduce components.' : 'Increase components or use Auto Distribute.'}
                                </span>
                             </div>
                        )}
                    </div>
                </Card>

                <Button onClick={handleSave} disabled={loading} className="w-full h-12 text-lg">
                    <Save className="mr-2 w-5 h-5" />
                    {loading ? "Saving..." : "Save Salary Structure"}
                </Button>
            </div>
        </div>

      </SheetContent>
    </Sheet>
  );
};

// Sub Component: Row
const Header = () => (
    <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
        <div className="col-span-4 pl-2">Component</div>
        <div className="col-span-3 text-right">Monthly</div>
        <div className="col-span-4 text-right">Yearly</div>
        <div className="col-span-1"></div>
    </div>
);

const Row = ({ label, field, data, update, disabled, highlight }: any) => (
    <div className={`grid grid-cols-12 gap-2 items-center py-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="col-span-4 pl-2">
            <span className={`text-sm font-medium ${highlight ? 'text-blue-700' : 'text-slate-700'}`}>{label}</span>
        </div>
        <div className="col-span-3">
            <Input 
                value={data[`${field}_m`]} 
                onChange={(e) => update(field, 'm', e.target.value)}
                className={`h-8 text-right font-mono text-sm ${highlight ? 'bg-blue-50 border-blue-200' : ''}`} 
            />
        </div>
        <div className="col-span-4">
            <Input 
                value={data[`${field}_y`]} 
                onChange={(e) => update(field, 'y', e.target.value)}
                className={`h-8 text-right font-mono text-sm ${highlight ? 'bg-blue-50 border-blue-200' : ''}`} 
            />
        </div>
    </div>
);

export default EmployeeSalaryStructureDrawer;
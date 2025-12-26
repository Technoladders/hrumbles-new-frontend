import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalaryStructureViewProps {
  employeeId: string;
  employeeName: string;
  designation: string;
}

const SalaryStructureView = ({ employeeId, employeeName, designation }: SalaryStructureViewProps) => {
  const [structure, setStructure] = useState<any>(null);
  const [customEarnings, setCustomEarnings] = useState<any[]>([]);
  const [customDeductions, setCustomDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) fetchStructure();
  }, [employeeId]);

  const fetchStructure = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_salary_structures")
        .select("*")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStructure(data);
        
        const { data: customItems } = await supabase
            .from("salary_structure_custom_items")
            .select("*")
            .eq("structure_id", data.id);
            
        if (customItems) {
            setCustomEarnings(customItems.filter((i: any) => i.type === 'earning'));
            setCustomDeductions(customItems.filter((i: any) => i.type === 'deduction'));
        }
      }
    } catch (error) {
      console.error("Error fetching structure:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    // Round to nearest integer for clean display like the image
    return Math.round(val || 0).toLocaleString('en-IN'); 
  };

  // --- PDF GENERATION LOGIC (MATCHING ANNEXURE IMAGE) ---
  const generatePDF = () => {
    if (!structure) return;

    const doc = new jsPDF();

    // 1. Calculations
    const basicM = structure.basic_salary;
    const hraM = structure.hra;
    const ltaM = structure.lta;
    const fixedM = structure.other_allowance;
    const customEarnM = customEarnings.reduce((s, i) => s + i.amount, 0);
    
    const grossM = basicM + hraM + ltaM + fixedM + customEarnM;
    
    const empPF_M = structure.employer_pf;
    const gratuity_M = structure.gratuity_enabled ? (structure.gratuity_amount / 12) : 0;
    
    const ctcM = grossM + empPF_M + gratuity_M; // Monthly CTC (excluding annual bonus usually)
    const ctcY = (ctcM * 12) + (structure.performance_bonus || 0); // Annual CTC includes bonus

    const empPF_Ded_M = structure.provident_fund;
    const pt_M = structure.professional_tax;
    const tds_M = structure.income_tax;
    const customDed_M = customDeductions.reduce((s, i) => s + i.amount, 0);
    
    const totalDedM = empPF_Ded_M + pt_M + tds_M + customDed_M;
    const netM = grossM - totalDedM;

    // 2. Data Rows Construction
    const tableBody = [
        // Employee Info Row (merged in logic below, but data here)
        [{ content: employeeName, colSpan: 1, styles: { fontStyle: 'bold' } }, { content: designation, colSpan: 2, styles: { fontStyle: 'bold' } }],
        
        // Header
        [{ content: 'Allowances', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: 'Monthly Amount', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }, { content: 'Yearly Amount', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }],
        
        // Earnings
        ['Basic Salary', formatCurrency(basicM), formatCurrency(basicM * 12)],
        ['House Rent Allowance', formatCurrency(hraM), formatCurrency(hraM * 12)],
        ['LTA Allowance', formatCurrency(ltaM), formatCurrency(ltaM * 12)],
        ['Fixed Allowance', formatCurrency(fixedM), formatCurrency(fixedM * 12)],
        ...customEarnings.map(i => [i.name, formatCurrency(i.amount), formatCurrency(i.amount * 12)]),
        
        // Gross Total
        [{ content: 'Total Gross Salary', styles: { fontStyle: 'bold' } }, { content: formatCurrency(grossM), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(grossM * 12), styles: { fontStyle: 'bold', halign: 'right' } }],
        
        // Employer Benefits
        ['PF Employer Contribution', formatCurrency(empPF_M), formatCurrency(empPF_M * 12)],
        ...(structure.gratuity_enabled ? [['Gratuity Employer Contribution', formatCurrency(gratuity_M), formatCurrency(structure.gratuity_amount)]] : []),
        
        // Total CTC (Monthly & Yearly)
        [{ content: 'Total CTC', styles: { fontStyle: 'bold' } }, { content: formatCurrency(ctcM), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(ctcM * 12), styles: { fontStyle: 'bold', halign: 'right' } }],
        
        // Bonus (If applicable)
        ...(structure.performance_bonus > 0 ? [[{ content: 'Performance Bonus', styles: { fontStyle: 'italic' } }, '-', formatCurrency(structure.performance_bonus)]] : []),

        // Separator / Deductions Header logic implicit
        ['PF Employee Contribution', formatCurrency(empPF_Ded_M), formatCurrency(empPF_Ded_M * 12)],
        ['Professional Tax', formatCurrency(pt_M), formatCurrency(pt_M * 12)],
        ...(tds_M > 0 ? [['Income Tax (TDS)', formatCurrency(tds_M), formatCurrency(tds_M * 12)]] : []),
        ...customDeductions.map(i => [i.name, formatCurrency(i.amount), formatCurrency(i.amount * 12)]),

        // Net Pay
        [{ content: 'Net Take Home', styles: { fontStyle: 'bold', fillColor: [240, 255, 240] } }, { content: formatCurrency(netM), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 255, 240] } }, { content: formatCurrency(netM * 12), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 255, 240] } }],
        
        // Grand Total CTC Reiteration (As per image 2)
        [{ content: 'Total Cost to Company', styles: { fontStyle: 'bold' } }, { content: '', styles: { halign: 'right' } }, { content: formatCurrency(ctcY), styles: { fontStyle: 'bold', halign: 'right' } }],
    ];

    // 3. Document Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ANNEXURE - A", 105, 15, { align: "center" });

    // 4. Generate Table
    autoTable(doc, {
        startY: 25,
        body: tableBody,
        theme: 'grid', // This gives the bordered look like the image
        styles: {
            fontSize: 10,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40, halign: 'right' },
            2: { cellWidth: 40, halign: 'right' },
        },
        didParseCell: function (data) {
            // Logic to bold rows is handled in data construction
        }
    });

    doc.save(`${employeeName.replace(' ', '_')}_Annexure_A.pdf`);
    toast.success("Annexure Downloaded");
  };

  if (loading) return <div className="p-6 flex justify-center items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-5 w-5" /> Loading Structure...</div>;
  
  if (!structure) return (
    <Card className="bg-slate-50 border-dashed border-2">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 text-slate-300" />
            <p className="font-medium">No Salary Structure Defined</p>
            <p className="text-sm">Please configure the salary structure using the edit tools.</p>
        </CardContent>
    </Card>
  );

  // --- UI CALCS ---
  const basicM = structure.basic_salary;
  const hraM = structure.hra;
  const ltaM = structure.lta;
  const fixedM = structure.other_allowance;
  const customEarnM = customEarnings.reduce((s, i) => s + i.amount, 0);
  const grossM = basicM + hraM + ltaM + fixedM + customEarnM;

  const empPF_M = structure.employer_pf;
  const gratuity_M = structure.gratuity_enabled ? (structure.gratuity_amount / 12) : 0;
  const ctcM = grossM + empPF_M + gratuity_M;

  const empPF_Ded_M = structure.provident_fund;
  const pt_M = structure.professional_tax;
  const tds_M = structure.income_tax;
  const customDed_M = customDeductions.reduce((s, i) => s + i.amount, 0);
  const totalDedM = empPF_Ded_M + pt_M + tds_M + customDed_M;
  
  const netM = grossM - totalDedM;
  const annualCTC = (ctcM * 12) + (structure.performance_bonus || 0);

  return (
    <Card className="rounded-2xl shadow-lg border-none bg-white dark:bg-gray-800 overflow-hidden mb-6">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Salary Structure Breakdown
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                    Annual CTC: <span className="font-bold text-gray-900 dark:text-gray-200">₹{formatCurrency(annualCTC)}</span>
                </p>
            </div>
            <Button onClick={generatePDF} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md">
                <Download className="w-4 h-4" /> Download Annexure
            </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-gray-900/50 hover:bg-slate-50">
                        <TableHead className="w-[40%] font-bold text-gray-700 dark:text-gray-300">Allowances</TableHead>
                        <TableHead className="text-right font-bold text-gray-700 dark:text-gray-300">Monthly Amount</TableHead>
                        <TableHead className="text-right font-bold text-gray-700 dark:text-gray-300">Yearly Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* Earnings */}
                    <Row label="Basic Salary" val={basicM} />
                    <Row label="House Rent Allowance" val={hraM} />
                    <Row label="LTA Allowance" val={ltaM} />
                    <Row label="Fixed Allowance" val={fixedM} />
                    {customEarnings.map((i, idx) => <Row key={`ce-${idx}`} label={i.name} val={i.amount} />)}
                    
                    {/* Gross Total */}
                    <TableRow className="bg-indigo-50/50 dark:bg-indigo-900/20 font-bold border-t border-indigo-100">
                        <TableCell className="text-indigo-900 dark:text-indigo-200">Total Gross Salary</TableCell>
                        <TableCell className="text-right text-indigo-900 dark:text-indigo-200">₹{formatCurrency(grossM)}</TableCell>
                        <TableCell className="text-right text-indigo-900 dark:text-indigo-200">₹{formatCurrency(grossM * 12)}</TableCell>
                    </TableRow>

                    {/* Employer Benefits */}
                    <Row label="PF Employer Contribution" val={empPF_M} />
                    {structure.gratuity_enabled && <Row label="Gratuity Employer Contribution" val={gratuity_M} />}
                    
                    {/* Monthly CTC */}
                    <TableRow className="bg-slate-100/80 dark:bg-slate-800 font-bold border-t border-slate-200">
                        <TableCell className="text-gray-900 dark:text-gray-100">Total CTC (Monthly Basis)</TableCell>
                        <TableCell className="text-right text-gray-900 dark:text-gray-100">₹{formatCurrency(ctcM)}</TableCell>
                        <TableCell className="text-right text-gray-900 dark:text-gray-100">₹{formatCurrency(ctcM * 12)}</TableCell>
                    </TableRow>

                    {/* Bonus */}
                    {structure.performance_bonus > 0 && (
                        <TableRow>
                            <TableCell className="font-medium text-purple-700 dark:text-purple-400">Performance Bonus (Annual)</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                            <TableCell className="text-right font-medium text-purple-700 dark:text-purple-400">₹{formatCurrency(structure.performance_bonus)}</TableCell>
                        </TableRow>
                    )}

                    {/* Deductions */}
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={3} className="h-4"></TableCell></TableRow> {/* Spacer */}
                    <TableRow className="bg-slate-50 dark:bg-gray-900/50"><TableCell colSpan={3} className="font-bold text-gray-500 py-2">Employee Deductions</TableCell></TableRow>
                    
                    <Row label="PF Employee Contribution" val={empPF_Ded_M} />
                    <Row label="Professional Tax" val={pt_M} />
                    {tds_M > 0 && <Row label="Income Tax (TDS)" val={tds_M} />}
                    {customDeductions.map((i, idx) => <Row key={`cd-${idx}`} label={i.name} val={i.amount} />)}

                    {/* Net Pay */}
                    <TableRow className="bg-green-50 dark:bg-green-900/20 font-bold border-t-2 border-green-200">
                        <TableCell className="text-green-800 dark:text-green-300 text-lg">Net Take Home</TableCell>
                        <TableCell className="text-right text-green-800 dark:text-green-300 text-lg">₹{formatCurrency(netM)}</TableCell>
                        <TableCell className="text-right text-green-800 dark:text-green-300 text-lg">₹{formatCurrency(netM * 12)}</TableCell>
                    </TableRow>
                    
                     {/* Final CTC Summary */}
                     <TableRow className="bg-gray-50 dark:bg-gray-800 font-bold border-t border-gray-200">
                        <TableCell className="text-gray-800 dark:text-gray-200">Total Cost to Company</TableCell>
                        <TableCell className="text-right text-gray-400">-</TableCell>
                        <TableCell className="text-right text-gray-900 dark:text-gray-100">₹{formatCurrency(annualCTC)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper Row Component
const Row = ({ label, val }: { label: string; val: number }) => (
    <TableRow>
        <TableCell className="font-medium text-gray-600 dark:text-gray-400">{label}</TableCell>
        <TableCell className="text-right font-mono text-gray-700 dark:text-gray-300">
            {Math.round(val || 0).toLocaleString('en-IN')}
        </TableCell>
        <TableCell className="text-right font-mono text-gray-700 dark:text-gray-300">
            {Math.round((val || 0) * 12).toLocaleString('en-IN')}
        </TableCell>
    </TableRow>
);

export default SalaryStructureView;
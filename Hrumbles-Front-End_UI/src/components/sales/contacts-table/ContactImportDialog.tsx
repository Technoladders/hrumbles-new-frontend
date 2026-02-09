import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useImportCsvData } from '@/hooks/sales/useImportCsvData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2 } from 'lucide-react';

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
}

// Standard fields 1-to-1 mapping
const STANDARD_FIELDS = [
  { key: 'name', label: 'Contact Name', required: true },
  { key: 'job_title', label: 'Job Title' },
  { key: 'linkedin_url', label: 'Person LinkedIn' },
  { key: 'contact_stage', label: 'Stage' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'notes', label: 'Notes' },
];

// Company fields
const COMPANY_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'company_linkedin', label: 'Company LinkedIn' }, // New
  { key: 'company_industry', label: 'Industry' }, // New
  { key: 'company_employees', label: 'Employee Count' }, // New
];

export const ContactImportDialog: React.FC<ContactImportDialogProps> = ({ open, onOpenChange, fileId }) => {
  const { toast } = useToast();
  const importMutation = useImportCsvData();

  const [step, setStep] = useState(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  
  // State for Mappings
  const [standardMapping, setStandardMapping] = useState<Record<string, string>>({});
  
  // State for Dynamic Multi-Selects (Phones/Emails)
  const [emailColumns, setEmailColumns] = useState<{ csvHeader: string, isPrimary: boolean }[]>([]);
  const [phoneColumns, setPhoneColumns] = useState<{ csvHeader: string, type: string, isPrimary: boolean }[]>([]);
  
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let jsonData: any[] = [];
        let headers: string[] = [];

        if (file.name.endsWith('.csv')) {
          const parsed = Papa.parse(data as string, { header: true, skipEmptyLines: true });
          jsonData = parsed.data;
          headers = parsed.meta.fields || [];
        } else if (file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
          if (jsonData.length > 0) headers = Object.keys(jsonData[0]);
        }

        setCsvData(jsonData);
        setCsvHeaders(headers);
        setStep(2);
      } catch (error) {
        toast({ title: "File Error", description: "Could not read file.", variant: "destructive" });
      }
    };
    
    if (file.name.endsWith('.xlsx')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  const addPhoneColumn = () => {
    setPhoneColumns([...phoneColumns, { csvHeader: '', type: 'mobile', isPrimary: phoneColumns.length === 0 }]);
  };

  const addEmailColumn = () => {
    setEmailColumns([...emailColumns, { csvHeader: '', isPrimary: emailColumns.length === 0 }]);
  };

  const handleImport = () => {
    if (!standardMapping.name) {
      toast({ title: "Required", description: "Please map the 'Contact Name' field.", variant: "destructive" });
      return;
    }

    // Transform Data for Backend
    const processedData = csvData.map(row => {
      // 1. Standard Fields
      const cleanRow: any = {};
      [...STANDARD_FIELDS, ...COMPANY_FIELDS].forEach(field => {
        if (standardMapping[field.key]) {
          cleanRow[field.key] = row[standardMapping[field.key]];
        }
      });

      // 2. Process Phones
      const phones = phoneColumns
        .filter(col => col.csvHeader && row[col.csvHeader])
        .map(col => ({
          number: row[col.csvHeader],
          type: col.type,
          is_primary: col.isPrimary
        }));
      
      const primaryPhoneObj = phones.find(p => p.is_primary) || phones[0];
      cleanRow.phones = phones;
      cleanRow.primary_phone = primaryPhoneObj?.number;

      // 3. Process Emails
      const emails = emailColumns
        .filter(col => col.csvHeader && row[col.csvHeader])
        .map(col => ({
          email: row[col.csvHeader],
          is_primary: col.isPrimary
        }));
      
      const primaryEmailObj = emails.find(e => e.is_primary) || emails[0];
      cleanRow.emails = emails;
      cleanRow.primary_email = primaryEmailObj?.email;

      return cleanRow;
    });

    importMutation.mutate(
      { fileId: fileId!, processedData },
      {
        onSuccess: (data) => {
          setImportResult(data);
          setStep(3);
        }
      }
    );
  };

  const resetState = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setCsvData([]);
      setStandardMapping({});
      setPhoneColumns([]);
      setEmailColumns([]);
      setImportResult(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>Map columns to import contacts, enrichment data, and company info.</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-8 text-center">
            <Label htmlFor="file-upload" className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-8 rounded-lg border-2 border-dashed border-slate-300 block">
              <span className="block text-lg font-medium text-slate-700">Click to Upload CSV or Excel</span>
              <span className="text-sm text-slate-500">Supported formats: .csv, .xlsx</span>
              <Input id="file-upload" type="file" className="hidden" accept=".csv, .xlsx" onChange={handleFileChange} />
            </Label>
          </div>
        )}

        {step === 2 && (
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 py-2 px-1">
              
              {/* SECTION 1: CONTACT INFO */}
              <div className="bg-slate-50 p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 text-indigo-700">1. Contact Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  {STANDARD_FIELDS.map(field => (
                    <div key={field.key}>
                      <Label className="text-xs font-semibold text-slate-500 mb-1 block">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Select onValueChange={(val) => setStandardMapping(prev => ({...prev, [field.key]: val}))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Column" /></SelectTrigger>
                        <SelectContent>
                          {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: COMPANY INFO */}
              <div className="bg-slate-50 p-4 rounded-lg border">
                <h3 className="font-semibold mb-3 text-indigo-700">2. Company Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  {COMPANY_FIELDS.map(field => (
                    <div key={field.key}>
                      <Label className="text-xs font-semibold text-slate-500 mb-1 block">{field.label}</Label>
                      <Select onValueChange={(val) => setStandardMapping(prev => ({...prev, [field.key]: val}))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Column" /></SelectTrigger>
                        <SelectContent>
                          {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: PHONES & EMAILS */}
              <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                
                {/* Emails */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-indigo-700">3. Email Addresses</h3>
                    <Button size="sm" variant="ghost" onClick={addEmailColumn} className="h-6 text-xs text-indigo-600"><Plus size={12} className="mr-1"/> Add Email Column</Button>
                  </div>
                  {emailColumns.length === 0 && <p className="text-xs text-slate-400 italic">No email columns mapped.</p>}
                  
                  {emailColumns.map((col, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <Select onValueChange={(val) => {
                         const newCols = [...emailColumns];
                         newCols[idx].csvHeader = val;
                         setEmailColumns(newCols);
                      }}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select Email Column" /></SelectTrigger>
                        <SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      
                      <div className="flex items-center space-x-2">
                         <input 
                            type="radio" 
                            name="primary_email" 
                            checked={col.isPrimary} 
                            onChange={() => {
                                const newCols = emailColumns.map((c, i) => ({ ...c, isPrimary: i === idx }));
                                setEmailColumns(newCols);
                            }}
                         />
                         <span className="text-xs text-slate-600">Primary</span>
                      </div>

                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => {
                        setEmailColumns(emailColumns.filter((_, i) => i !== idx));
                      }}><Trash2 size={14}/></Button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 my-2"></div>

                {/* Phones */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-indigo-700">4. Phone Numbers</h3>
                    <Button size="sm" variant="ghost" onClick={addPhoneColumn} className="h-6 text-xs text-indigo-600"><Plus size={12} className="mr-1"/> Add Phone Column</Button>
                  </div>
                  {phoneColumns.length === 0 && <p className="text-xs text-slate-400 italic">No phone columns mapped.</p>}

                  {phoneColumns.map((col, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                      <div className="col-span-5">
                        <Select onValueChange={(val) => {
                          const newCols = [...phoneColumns];
                          newCols[idx].csvHeader = val;
                          setPhoneColumns(newCols);
                        }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Column" /></SelectTrigger>
                          <SelectContent>{csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-4">
                         <Select defaultValue={col.type} onValueChange={(val) => {
                            const newCols = [...phoneColumns];
                            newCols[idx].type = val;
                            setPhoneColumns(newCols);
                         }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mobile">Mobile</SelectItem>
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>

                      <div className="col-span-2 flex items-center space-x-1">
                         <input 
                            type="radio" 
                            name="primary_phone" 
                            checked={col.isPrimary} 
                            onChange={() => {
                                const newCols = phoneColumns.map((c, i) => ({ ...c, isPrimary: i === idx }));
                                setPhoneColumns(newCols);
                            }}
                         />
                         <span className="text-[10px] text-slate-600">Primary</span>
                      </div>

                      <div className="col-span-1">
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => {
                          setPhoneColumns(phoneColumns.filter((_, i) => i !== idx));
                        }}><Trash2 size={14}/></Button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </ScrollArea>
        )}

        {step === 3 && importResult && (
          <div className="py-8 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Import Complete</h3>
            <p className="text-slate-600">Successfully imported <strong className="text-indigo-600">{importResult.imported}</strong> contacts.</p>
            {importResult.skipped_summary?.count > 0 && (
                <p className="text-xs text-red-500">Skipped {importResult.skipped_summary.count} duplicates.</p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 pt-2 border-t">
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? "Importing..." : "Run Import"}
              </Button>
            </>
          )}
          {(step === 1 || step === 3) && <Button variant="outline" onClick={resetState}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
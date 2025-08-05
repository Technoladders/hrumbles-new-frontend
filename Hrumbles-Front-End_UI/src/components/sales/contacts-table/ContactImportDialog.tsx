import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx'; // Import the new library
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useImportCsvData } from '@/hooks/sales/useImportCsvData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { lookupViaCity, findFromCityStateProvince, findFromIsoCode } from 'city-timezones'; // Import timezone finders

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
}

type ColumnMapping = {
  [key: string]: string; // Allow any string key for flexibility
};

interface ImportResult {
    imported: number;
    skipped_summary: {
        count: number;
        records: any[];
    }
}

export const ContactImportDialog: React.FC<ContactImportDialogProps> = ({ open, onOpenChange, fileId }) => {
  const { toast } = useToast();
  const importMutation = useImportCsvData();

  const [step, setStep] = useState(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // [MODIFIED] Add all new native fields to the mappable list.
  const dbFields = [
    'name', 'email', 'mobile', 'alt_mobile', 'job_title', 'linkedin_url',
    'company_name', 'contact_stage', 'country', 'state', 'city', 'notes'
  ];

  // [MODIFIED] A completely new, robust file handler.
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
          // Get headers from the first row if jsonData is not empty
          if (jsonData.length > 0) {
              headers = Object.keys(jsonData[0]);
          }
        } else {
          toast({
            title: "Unsupported File Type",
            description: "Please upload a .csv or .xlsx file.",
            variant: "destructive",
          });
          return;
        }

        setCsvData(jsonData);
        setCsvHeaders(headers);
        setStep(2);
      } catch (error) {
        console.error("File parsing error:", error);
        toast({
          title: "File Read Error",
          description: "Could not read the file. Please ensure it is not corrupted and is a valid .csv or .xlsx file.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
        toast({ title: "File Read Error", description: "There was an issue reading the file.", variant: "destructive" });
    };

    // Use readAsArrayBuffer for XLSX and readAsText for CSV
    if (file.name.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
  };

  // [MODIFIED] Add timezone calculation before sending to the backend.
  const handleImport = () => {
    if (!fileId) {
      toast({ title: "Error", description: "A file must be selected to import contacts.", variant: "destructive" });
      return;
    }
    if (!mapping.name) {
      toast({ title: "Mapping Incomplete", description: "Please map the column for 'Name'.", variant: "destructive" });
      return;
    }
    
    // Add timezone to each row before mutation.
    const dataWithTimezone = csvData.map(row => {
        const country = row[mapping.country || ''];
        const state = row[mapping.state || ''];
        const city = row[mapping.city || ''];
        let timezone = null;
        
        try {
            if (city) {
                const matches = lookupViaCity(city);
                if (matches.length > 0) timezone = matches[0].timezone;
            }
            if (!timezone && state && country) {
                // Note: This function is not ideal, may need a better one if issues persist
                const matches = findFromCityStateProvince(`${state} ${country}`);
                if (matches.length > 0) timezone = matches[0].timezone;
            }
            if (!timezone && country) {
                const matches = findFromIsoCode(country);
                if (matches.length > 0) timezone = matches[0].timezone;
            }
        } catch(e) { /* Fail silently */ }

        // Use a special key to avoid conflicts with user data
        return { ...row, '__timezone': timezone };
    });

    importMutation.mutate(
      { 
        fileId, 
        csvData: dataWithTimezone, 
        // Tell the backend to get the timezone value from our special key
        mapping: { ...mapping, timezone: '__timezone' } 
      },
      {
        onSuccess: (data) => {
          setImportResult(data as any);
          setStep(3);
        },
        onError: (err: any) => {
          toast({ title: "Import Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const resetState = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setCsvData([]);
      setCsvHeaders([]);
      setMapping({});
      setImportResult(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload a CSV or Excel file to begin."}
            {step === 2 && "Map your file's columns to the database fields. 'Name' is required."}
            {step === 3 && "Your import has been processed."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
            <div className="py-4">
                <Label htmlFor="csv-file">CSV or Excel File</Label>
                {/* [MODIFIED] Accept both CSV and XLSX formats */}
                <Input id="csv-file" type="file" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <p className="text-sm text-muted-foreground">Found {csvData.length} rows. Select the corresponding column for each field.</p>
            {dbFields.map(field => (
              <div key={field} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`map-${field}`} className="text-right capitalize">
                  {field.replace(/_/g, ' ')}
                  {field === 'name' && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Column..." /></SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

       {step === 3 && importResult && (
            <div className="py-4 space-y-4">
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-green-600">Import Complete!</h3>
                    <p className="mt-1 text-lg">{importResult.imported} contacts were successfully added.</p>
                </div>
                {importResult.skipped_summary?.records.length > 0 && (
                    <div className="space-y-2">
                        <p className="font-semibold text-center text-muted-foreground">
                           {importResult.skipped_summary.count} contacts were skipped (e.g., duplicates or missing name):
                        </p>
                        <ScrollArea className="h-48 w-full rounded-md border p-2">
                            <div className="space-y-2">
                               {importResult.skipped_summary.records.map((record, index) => {
                                    const name = record[mapping.name || ''] || 'No Name Provided';
                                    const email = record[mapping.email || ''] || 'No Email Provided';
                                    const fallback = String(name).substring(0, 2).toUpperCase();

                                    return (
                                        <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-md">
                                            <Avatar className="h-8 w-8"><AvatarFallback>{fallback}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{name}</p>
                                                <p className="text-xs text-muted-foreground">{email}</p>
                                            </div>
                                        </div>
                                    );
                               })}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
        )}
        
       <DialogFooter>
          {step === 2 && (
            <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" onClick={handleImport} disabled={importMutation.isPending}>
                    {importMutation.isPending ? 'Importing...' : `Import ${csvData.length} Contacts`}
                </Button>
            </>
          )}
         {(step === 1 || step === 3) && <Button type="button" variant="outline" onClick={resetState}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
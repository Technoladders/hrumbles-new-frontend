import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBulkInsertContacts } from '@/hooks/sales/useBulkInsertContacts';
import { SimpleContactInsert } from '@/types/simple-contact.types';
import { useImportCsvData } from '@/hooks/sales/useImportCsvData';
import { ScrollArea } from '@/components/ui/scroll-area'; // A good component for lists
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // For a nice display

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null; // We need the current fileId to associate contacts
}

type ColumnMapping = {
  [key in 'name' | 'email' | 'mobile' | 'job_title' | 'linkedin_url' | 'company_name' | 'contact_stage' | 'notes']?: string;
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
  const importMutation = useImportCsvData(); // 2. Use the new hook

  const [step, setStep] = useState(1);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<{ imported: number, duplicates: number } | null>(null);

 const dbFields: (keyof ColumnMapping)[] = [ 'name', 'email', 'mobile', 'job_title', 'linkedin_url', 'company_name', 'contact_stage', 'notes' ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvHeaders(results.meta.fields || []);
          setCsvData(results.data);
          setStep(2);
        },
        error: (err) => toast({ title: "Parsing Error", description: err.message, variant: "destructive" })
      });
    }
  };

  // 3. Simplify the handleImport function significantly
  const handleImport = () => {
    if (!fileId) {
      toast({ title: "Error", description: "A file must be selected to import contacts.", variant: "destructive" });
      return;
    }
    if (!mapping.email || !mapping.name) {
      toast({ title: "Mapping Incomplete", description: "Please map columns for 'Name' and 'Email'.", variant: "destructive" });
      return;
    }

    importMutation.mutate(
      { fileId, csvData, mapping },
      {
        onSuccess: (data) => {
          // 2. The data now perfectly fits our new state shape
          setImportResult(data);
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
        {/* Header and Step 1, 2, 3 JSX remains the same as before */}
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload a CSV file to begin."}
            {step === 2 && "Map your CSV columns to the database fields. 'Name' and 'Email' are required."}
            {step === 3 && "Your import has been processed."}
          </DialogDescription>
        </DialogHeader>

          {step === 1 && ( <div className="py-4"><Label htmlFor="csv-file">CSV File</Label><Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} /></div> )}

        {step === 2 && (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <p className="text-sm text-muted-foreground">Found {csvData.length} rows. Select the corresponding column from your file for each database field.</p>
            {/* 3. THIS UI WILL NOW AUTOMATICALLY RENDER THE "Notes" MAPPING ROW. NO OTHER CHANGES NEEDED. */}
            {dbFields.map(field => (
              <div key={field} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`map-${field}`} className="text-right capitalize">{field.replace(/_/g, ' ')}</Label>
                <Select onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select CSV Column..." /></SelectTrigger>
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

                {importResult.skipped_summary.records.length > 0 && (
                    <div className="space-y-2">
                        <p className="font-semibold text-center text-muted-foreground">
                           {importResult.skipped_summary.count} contacts were skipped (email already existed):
                        </p>
                        <ScrollArea className="h-48 w-full rounded-md border p-2">
                            <div className="space-y-2">
                               {importResult.skipped_summary.records.map((record, index) => {
                                    const name = record[mapping.name || ''] || 'No Name';
                                    const email = record[mapping.email || ''] || 'No Email';
                                    const fallback = name.substring(0, 2).toUpperCase();

                                    return (
                                        <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-md">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{fallback}</AvatarFallback>
                                            </Avatar>
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
                {/* 4. The button no longer needs to calculate the length */}
                <Button type="submit" onClick={handleImport} disabled={importMutation.isPending}>
                    {importMutation.isPending ? 'Importing...' : `Import Data`}
                </Button>
            </>
          )}
         {(step === 1 || step === 3) && <Button type="button" variant="outline" onClick={resetState}>Close</Button>}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};
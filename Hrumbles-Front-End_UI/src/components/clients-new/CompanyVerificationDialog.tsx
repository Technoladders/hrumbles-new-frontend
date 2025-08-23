// src/components/clients-new/CompanyVerificationDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CompanyResult {
  type: string;
  company_id: string;
  name: string;
  state: string;
  incorporation_date: string;
  company_name_status: string;
}

interface CompanyVerificationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  results: CompanyResult[];
  searchTerm: string;
  onSelectCompany: (company: CompanyResult) => void;
}

export const CompanyVerificationDialog: React.FC<CompanyVerificationDialogProps> = ({
  isOpen, onOpenChange, isLoading, results, searchTerm, onSelectCompany
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Company Verification Results</DialogTitle>
          <DialogDescription>
            Showing results for "{searchTerm}". Please select the correct company to associate with this client.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                  <TableHead>Company Name</TableHead><TableHead>Company ID</TableHead><TableHead>State</TableHead>
                  <TableHead>Incorporation Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {results.length > 0 ? results.map((company) => (
                  <TableRow key={company.company_id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.company_id} <Badge variant="outline">{company.type}</Badge></TableCell>
                    <TableCell>{company.state}</TableCell><TableCell>{company.incorporation_date}</TableCell><TableCell>{company.company_name_status}</TableCell>
                    <TableCell className="text-right"><Button size="sm" onClick={() => onSelectCompany(company)}>Select</Button></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No matching companies found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
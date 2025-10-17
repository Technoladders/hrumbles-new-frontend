// components/Client/McaSearchDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface McaSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const McaSearchDialog: React.FC<McaSearchDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4">
        <DialogHeader>
          <DialogTitle>Find Company on MCA Portal</DialogTitle>
          <DialogDescription>
            Use the official portal below to find the company's CIN. Then, copy and paste it into the main form to verify.
          </DialogDescription>
        </DialogHeader>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Instructions</AlertTitle>
          <AlertDescription>
            1. Search for the company below. <br/>
            2. Click the company name in the search results to see its details. <br/>
            3. Copy the <strong>Corporate Identification Number (CIN)</strong>. <br/>
            4. Close this dialog and paste the CIN into the "CIN" field.
          </AlertDescription>
        </Alert>
        <div className="flex-grow border rounded-md overflow-hidden">
          <iframe
            src="https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do"
            className="w-full h-full"
            title="MCA Company Search"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default McaSearchDialog;
// src/pages/jobs/ai/cards/VerifyCompanyModal.tsx

import { FC } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface VerifyCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  experienceData: any; // Contains the matched experience and comparison data
}

export const VerifyCompanyModal: FC<VerifyCompanyModalProps> = ({ isOpen, onClose, experienceData }) => {
  if (!experienceData) return null;

  const { comparison, company: candidateCompany } = experienceData;
  const uanRecord = comparison?.company?.uanRecord;
  const uanCompany = uanRecord?.['Establishment Name'] || uanRecord?.establishment_name || 'N/A';
  const reason = comparison?.company?.reason || 'No reason provided.';

  const handleMarkVerified = () => {
    // In a real app, you would make an API call here to save the verification status.
    toast.success(`Company "${candidateCompany}" marked as verified.`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Candidate Company</p>
            <p className="font-semibold">{candidateCompany}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">UAN Company</p>
            <p className="font-semibold">{uanCompany}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge> {/* Mock status */}
          </div>
          <p className="text-xs text-gray-500 italic">{reason}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleMarkVerified}>Mark as Verified</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
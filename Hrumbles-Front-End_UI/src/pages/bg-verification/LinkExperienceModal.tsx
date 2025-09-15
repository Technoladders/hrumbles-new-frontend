// src/pages/jobs/ai/cards/LinkExperienceModal.tsx

import { FC } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CareerExperience } from '@/lib/types';
import { UanRecord } from './experienceComparisonUtils';

interface LinkExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingExperience: CareerExperience | null;
  uanExtraRecords: UanRecord[];
  onLink: (uanRecord: UanRecord) => void;
}

export const LinkExperienceModal: FC<LinkExperienceModalProps> = ({ isOpen, onClose, missingExperience, uanExtraRecords, onLink }) => {
  if (!missingExperience) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Experience</DialogTitle>
          <DialogDescription>
            Select a UAN record to link to the candidate's claimed experience at "{missingExperience.company}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
          {uanExtraRecords.map((uan, index) => {
            const companyName = uan['Establishment Name'] || uan.establishment_name;
            const duration = `${uan.Doj || uan.date_of_joining} – ${uan.DateOfExitEpf || uan.date_of_exit || 'Present'}`;
            return (
              <button
                key={index}
                onClick={() => onLink(uan)}
                className="w-full text-left p-2 border rounded-md hover:bg-gray-50"
              >
                <p className="font-semibold">{companyName}</p>
                <p className="text-sm text-gray-500">{duration}</p>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
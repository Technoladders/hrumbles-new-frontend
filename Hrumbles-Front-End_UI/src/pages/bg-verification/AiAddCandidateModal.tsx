// import { useState } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { Button } from '@/components/ui/button';
// import { Wand2, Edit } from 'lucide-react';
// import { AiResumeUpload } from './AiResumeUpload';
// import { ManualCandidateForm } from './ManualCandidateForm'; // We will create this

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   jobId: string;
// }

// type View = 'choice' | 'ai_upload' | 'manual_form';

// export const AiAddCandidateModal = ({ isOpen, onClose, jobId }: Props) => {
//   const [view, setView] = useState<View>('choice');

//   const handleClose = () => {
//     setView('choice'); // Reset view when closing
//     onClose();
//   };

//   const renderContent = () => {
//     switch (view) {
//       case 'ai_upload':
//         return <AiResumeUpload onBack={() => setView('choice')} jobId={jobId} closeModal={handleClose} />;
//       case 'manual_form':
//         return <ManualCandidateForm onBack={() => setView('choice')} jobId={jobId} closeModal={handleClose} />;
//       case 'choice':
//       default:
//         return (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
//             <Button variant="outline" className="h-32 flex flex-col gap-2" onClick={() => setView('ai_upload')}>
//               <Wand2 className="h-8 w-8 text-purple-500" />
//               <span className="font-semibold">Fetch with AI</span>
//             </Button>
//             <Button variant="outline" className="h-32 flex flex-col gap-2" onClick={() => setView('manual_form')}>
//               <Edit className="h-8 w-8 text-blue-500" />
//               <span className="font-semibold">Enter Manually</span>
//             </Button>
//           </div>
//         );
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={handleClose}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Add a New Candidate</DialogTitle>
//           <DialogDescription>Choose your preferred method to add a candidate to this job.</DialogDescription>
//         </DialogHeader>
//         {renderContent()}
//       </DialogContent>
//     </Dialog>
//   );
// };

// Removed fetch with AI and Enter Manually option

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AiResumeUpload } from './AiResumeUpload';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export const AiAddCandidateModal = ({ isOpen, onClose, jobId }: Props) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Candidate</DialogTitle>
          <DialogDescription>Upload a resume to add a candidate to this job.</DialogDescription>
        </DialogHeader>
        <AiResumeUpload jobId={jobId} closeModal={onClose} />
      </DialogContent>
    </Dialog>
  );
};
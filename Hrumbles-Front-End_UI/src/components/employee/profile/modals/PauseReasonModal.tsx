
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coffee, UtensilsCrossed, X } from "lucide-react";

interface PauseReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReason: (reason: string) => void;
}

export const PauseReasonModal: React.FC<PauseReasonModalProps> = ({
  isOpen,
  onClose,
  onSelectReason,
}) => {
  const handleSelectReason = (reason: string) => {
    onSelectReason(reason);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="p-3 bg-gradient-to-r from-[#30409F] to-[#4B5FBD] sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-white" />
              <DialogTitle className="text-sm font-semibold text-white tracking-tight">Select Pause Reason</DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 p-3">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 p-6"
              onClick={() => handleSelectReason("Lunch Break")}
            >
              <UtensilsCrossed className="h-6 w-6" />
              <span>Lunch Break</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 p-6"
              onClick={() => handleSelectReason("Coffee Break")}
            >
              <Coffee className="h-6 w-6" />
              <span>Coffee Break</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

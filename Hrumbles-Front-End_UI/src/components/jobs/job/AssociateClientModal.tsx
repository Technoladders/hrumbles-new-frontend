import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/jobs/ui/dialog";
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import { toast } from "sonner";

const AssociateClientModal = ({ isOpen, onClose, job, onAssociate }) => {
  const [clientName, setClientName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Client name cannot be empty.");
      return;
    }
    try {
      // --- CHANGE 2: Build the updated job object here ---
      const updatedJobPayload = {
        ...job, // Keep all existing job data
        submissionType: "Client Side", // This is the required fix
        clientOwner: clientName,       // Update the top-level owner
        clientDetails: {
          ...job.clientDetails,         // Preserve other details like budget
          clientName: clientName,      // Update the name within the details object
        },
      };

      // --- CHANGE 3: Pass the entire object to the parent's handler ---
      await onAssociate(updatedJobPayload);
      
      toast.success(`Client "${clientName}" associated with job "${job.title}" successfully.`);
      onClose(); // Close the modal after successful association
    } catch (error) {
      console.error("Error associating client:", error);
      toast.error("Failed to associate client. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Associate Client with Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Associate Client</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssociateClientModal;
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/jobs/ui/dialog";
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import { toast } from "sonner";

const AssociateClientModal = ({ isOpen, onClose, job, onAssociate }) => {
  const [clientName, setClientName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Call the function to associate the client with the job
      await onAssociate(job.id, clientName);
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
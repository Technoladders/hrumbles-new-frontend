
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NewEmployee } from "@/types/project-types";

interface CreateEmployeeDialogProps {
  onEmployeeCreated: () => void;
}

export const CreateEmployeeDialog = ({ onEmployeeCreated }: CreateEmployeeDialogProps) => {
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({ name: '', department: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.department) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    
    try {
      const { data, error } = await supabase.from('hr_employees').insert({
        name: newEmployee.name,
        department: newEmployee.department
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Employee created successfully");
      onEmployeeCreated();
      setNewEmployee({ name: '', department: '' });
      setDialogOpen(false);
      
      // Log success with the data
      console.log("Employee created successfully:", data);
    } catch (err) {
      console.error("Error creating employee:", err);
      toast.error("Failed to create employee");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee-name">Employee Name *</Label>
            <Input 
              id="employee-name"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
              placeholder="Enter employee name" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Input 
              id="department"
              value={newEmployee.department}
              onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
              placeholder="Enter department" 
            />
          </div>
          <Button 
            onClick={handleCreateEmployee} 
            className="w-full"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

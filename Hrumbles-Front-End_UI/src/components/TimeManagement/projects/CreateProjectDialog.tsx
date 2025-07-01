
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NewProject } from "@/types/project-types";
import { useSelector } from "react-redux";

interface CreateProjectDialogProps {
  onProjectCreated: () => void;
}

export const CreateProjectDialog = ({ onProjectCreated }: CreateProjectDialogProps) => {
  const [newProject, setNewProject] = useState<NewProject>({ name: '', client: '', start_date: '', end_date: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.start_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { data, error } = await supabase.from('hr_projects').insert({
        name: newProject.name,
        client: newProject.client,
        start_date: newProject.start_date,
        end_date: newProject.end_date || null,
        status: 'Active',
        organization_id: organization_id,
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Project created successfully");
      onProjectCreated();
      setNewProject({ name: '', client: '', start_date: '', end_date: '' });
      setDialogOpen(false);
      
      // Log success with the data
      console.log("Project created successfully:", data);
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input 
              id="project-name"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="Enter project name" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input 
              id="client"
              value={newProject.client}
              onChange={(e) => setNewProject({...newProject, client: e.target.value})}
              placeholder="Enter client name" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input 
                id="start-date"
                type="date"
                value={newProject.start_date}
                onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date"
                type="date"
                value={newProject.end_date || ''}
                onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
              />
            </div>
          </div>
          <Button 
            onClick={handleCreateProject} 
            className="w-full"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

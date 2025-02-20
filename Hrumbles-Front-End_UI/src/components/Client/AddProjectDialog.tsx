import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import supabase from "../../config/supabaseClient";
import { toast } from "sonner";

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const AddProjectDialog = ({ open, onOpenChange, clientId }: AddProjectDialogProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Form states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [employeesNeeded, setEmployeesNeeded] = useState("");
  const [noOfDays, setNoOfDays] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  // Calculate duration dynamically when start or end date changes
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const duration = Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
      );
      setNoOfDays(duration > 0 ? duration : 0);
    } else {
      setNoOfDays(0);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      if (!user || !organization_id) {
        toast.error("Authentication error: Missing user or organization ID");
        return;
      }
  
      // ✅ 1. Upload file to Supabase Storage if a file is selected
      let fileUrl: string | null = null;

      if (file) {
        const fileName = `projects/${Date.now()}-${file.name}`; // Unique file name
        const { data, error } = await supabase.storage.from("hr_project_files").upload(fileName, file);
        if (error) throw error;
        fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hr_project_files/${fileName}`;
      }
  
      // ✅ 2. Insert project details including the file URL
      const newProject = {
        client_id: clientId,
        name: projectName,
        start_date: startDate,
        end_date: endDate,
        duration: noOfDays,
        employees_needed: parseInt(employeesNeeded) || 0,
        organization_id,
        created_by: user.id,
        updated_by: user.id,
        attachment: fileUrl, // ✅ Save file path in the database
      };
  
      const { error } = await supabase.from("hr_projects").insert([newProject]);
      if (error) throw error;
  
      toast.success("Project added successfully");
      queryClient.invalidateQueries({ queryKey: ["client-projects"] });
      onOpenChange(false);
  
      // ✅ Reset form
      setStartDate("");
      setEndDate("");
      setProjectName("");
      setEmployeesNeeded("");
      setNoOfDays(0);
      setFile(null);
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Failed to add project");
    }
  };
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name*</Label>
            <Input
              id="projectName"
              placeholder="Enter Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date*</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, endDate)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date*</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange(startDate, e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No. of Employees Needed</Label>
              <Input
                type="number"
                min="0"
                value={employeesNeeded}
                onChange={(e) => setEmployeesNeeded(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>No. of Days</Label>
              <Input type="number" value={noOfDays} disabled />
            </div>
          </div>

          {/* ✅ File Upload */}
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Attachments (e.g., SOW)</p>
            <input type="file" accept=".pdf,.png,.jpg" onChange={handleFileUpload} />
            {file && <p className="text-xs text-muted-foreground mt-2">{file.name}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Supported format: PDF, PNG, JPG
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;

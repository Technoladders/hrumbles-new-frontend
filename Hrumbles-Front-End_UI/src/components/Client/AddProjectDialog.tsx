
import React, { useState, useRef, useEffect } from "react";
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
import { X, Upload } from "lucide-react";

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  employees_needed: number;
  attachment?: string | null;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  editProject?: Project | null;
}

const AddProjectDialog = ({ open, onOpenChange, clientId, editProject }: AddProjectDialogProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [employeesNeeded, setEmployeesNeeded] = useState("");
  const [noOfDays, setNoOfDays] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);

  // Format date to YYYY-MM-DD
  const formatDate = (date: string | Date): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  };

  // Pre-fill form for editing
  useEffect(() => {
    console.log("editProject:", editProject); // Debug log
    if (editProject && open) {
      setProjectName(editProject.name || "");
      setStartDate(formatDate(editProject.start_date));
      setEndDate(formatDate(editProject.end_date));
      setEmployeesNeeded(editProject.employees_needed?.toString() || "");
      setNoOfDays(editProject.duration || 0);
      setExistingAttachment(editProject.attachment || null);
      setFile(null);
      setErrors({});
    } else if (!editProject && open) {
      resetForm();
    }
  }, [editProject, open]);

  // Validate form inputs
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!projectName.trim()) newErrors.projectName = "Project name is required";
    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    if (employeesNeeded && parseInt(employeesNeeded) < 0) {
      newErrors.employeesNeeded = "Number of employees cannot be negative";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate duration dynamically
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

  // Handle file upload
  const handleFileUpload = (selectedFile: File | null) => {
    if (selectedFile) {
      const validTypes = ["application/pdf", "image/png", "image/jpeg"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Invalid file type. Please upload PDF, PNG, or JPG.");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }
      setFile(selectedFile);
      setExistingAttachment(null); // Clear existing attachment if new file is uploaded
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    setFile(null);
    setExistingAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setProjectName("");
    setEmployeesNeeded("");
    setNoOfDays(0);
    setFile(null);
    setExistingAttachment(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting.");
      return;
    }

    try {
      if (!user || !organization_id) {
        toast.error("Authentication error: Missing user or organization ID");
        return;
      }

      // Upload new file to Supabase Storage
      let fileUrl: string | null = existingAttachment;
      if (file) {
        const fileName = `projects/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage.from("hr_project_files").upload(fileName, file);
        if (error) throw error;
        fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hr_project_files/${fileName}`;
      }

      const projectData = {
        client_id: clientId,
        name: projectName,
        start_date: startDate,
        end_date: endDate,
        duration: noOfDays,
        employees_needed: parseInt(employeesNeeded) || 0,
        organization_id,
        updated_by: user.id,
        attachment: fileUrl,
      };

      if (editProject) {
        // Update existing project
        const { error } = await supabase
          .from("hr_projects")
          .update(projectData)
          .eq("id", editProject.id)
          .eq("organization_id", organization_id);
        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        // Insert new project
        const { error } = await supabase.from("hr_projects").insert({
          ...projectData,
          created_by: user.id,
          organization_id
        });
        if (error) throw error;
        toast.success("Project added successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["client-projects"] });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(`Failed to ${editProject ? "update" : "add"} project`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-lg shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-800">
            {editProject ? "Edit Project" : "Add New Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="projectName" className="text-sm font-medium text-gray-700">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectName"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ${
                errors.projectName ? "border-red-500" : ""
              }`}
              required
            />
            {errors.projectName && (
              <p className="text-xs text-red-500 mt-1">{errors.projectName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, endDate)}
                className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ${
                  errors.startDate ? "border-red-500" : ""
                }`}
                required
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange(startDate, e.target.value)}
                className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ${
                  errors.endDate ? "border-red-500" : ""
                }`}
                required
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">No. of Employees Needed</Label>
              <Input
                type="number"
                min="0"
                value={employeesNeeded}
                onChange={(e) => setEmployeesNeeded(e.target.value)}
                className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ${
                  errors.employeesNeeded ? "border-red-500" : ""
                }`}
              />
              {errors.employeesNeeded && (
                <p className="text-xs text-red-500 mt-1">{errors.employeesNeeded}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">No. of Days</Label>
              <Input
                type="number"
                value={noOfDays}
                disabled
                className="bg-gray-100 border-gray-300"
              />
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept=".pdf,.png,.jpg"
              onChange={handleFileInputChange}
              className="hidden"
              ref={fileInputRef}
            />
            {!file && !existingAttachment ? (
              <div>
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Drag and drop or{" "}
                  <span
                    className="text-blue-600 cursor-pointer hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </span>{" "}
                  to upload
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: PDF, PNG, JPG (Max 5MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                <p className="text-sm text-gray-600 truncate">
                  {file ? file.name : existingAttachment?.split("/").pop()}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
            >
              {editProject ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;

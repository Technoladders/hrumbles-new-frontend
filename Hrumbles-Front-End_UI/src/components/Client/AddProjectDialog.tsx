
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import supabase from "../../config/supabaseClient";
import { toast } from "sonner";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "../../components/ui/command";
import { X, Upload, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";


interface Client {
  id: string;
  display_name: string;
}

interface Project {
  id: string;
  client_id: string;
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
  editingProject?: Project | null;
}

const AddProjectDialog = ({ open, onOpenChange, editingProject }: AddProjectDialogProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- NEW: Fetch clients for the combobox ---
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['clients-list', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from('hr_clients')
        .select('id, display_name')
        .eq('organization_id', organization_id)
        .order('display_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organization_id, // Only fetch when dialog is open
  });


  // Form states
   const [selectedClientId, setSelectedClientId] = useState(""); // NEW
  const [isPopoverOpen, setIsPopoverOpen] = useState(false); // NEW for combobox
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

  useEffect(() => {
    if (editingProject && open) {
      setSelectedClientId(editingProject.client_id || ""); // Set client for edit
      setProjectName(editingProject.name || "");
      setStartDate(formatDate(editingProject.start_date));
      setEndDate(formatDate(editingProject.end_date));
      setEmployeesNeeded(editingProject.employees_needed?.toString() || "");
      setNoOfDays(editingProject.duration || 0);
      setExistingAttachment(editingProject.attachment || null);
      setFile(null);
      setErrors({});
    } else if (!editingProject && open) {
      resetForm();
    }
  }, [editingProject, open]);


  // Validate form inputs
   const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!selectedClientId) newErrors.clientId = "Client is required"; // NEW validation
    if (!projectName.trim()) newErrors.projectName = "Project name is required";
    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Calculate duration dynamically
const handleDateChange = (start: string, end: string) => {
  setStartDate(start);
  setEndDate(end);

  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1; // Include end date
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
    setSelectedClientId(""); // Reset client
    setProjectName("");
    setStartDate("");
    setEndDate("");
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
        client_id: selectedClientId,
        name: projectName,
        start_date: startDate,
        end_date: endDate,
        duration: noOfDays,
        employees_needed: parseInt(employeesNeeded) || 0,
        organization_id,
        updated_by: user.id,
        attachment: fileUrl,
      };

      if (editingProject) {
        const { error } = await supabase.from("hr_projects").update(projectData).eq("id", editingProject.id);
        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        const { error } = await supabase.from("hr_projects").insert({ ...projectData, created_by: user.id });
        if (error) throw error;
        toast.success("Project added successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] }); // Invalidate main projects list
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(`Failed to ${editingProject ? "update" : "add"} project`);
    }
  };

   return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) resetForm(); }}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-lg shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-800">
            {editingProject ? "Edit Project" : "Add New Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- NEW CLIENT COMBOBOX --- */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-sm font-medium text-gray-700">
              Client <span className="text-red-500">*</span>
            </Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isPopoverOpen}
                  className={`w-full justify-between font-normal ${!selectedClientId && "text-muted-foreground"} ${errors.clientId ? "border-red-500" : ""}`}
                >
                  {selectedClientId
                    ? clients?.find((client) => client.id === selectedClientId)?.display_name
                    : "Select client..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0">
                <Command>
                  <CommandInput placeholder="Search client..." />
                  <CommandEmpty>{isLoadingClients ? "Loading..." : "No client found."}</CommandEmpty>
                  <CommandGroup>
                    {clients?.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.display_name}
                        onSelect={() => {
                          setSelectedClientId(client.id);
                          setIsPopoverOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                        {client.display_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.clientId && <p className="text-xs text-red-500 mt-1">{errors.clientId}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name <span className="text-red-500">*</span></Label>
            <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
            {errors.projectName && <p className="text-xs text-red-500 mt-1">{errors.projectName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={startDate} onChange={(e) => handleDateChange(e.target.value, endDate)} required />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label>End Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={endDate} onChange={(e) => handleDateChange(startDate, e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No. of Employees Needed</Label>
              <Input type="number" min="0" value={employeesNeeded} onChange={(e) => setEmployeesNeeded(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>No. of Days</Label>
              <Input type="number" value={noOfDays} disabled className="bg-gray-100" />
            </div>
          </div>

          {/* File Upload section is the same */}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingProject ? "Update Project" : "Create Project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;

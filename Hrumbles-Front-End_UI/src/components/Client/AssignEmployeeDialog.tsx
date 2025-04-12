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
import { Select, SelectTrigger, SelectContent, SelectItem } from "../../components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import supabase from "../../config/supabaseClient";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientId: string;
}

const AssignEmployeeDialog = ({ open, onOpenChange, projectId, clientId }: AssignEmployeeDialogProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
    const [sowFile, setSowFile] = useState<File | null>(null);

  // State for multiple employee rows
  const [employeesList, setEmployeesList] = useState([
    {
      assign_employee: "",
      start_date: "",
      end_date: "",
      salary: "",
      client_billing: "",
      status: "active",
      sowFile: null as File | null,
      noOfDays: 0,
    },
  ]);

  const [employees, setEmployees] = useState<any[]>([]);

  // Fetch employees from `hr_employees`
  React.useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name")
        .eq("organization_id", organization_id);
      if (!error && data) {
        setEmployees(data);
      }
    };
    if (organization_id) fetchEmployees();
  }, [organization_id]);

  // Handle adding a new row
  const addEmployeeRow = () => {
    setEmployeesList([...employeesList, {
      assign_employee: "",
      start_date: "",
      end_date: "",
      salary: "",
      client_billing: "",
      status: "active",
      sowFile: null,
      noOfDays: 0,
    }]);
  };

  // Handle removing a row
  const removeEmployeeRow = (index: number) => {
    setEmployeesList(employeesList.filter((_, i) => i !== index));
  };


  // Handle field changes
  const handleFieldChange = (index: number, field: string, value: any) => {
    const updatedList = [...employeesList];
    updatedList[index][field] = value;

    // Calculate duration dynamically when start or end date changes
    if (field === "start_date" || field === "end_date") {
      if (updatedList[index].start_date && updatedList[index].end_date) {
        const duration = Math.ceil(
          (new Date(updatedList[index].end_date).getTime() - new Date(updatedList[index].start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        updatedList[index].noOfDays = duration > 0 ? duration : 0;
      } else {
        updatedList[index].noOfDays = 0;
      }
    }

    setEmployeesList(updatedList);
  };



  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!user || !organization_id) {
        toast.error("Authentication error: Missing user or organization ID");
        return;
      }

      const newAssignments = await Promise.all(
        employeesList.map(async (employee) => {
          let sowUrl: string | null = null;
          if (employee.sowFile) {
            const fileName = `assignments/${Date.now()}-${employee.sowFile.name}`;
            const { data, error } = await supabase.storage
              .from("hr_project_files")
              .upload(fileName, employee.sowFile);
            if (error) throw error;
            sowUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hr_project_files/${fileName}`;
          }

          return {
            id: crypto.randomUUID(),
            project_id: projectId,
            client_id: clientId,
            assign_employee: employee.assign_employee,
            start_date: employee.start_date,
            end_date: employee.end_date,
            salary: parseFloat(employee.salary) || 0,
            client_billing: parseFloat(employee.client_billing) || 0,
            status: employee.status,
            sow: sowUrl,
            organization_id,
            created_by: user.id,
            updated_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        })
      );

      const { error } = await supabase.from("hr_project_employees").insert(newAssignments);
      if (error) throw error;

      toast.success("Employees assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["project-employees"] });
      onOpenChange(false);
      setEmployeesList([
        {
          assign_employee: "",
          start_date: "",
          end_date: "",
          salary: "",
          client_billing: "",
          status: "active",
          sowFile: null,
          noOfDays: 0,
        },
      ]);
    } catch (error) {
      console.error("Error assigning employees:", error);
      toast.error("Failed to assign employees");
    }
  };

    const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
       if (e.target.files && e.target.files[0]) {
         handleFieldChange(index, "sowFile", e.target.files[0]);
       }
     };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto p-6 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle>Assign Employees</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {employeesList.map((employee, index) => (
            <div key={index} className="border p-3 rounded-lg flex gap-4 items-center flex-wrap bg-white shadow-sm relative">
              

              {/* Employee Selection */}
              <div className="w-[18%]">
                <Label>Select Employee*</Label>
                <Select onValueChange={(value) => handleFieldChange(index, "assign_employee", value)} value={employee.assign_employee}>
                  <SelectTrigger>{employee.assign_employee ? employees.find((e) => e.id === employee.assign_employee)?.first_name : "Select an employee"}</SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start & End Date */}
            
  <div className="w-[12%]">
    <Label htmlFor={`start-date-${index}`}>Start Date*</Label>
    <Input 
      id={`start-date-${index}`} 
      type="date" 
      value={employee.start_date} 
      onChange={(e) => handleFieldChange(index, "start_date", e.target.value)} 
      required 
    />
  </div>
  
  <div className="w-[12%]">
    <Label htmlFor={`end-date-${index}`}>End Date*</Label>
    <Input 
      id={`end-date-${index}`} 
      type="date" 
      value={employee.end_date} 
      onChange={(e) => handleFieldChange(index, "end_date", e.target.value)} 
      required 
    />
  </div>

  <div className="w-[8%]">
    <Label>Days</Label>
    <Input type="number" value={employee.noOfDays} disabled />
  </div>



              {/* Salary & Client Billing */}

                <div className="w-[12%]">
                  <Label>Salary</Label>
                <Input type="number" value={employee.salary} onChange={(e) => handleFieldChange(index, "salary", e.target.value)} />
                </div>
                <div className="w-[12%]">
                  <Label>Client Billing</Label>
                <Input type="number" value={employee.client_billing} onChange={(e) => handleFieldChange(index, "client_billing", e.target.value)} />
                </div>
           
                {/* File Upload */}
                <div className="w-[12%]">
                <Label>SOW</Label>

         <Input type="file"  accept=".pdf,.png,.jpg" onChange={(e) => handleFileUpload(index, e)} />
         </div>
         <Trash2 className="w-5 h-5 text-red-500 cursor-pointer absolute right-2 top-2" onClick={() => removeEmployeeRow(index)} />
            </div>
          ))}
          <Button type="button" onClick={addEmployeeRow} className="w-full">
            <Plus className="w-5 h-5 mr-2" /> Add Row
          </Button>
          <Button type="submit" className="w-full">Assign Employees</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignEmployeeDialog;

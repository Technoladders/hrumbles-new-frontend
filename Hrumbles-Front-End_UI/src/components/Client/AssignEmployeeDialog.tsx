import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import supabase from "../../config/supabaseClient";
import { toast } from "sonner";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

interface Client {
  id: string;
  display_name: string;
  currency: string;
}

interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  salary: number;
  salary_currency: string;
  salary_type: string;
  client_billing: number;
  status: string;
  sow: string | null;
  duration: number;
  working_hours?: number;
  billing_type?: string;
  working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working';
  hr_employees?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientId: string;
  editEmployee?: AssignEmployee | null;
  project: string | any;
}

const AssignEmployeeDialog = ({ open, onOpenChange, projectId, clientId, editEmployee, project }: AssignEmployeeDialogProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const projectData = typeof project === "string" ? JSON.parse(project) : project;
  const projectStartDate = projectData?.start_date ? new Date(projectData.start_date) : new Date();
  const projectEndDate = projectData?.end_date ? new Date(projectData.end_date) : null;

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeAssignments, setEmployeeAssignments] = useState<
    {
      assign_employee: string;
      start_date: string;
      end_date: string;
      salary: string;
      salary_currency: string;
      salary_type: string;
      client_billing: string;
      billing_type: string;
      status: string;
      sowFile: File | null;
      noOfDays: number;
      working_hours: string;
      working_days_config: 'all_days' | 'weekdays_only' | 'saturday_working';
    }[]
  >([]);

  const { data: clients = [], isLoading: loadingClients, error: clientsError } = useQuery<Client[]>({
    queryKey: ["clients", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name, currency")
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!organization_id,
  });

  const client = clients.find((c) => c.id === clientId);
  // This is the correct currency symbol for the client, which we will use.
  const currencySymbol = client?.currency === "USD" ? "$" : "₹";
  const billingTypeOptions = ["Monthly", "Hourly"];
  const salaryTypeOptions = ["LPA", "Monthly", "Hourly"];

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, salary, salary_type")
        .eq("organization_id", organization_id);
      if (!error && data) {
        setEmployees(data);
      } else {
        toast.error("Failed to fetch employees");
      }
    };
    if (organization_id) fetchEmployees();
  }, [organization_id]);

  useEffect(() => {
    if (clientsError) {
      toast.error("Failed to fetch clients");
      console.error("Clients fetch error:", clientsError);
    }
  }, [clientsError]);

  useEffect(() => {
    if (editEmployee) {
      setSelectedEmployeeIds([editEmployee.assign_employee]);
      setEmployeeAssignments([
        {
          assign_employee: editEmployee.assign_employee,
          start_date: editEmployee.start_date,
          end_date: editEmployee.end_date,
          salary: editEmployee.salary.toString(),
          salary_currency: editEmployee.salary_currency || "INR",
          salary_type: editEmployee.salary_type || "Monthly",
          client_billing: editEmployee.client_billing.toString(),
          billing_type: editEmployee.billing_type || "Monthly",
          status: editEmployee.status,
          sowFile: null,
          noOfDays: editEmployee.duration,
          working_hours: editEmployee.working_hours?.toString() || "0",
          working_days_config: editEmployee.working_days_config || "all_days",
        },
      ]);
    } else {
      setSelectedEmployeeIds([]);
      setEmployeeAssignments([]);
    }
  }, [editEmployee]);

  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedEmployeeIds([]);
      setEmployeeAssignments([]);
      setSelectedEmployeeId("");
    }
  };

  const handleEmployeeSelection = (employeeId: string) => {
    if (editEmployee) return;
    if (!employeeId || selectedEmployeeIds.includes(employeeId)) return;

    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setSelectedEmployeeIds((prev) => [...prev, employeeId]);
      setEmployeeAssignments((prev) => [
        ...prev,
        {
          assign_employee: employeeId,
          start_date: projectData.start_date || "",
          end_date: projectData.end_date || "",
          salary: employee.salary?.toString() || "0",
          salary_currency: employee.salary_currency || "INR",
          salary_type: employee.salary_type || "Monthly",
          client_billing: "",
          billing_type: "Monthly",
          status: "Working",
          sowFile: null,
          noOfDays: projectData.duration || 0,
          working_hours: "8",
          working_days_config: "all_days",
        },
      ]);
    }
    setSelectedEmployeeId("");
  };

  const handleRemoveEmployee = (employeeId: string, index: number) => {
    if (editEmployee) return;
    setSelectedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
    setEmployeeAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    const updatedList = [...employeeAssignments];
    if (field === "start_date" || field === "end_date") {
      const dateStr = value instanceof Date ? format(value, "yyyy-MM-dd") : "";
      updatedList[index][field] = dateStr;
    } else {
      updatedList[index][field] = value;
    }

    if (field === "start_date" || field === "end_date") {
      if (updatedList[index].start_date && updatedList[index].end_date) {
        const duration = Math.ceil(
          (new Date(updatedList[index].end_date).getTime() -
            new Date(updatedList[index].start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        updatedList[index].noOfDays = duration > 0 ? duration : 0;
      } else {
        updatedList[index].noOfDays = 0;
      }
    }

    setEmployeeAssignments(updatedList);
  };

  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFieldChange(index, "sowFile", e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!user || !organization_id) {
        toast.error("Authentication error: Missing user or organization ID");
        return;
      }

      if (employeeAssignments.length === 0) {
        toast.error("Please select at least one employee");
        return;
      }

      for (const assignment of employeeAssignments) {
        if (
          !assignment.assign_employee ||
          !assignment.start_date ||
          !assignment.end_date ||
          !assignment.client_billing ||
          !assignment.billing_type ||
          !assignment.salary_currency ||
          !assignment.salary_type ||
           !assignment.working_hours
        ) {
          toast.error("Please fill in all required fields (Employee, Start Date, End Date, Client Billing, Billing Type, Salary Currency, Salary Type, Working Hours)");
          return;
        }

        const startDate = new Date(assignment.start_date);
        const endDate = new Date(assignment.end_date);
        if (startDate < projectStartDate || (projectEndDate && endDate > projectEndDate)) {
          toast.error(
            `Assignment dates must be within project range (${format(projectStartDate, "PPP")} to ${projectEndDate ? format(projectEndDate, "PPP") : "ongoing"})`
          );
          return;
        }
        if (startDate > endDate) {
          toast.error("End date must be after start date");
          return;
        }
      }

      if (editEmployee) {
        const assignment = employeeAssignments[0];
        const { error } = await supabase
          .from("hr_project_employees")
          .update({
            start_date: assignment.start_date,
            end_date: assignment.end_date,
            salary: parseFloat(assignment.salary) || 0,
            salary_currency: assignment.salary_currency,
            salary_type: assignment.salary_type,
            client_billing: parseFloat(assignment.client_billing) || 0,
            working_hours: parseFloat(assignment.working_hours) || 8,
            working_days_config: assignment.working_days_config,
            billing_type: assignment.billing_type,
            status: assignment.status,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editEmployee.id)
          .eq("organization_id", organization_id);

        if (error) throw error;

        let sowUrl: string | null = editEmployee.sow;
        if (assignment.sowFile) {
          const fileName = `assignments/${Date.now()}-${assignment.sowFile.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from("hr_project_files")
            .upload(fileName, assignment.sowFile);
          if (uploadError) throw uploadError;
          sowUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/hr_project_files/${fileName}`;

          const { error: sowUpdateError } = await supabase
            .from("hr_project_employees")
            .update({ sow: sowUrl })
            .eq("id", editEmployee.id)
            .eq("organization_id", organization_id);
          if (sowUpdateError) throw sowUpdateError;
        }

        toast.success("Employee assignment updated successfully");
      } else {
        const newAssignments = await Promise.all(
          employeeAssignments.map(async (employee) => {
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
              salary_currency: employee.salary_currency,
              salary_type: employee.salary_type,
              client_billing: parseFloat(employee.client_billing) || 0,
              billing_type: employee.billing_type,
              status: employee.status,
             working_hours: parseFloat(employee.working_hours) || 8,
              sow: sowUrl,
               working_days_config: employee.working_days_config,
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
      }

      queryClient.invalidateQueries({ queryKey: ["project-employee", projectId] });
      handleDialogClose(false);
    } catch (error) {
      console.error("Error assigning employees:", error);
      toast.error("Failed to assign employees");
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleDialogClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
     <DialogContent className="w-full max-w-[90vw] sm:max-w-5xl max-h-[80vh] overflow-y-auto p-4 sm:p-6 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {editEmployee ? "Edit Employee Assignment" : "Assign Employees to Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {!editEmployee && (
            <div>
              <Label htmlFor="employee" className="text-sm font-medium">
                Select Employees*
              </Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={handleEmployeeSelection}
                disabled={!employees.length || loadingClients}
              >
                <SelectTrigger id="employee" className="mt-1.5">
                  <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem
                      key={employee.id}
                      value={employee.id}
                      disabled={selectedEmployeeIds.includes(employee.id)}
                    >
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployeeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEmployeeIds.map((employeeId, index) => {
                    const employee = employees.find((e) => e.id === employeeId);
                    return (
                      <Badge key={employeeId} variant="secondary" className="p-1 px-2">
                        <span className="truncate max-w-[150px]">
                          {employee?.first_name} {employee?.last_name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => handleRemoveEmployee(employeeId, index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {employeeAssignments.length > 0 && (
            <div className="space-y-4 border rounded-md p-4">
            {employeeAssignments.map((assignment, index) => {
              const employee = employees.find((e) => e.id === assignment.assign_employee);
              const startDate = assignment.start_date ? new Date(assignment.start_date) : null;
              const endDate = assignment.end_date ? new Date(assignment.end_date) : null;
              
              return (
                <div
                  key={index}
                  className="border-b last:border-b-0 pb-4 last:pb-0 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {employee?.first_name} {employee?.last_name}
                    </h3>
                    {!editEmployee && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemoveEmployee(assignment.assign_employee, index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">Start Date*</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-sm",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : "Select Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => handleFieldChange(index, "start_date", date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                            fromDate={projectStartDate}
                            toDate={projectEndDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">End Date*</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-sm",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Select Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => handleFieldChange(index, "end_date", date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                            fromDate={startDate || projectStartDate}
                            toDate={projectEndDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">Working Days Calculation*</Label>
                      <RadioGroup
                        value={assignment.working_days_config}
                        onValueChange={(value) => handleFieldChange(index, "working_days_config", value)}
                        className="flex flex-col-1 space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all_days" id={`r1-${index}`} />
                          <Label htmlFor={`r1-${index}`} className="text-sm">All Days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekdays_only" id={`r2-${index}`} />
                          <Label htmlFor={`r2-${index}`} className="text-sm">Weekdays Only</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="saturday_working" id={`r3-${index}`} />
                          <Label htmlFor={`r3-${index}`} className="text-sm">Mon-Sat</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">Days</Label>
                      <Input
                        type="number"
                        value={assignment.noOfDays}
                        disabled
                        className="w-full text-sm bg-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      {/* --- CHANGE 1: EDITABLE SWITCH REMOVED --- */}
                      <Label className="text-sm font-medium">Salary</Label>
                      <div className="flex items-center gap-0">
                        <Select
                          value={assignment.salary_currency}
                          onValueChange={(value) => handleFieldChange(index, "salary_currency", value)}
                          required
                        >
                          {/* `disabled` and `cn` props removed */}
                          <SelectTrigger className="w-[60px] text-sm">
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR" className="text-sm">₹</SelectItem>
                            <SelectItem value="USD" className="text-sm">$</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={assignment.salary}
                          onChange={(e) => handleFieldChange(index, "salary", e.target.value)}
                          // `disabled` and `cn` props removed
                          className="w-full pl-6 text-sm"
                        />
                        <Select
                          value={assignment.salary_type}
                          onValueChange={(value) => handleFieldChange(index, "salary_type", value)}
                          required
                        >
                          {/* `disabled` and `cn` props removed */}
                          <SelectTrigger className="w-[80px] text-sm">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {salaryTypeOptions.map((type) => (
                              <SelectItem key={type} value={type} className="text-sm">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">Client Billing*</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            {/* --- CHANGE 2: CLIENT CURRENCY SYMBOL USED --- */}
                            {currencySymbol}
                          </span>
                          <Input
                            type="number"
                            value={assignment.client_billing}
                            onChange={(e) => handleFieldChange(index, "client_billing", e.target.value)}
                            placeholder="Enter billing amount"
                            required
                            className="w-full pl-6 text-sm rounded-r-none"
                          />
                        </div>
                        <Select
                          value={assignment.billing_type}
                          onValueChange={(value) => handleFieldChange(index, "billing_type", value)}
                          required
                        >
                          <SelectTrigger className="w-[80px] text-sm rounded-l-none border-l-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {billingTypeOptions.map((type) => (
                              <SelectItem key={type} value={type} className="text-sm">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">Working Hours*</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={assignment.working_hours}
                        onChange={(e) => handleFieldChange(index, "working_hours", e.target.value)}
                        placeholder="Enter working hours (e.g., 4.2)"
                        required
                        className="w-full text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">SOW</Label>
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg"
                        onChange={(e) => handleFileUpload(index, e)}
                        className="w-full text-sm file:mr-2 file:text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                employeeAssignments.length === 0 ||
                employeeAssignments.some(
                  (a) =>
                    !a.assign_employee ||
                    !a.start_date ||
                    !a.end_date ||
                    !a.client_billing ||
                    !a.billing_type ||
                    !a.salary_currency ||
                    !a.salary_type ||
                     !a.working_hours
                )
              }
              className="w-full sm:w-auto"
            >
              {editEmployee ? "Update Assignment" : "Assign Employees"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignEmployeeDialog;
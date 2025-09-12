import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/jobs/ui/dialog";
import { Button } from "@/components/jobs/ui/button";
import { Label } from "@/components/jobs/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/jobs/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/jobs/ui/select";
import { IndianRupee, Loader2, X } from "lucide-react";
import { Input } from "@/components/jobs/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/jobs/ui/tabs";
import { toast } from "sonner";
import { JobData } from "@/lib/types";
import { fetchEmployees, fetchDepartments, fetchVendors, assignJob, fetchJobAssignments } from "@/services/assignmentService";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';

interface AssignJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobData | null;
}

export function AssignJobModal({ isOpen, onClose, job }: AssignJobModalProps) {
  const [selectedTab, setSelectedTab] = useState("internal");
  const [assignmentType, setAssignmentType] = useState("individual");
  const [selectedIndividuals, setSelectedIndividuals] = useState<{ value: string; label: string }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetType, setBudgetType] = useState("LPA");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    if (isOpen && organizationId) {
      loadData();
    }
  }, [isOpen, organizationId]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [employeesData, departmentsData, vendorsData] = await Promise.all([
        fetchEmployees(organizationId),
        fetchDepartments(organizationId),
        fetchVendors(organizationId)
      ]);
      
      setEmployees(employeesData);
      setDepartments(departmentsData);
      setVendors(vendorsData);
  
      if (job?.id) {
        const assignmentData = await fetchJobAssignments(job.id);
        console.log("Fetched assignment data:", assignmentData);
        
        const assignedTo = (await supabase.from('hr_jobs').select('assigned_to').eq('id', job.id).single()).data?.assigned_to;
        console.log("Assigned to from direct query:", assignedTo);
  
        if (assignedTo) {
          if (assignedTo.type === 'individual') {
            setSelectedTab("internal");
            setAssignmentType("individual");
            setSelectedIndividuals(assignmentData.assignments || []);
          } else if (assignedTo.type === 'team') {
            setSelectedTab("internal");
            setAssignmentType("team");
            setSelectedTeam(assignedTo.id);
          } else if (assignedTo.type === 'vendor') {
            setSelectedTab("external");
            setSelectedVendor(assignedTo.id);
          }
        }

        if (assignmentData.budget !== null && assignmentData.budget !== undefined) {
          setBudget(assignmentData.budget.toString());
          console.log("Setting budget:", assignmentData.budget.toString());
        }
        if (assignmentData.budgetType) {
          setBudgetType(assignmentData.budgetType);
          console.log("Setting budgetType:", assignmentData.budgetType);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load assignment options");
    } finally {
      setDataLoading(false);
    }
  };

  const handleEmployeeSelect = (value: string) => {
    const employee = employees.find(emp => emp.value === value);
    if (employee && !selectedIndividuals.some(emp => emp.value === value)) {
      setSelectedIndividuals([...selectedIndividuals, employee]);
    }
  };

  const removeEmployee = (value: string) => {
    setSelectedIndividuals(selectedIndividuals.filter(emp => emp.value !== value));
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (/^\d*$/.test(value) && Number(value) >= 0)) {
      setBudget(value);
    }
  };

  const handleSave = async () => {
    if (!budget || Number(budget) <= 0) {
      toast.error("Please enter a valid budget greater than 0");
      return;
    }

    if (selectedTab === "internal") {
      if (assignmentType === "individual" && selectedIndividuals.length === 0) {
        toast.error("Please select at least one employee");
        return;
      }
      if (assignmentType === "team" && !selectedTeam) {
        toast.error("Please select a team");
        return;
      }

      if (assignmentType === "individual") {
        const assignmentIds = selectedIndividuals.map(emp => emp.value).join(",");
        const assignmentNames = selectedIndividuals.map(emp => emp.label).join(",");
        await saveAssignment(assignmentType, assignmentIds, assignmentNames, budget, budgetType);
      } else {
        const assignmentName = departments.find(dept => dept.value === selectedTeam)?.label || "";
        await saveAssignment(assignmentType, selectedTeam, assignmentName, budget, budgetType);
      }
    } else {
      if (!selectedVendor) {
        toast.error("Please select a vendor");
        return;
      }
      
      const vendorName = vendors.find(vendor => vendor.value === selectedVendor)?.label || "";
      await saveAssignment("vendor", selectedVendor, vendorName, budget, budgetType);
    }
  };

  const saveAssignment = async (type: 'individual' | 'team' | 'vendor', id: string, name: string, budget?: string, budgetType?: string) => {
    if (!job?.id) {
      toast.error("Job information is missing");
      return;
    }
    
    setLoading(true);
    try {
      // Fetch current assigned_to data
      const { data: jobData, error: jobError } = await supabase
        .from('hr_jobs')
        .select('assigned_to')
        .eq('id', job.id)
        .single();
      if (jobError) throw new Error("Failed to fetch current job data");

      // Determine new assignees
      let recipientEmails: string[] = [];
      let newAssigneeIds: string[] = [];
      let newAssigneeNames: string[] = [];

      if (type === 'individual') {
        const currentAssigneeIds = jobData.assigned_to?.id ? jobData.assigned_to.id.split(",") : [];
        const currentAssigneeNames = jobData.assigned_to?.name ? jobData.assigned_to.name.split(",") : [];
        const newIds = id.split(",");
        const newNames = name.split(",");

        // Identify new assignees (not in currentAssigneeIds)
        newAssigneeIds = newIds.filter(newId => !currentAssigneeIds.includes(newId));
        newAssigneeNames = newNames.filter((_, index) => newAssigneeIds.includes(newIds[index]));

        if (newAssigneeIds.length > 0) {
          const { data: employeeData, error } = await supabase
            .from('hr_employees')
            .select('email')
            .in('id', newAssigneeIds);
          if (error) throw new Error("Failed to fetch employee emails");
          recipientEmails = employeeData.map(emp => emp.email);
        }
      } else if (type === 'team') {
        // For team assignments, notify all members if it's a new team
        if (jobData.assigned_to?.id !== id) {
          const { data: teamMembers, error } = await supabase
            .from('hr_employees')
            .select('email')
            .eq('department_id', id);
          if (error) throw new Error("Failed to fetch team member emails");
          recipientEmails = teamMembers.map(emp => emp.email);
          newAssigneeIds = [id];
          newAssigneeNames = [name];
        }
      } else if (type === 'vendor') {
        // For vendor assignments, notify if it's a new vendor
        if (jobData.assigned_to?.id !== id) {
          const { data: vendorData, error } = await supabase
            .from('vendors')
            .select('email')
            .eq('id', id)
            .single();
          if (error) throw new Error("Failed to fetch vendor email");
          recipientEmails = [vendorData.email];
          newAssigneeIds = [id];
          newAssigneeNames = [name];
        }
      }

      // Proceed with assignment
      await assignJob(job.id, type, id, name, budget, budgetType, user?.id);

      // Send email only if there are new assignees
      if (recipientEmails.length > 0 && newAssigneeIds.length > 0) {
        // Fetch JWT token
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          throw new Error('No authenticated user found');
        }
        const jwt = session.access_token;

        // Fetch user name for assignedBy
        const { data: employee, error: employeeError } = await supabase
          .from('hr_employees')
          .select('first_name, last_name')
          .eq('id', user?.id)
          .single();
        if (employeeError || !employee) {
          throw new Error('Failed to fetch user name');
        }

        // Send email notification via direct fetch
        const emailPayload = {
          to: recipientEmails,
          jobDetails: {
            title: job.title,
            budget: budget || 'N/A',
            budgetType: budgetType || 'N/A',
            assignedTo: newAssigneeNames.join(", "), // Only new assignees
            assignedBy: `${employee.first_name} ${employee.last_name || ''}`.trim(),
            assignedDate: format(new Date(), 'yyyy-MM-dd')
          }
        };

        const response = await fetch(
          'https://kbpeyfietrwlhwcwqhjw.supabase.co/functions/v1/send-job-assignment-email',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGV5ZmlldHJ3bGh3Y3dxaGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NDA5NjEsImV4cCI6MjA1NDQxNjk2MX0.A-K4DO6D2qQZ66qIXY4BlmoHxc-W5B0itV-HAAM84YA',
              'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify(emailPayload)
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send assignment email');
        }
      }

      toast.success(`Job assigned to ${type === 'vendor' ? 'vendor' : type} successfully! ${recipientEmails.length > 0 ? 'Notification email sent.' : ''}`);
      handleReset();
      onClose();
    } catch (error) {
      console.error("Error assigning job or sending email:", error.message);
      toast.error(error.message.includes('email') 
        ? "Job assigned successfully, but failed to send notification email."
        : "Failed to assign job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedTab("internal");
    setAssignmentType("individual");
    setSelectedIndividuals([]);
    setSelectedTeam("");
    setSelectedVendor("");
    setBudget("");
    setBudgetType("LPA");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Assign Job: {job?.title}
          </DialogTitle>
        </DialogHeader>
        
        {dataLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading assignment options...</span>
          </div>
        ) : (
          <>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="internal" disabled={loading}>Internal Assignment</TabsTrigger>
                <TabsTrigger value="external" disabled={loading}>External Assignment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="internal" className="space-y-4 pt-4">
                <RadioGroup
                  value={assignmentType}
                  onValueChange={setAssignmentType}
                  className="flex flex-col space-y-4"
                  disabled={loading}
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <div className="grid gap-1.5 w-full">
                      <Label htmlFor="individual" className="font-medium">
                        Assign to Individual(s)
                      </Label>
                      <Select
                        onValueChange={handleEmployeeSelect}
                        disabled={assignmentType !== "individual" || loading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select employees" />
                        </SelectTrigger>              
                        <SelectContent>
                          {employees.length > 0 ? (
                            employees.map((employee) => (
                              <SelectItem key={employee.value} value={employee.value}>
                                {employee.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-employees" disabled>
                              No employees found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedIndividuals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedIndividuals.map((employee) => (
                            <div
                              key={employee.value}
                              className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-sm"
                            >
                              {employee.label}
                              <button
                                onClick={() => removeEmployee(employee.value)}
                                className="text-red-500 hover:text-red-700"
                                disabled={loading}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="team" id="team" />
                    <div className="grid gap-1.5 w-full">
                      <Label htmlFor="team" className="font-medium">
                        Assign to Team
                      </Label>
                      <Select
                        value={selectedTeam}
                        onValueChange={setSelectedTeam}
                        disabled={assignmentType !== "team" || loading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.length > 0 ? (
                            departments.map((department) => (
                              <SelectItem key={department.value} value={department.value}>
                                {department.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-departments" disabled>
                              No departments found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </RadioGroup>
                <div className="grid gap-2">
                  <Label htmlFor="budget-internal">Budget</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input
                        id="budget-internal"
                        type="number"
                        placeholder="Enter budget amount"
                        className="pl-9"
                        value={budget}
                        onChange={handleBudgetChange}
                        disabled={loading}
                        min="0"
                      />
                    </div>
                    <Select value={budgetType} onValueChange={setBudgetType} disabled={loading}>
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LPA">LPA</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="external" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vendor">Vendor Selection</Label>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor} disabled={loading}>
                      <SelectTrigger className="w-full" id="vendor">
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.length > 0 ? (
                          vendors.map((vendor) => (
                            <SelectItem key={vendor.value} value={vendor.value}>
                              {vendor.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-vendors" disabled>
                            No vendors found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="budget-external">Budget</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <IndianRupee className="h-4 w-4 text-gray-500" />
                        </div>
                        <Input
                          id="budget-external"
                          type="number"
                          placeholder="Enter budget amount"
                          className="pl-9"
                          value={budget}
                          onChange={handleBudgetChange}
                          disabled={loading}
                          min="0"
                        />
                      </div>
                      <Select value={budgetType} onValueChange={setBudgetType} disabled={loading}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LPA">LPA</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}




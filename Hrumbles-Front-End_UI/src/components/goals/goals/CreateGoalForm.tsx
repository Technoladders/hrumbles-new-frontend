
import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from 'react-redux';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SectorType, MetricType } from "@/types/goal";
import { createGoal } from "@/lib/supabaseData";
import { supabase } from "@/integrations/supabase/client";
import {X} from "lucide-react"
import {Switch} from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator";
import { AUTOMATION_SOURCES } from "@/lib/goalAutomationConfig";

interface CreateGoalFormProps {
  onClose?: () => void;
}

const CreateGoalForm: React.FC<CreateGoalFormProps> = ({ onClose }) => {
  const [sector, setSector] = useState<SectorType>();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [metricType, setMetricType] = useState<MetricType>();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);

    // --- 2. REPLACE old technical state with user-friendly state ---
  const [isAutomated, setIsAutomated] = useState(false);
   const [selectedStatusId, setSelectedStatusId] = useState<string>("");
  const [selectedAutomationSource, setSelectedAutomationSource] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dynamicStatuses, setDynamicStatuses] = useState<{ label: string; value: string }[]>([]);
  const [jobSubStatuses, setJobSubStatuses] = useState<JobStatus[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
const [sourceTable, setSourceTable] = useState("");
const [sourceValueColumn, setSourceValueColumn] = useState("");
const [sourceEmployeeColumn, setSourceEmployeeColumn] = useState("");
const [sourceDateColumn, setSourceDateColumn] = useState("");
const [filters, setFilters] = useState<{ key: string; value: string }[]>([
  { key: "", value: "" },
]);

  // --- 3. ADD logic to manage the dynamic dropdowns ---
  const currentSourceConfig = useMemo(() => {
    return AUTOMATION_SOURCES.find(source => source.value === selectedAutomationSource);
  }, [selectedAutomationSource]);

    useEffect(() => {
    const fetchJobSubStatuses = async () => {
      if (sector === 'Human Resource' && isAutomated) {
        setIsLoadingStatuses(true);
        try {
          const { data, error } = await supabase
            .from('job_statuses')
            .select('id, name')
            .eq('organization_id', organizationId)
            .eq('type', 'sub')
            .order('name');

          if (error) throw error;
          setJobSubStatuses(data || []);
        } catch (error) {
          toast.error("Failed to load hiring statuses.");
          console.error("Error fetching job statuses:", error);
        } finally {
          setIsLoadingStatuses(false);
        }
      }
    };

    fetchJobSubStatuses();
  }, [sector, isAutomated, organizationId]);

  useEffect(() => {
    const fetchDynamicStatuses = async () => {
      if (currentSourceConfig?.isDynamic) {
        setIsLoadingStatuses(true);
        setDynamicStatuses([]); // Clear previous statuses
        setSelectedStatus("");

        // Get the names of the statuses we need to find (e.g., ["Joined"])
        const statusNamesToFetch = currentSourceConfig.statuses.map(s => s.value);
        
        try {
          const { data, error } = await supabase
            .from('job_statuses')
            .select('id, name')
            .eq('organization_id', organizationId)
            .in('name', statusNamesToFetch)
            .eq('type', 'sub'); // Ensure we only get sub-statuses like "Joined"

          if (error) throw error;

          // Map the result to the format our dropdown needs
          const fetchedStatuses = data.map(status => ({
            label: status.name, // e.g., "Joined"
            value: status.id,   // e.g., "c9716374-..." (the correct UUID!)
          }));
          
          setDynamicStatuses(fetchedStatuses);

        } catch (error) {
          toast.error("Could not load hiring statuses for your organization.");
          console.error(error);
        } finally {
          setIsLoadingStatuses(false);
        }
      }
    };

    fetchDynamicStatuses();
  }, [currentSourceConfig, organizationId]);


    useEffect(() => {
    // Reset the status selection whenever the source changes
    setSelectedStatus("");
  }, [selectedAutomationSource]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const { data, error } = await supabase
          .from('hr_departments')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error("Error fetching departments:", error);
          toast.error("Failed to load departments");
        } else {
          setDepartments(data || []);
        }
      } catch (error) {
        console.error("Error in fetchDepartments:", error);
        toast.error("Failed to load departments");
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    
    fetchDepartments();
  }, []);

  const getMetricUnitValue = () => {
    if (!metricType) return "";

    switch (metricType) {
      case "percentage":
        return "%";
      case "currency":
        return "$";
      case "count":
        return "#";
      case "hours":
        return "hrs";
      case "custom":
        return customUnit;
      default:
        return "";
    }
  };

  // Inside CreateGoalForm component, before the return statement

const handleAddFilter = () => {
  setFilters([...filters, { key: "", value: "" }]);
};

const handleRemoveFilter = (index: number) => {
  const newFilters = filters.filter((_, i) => i !== index);
  setFilters(newFilters);
};

const handleFilterChange = (index: number, field: 'key' | 'value', val: string) => {
  const newFilters = filters.map((filter, i) => {
    if (i === index) {
      return { ...filter, [field]: val };
    }
    return filter;
  });
  setFilters(newFilters);
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !description || !sector || !metricType) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (metricType === "custom" && !customUnit) {
      toast.error("Please specify a custom unit");
      return;
    }
    
    setLoading(true);

    // --- NEW: Prepare automation data ---
 let automationConfig = {};
    if (isAutomated && sector === 'Human Resource') {
        const selectedStatus = jobSubStatuses.find(s => s.id === selectedStatusId);
        if (!selectedStatus) {
            toast.error("Please select a hiring status to track.");
            setLoading(false);
            return;
        }

        // --- DYNAMIC DATE LOGIC ---
        let dateTable = 'hr_status_change_counts';
        let dateColumn = 'created_at';

        // Check for special cases based on status name
        if (selectedStatus.name.toLowerCase().includes('submission') || selectedStatus.name.toLowerCase().includes('processed (client)')) {
            dateTable = 'hr_job_candidates';
            dateColumn = 'submission_date';
        } else if (selectedStatus.name.toLowerCase().includes('joined') || selectedStatus.name.toLowerCase().includes('onboarding')) {
            dateTable = 'hr_job_candidates';
            dateColumn = 'joining_date';
        }

        automationConfig = {
            is_automated: true,
            source_table: 'hr_status_change_counts',
            source_value_column: 'count',
            source_employee_column: 'candidate_owner',
            source_filter_conditions: {
                sub_status_id: selectedStatus.id,
            },
            source_date_table: dateTable,
            source_date_column: dateColumn,
        };
    }

    try {
      const newGoalPayload = {
        name,
        description,
        sector,
        metricType,
        metricUnit: getMetricUnitValue(),
        ...automationConfig,
      };

      const newGoal = await createGoal(newGoalPayload as any); // Cast as any to bypass strict type check for new fields
      
      if (!newGoal) throw new Error("Failed to create goal");
      
      toast.success("Goal template created successfully!");
      onClose?.();
      
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal template. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Create New Goal Template</DialogTitle>
        <DialogDescription>
          Create a new goal template that can be assigned to employees later.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-6 py-4">
        <div className="space-y-4">

          <Separator className="my-4" />

<div className="flex items-center space-x-2">
  <Switch id="automation-mode" checked={isAutomated} onCheckedChange={setIsAutomated} />
  <Label htmlFor="automation-mode">Enable Automated Tracking</Label>
</div>
<p className="text-xs text-gray-500 mt-1">
  Enable this to automatically track goal progress from a source data table.
</p>

{isAutomated && sector === 'Human Resource' && (
                <div className="space-y-2 pt-2 border-t mt-2">
                    <h4 className="text-md font-semibold">Recruitment Automation</h4>
                    <div>
                        <Label>Track Candidate Status</Label>
                        <Select value={selectedStatusId} onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}>
                        <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder={isLoadingStatuses ? "Loading statuses..." : "Select a status to track..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {jobSubStatuses.map(status => (
                            <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                            The goal's progress will be the count of candidates reaching this status.
                        </p>
                    </div>
                </div>
            )}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Goal Name
            </Label>
            <Input
              id="name"
              placeholder="Enter goal name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the goal and its objectives"
              className="mt-1.5 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sector" className="text-sm font-medium">
                Department
              </Label>
              <Select onValueChange={(value) => setSector(value as SectorType)}>
                <SelectTrigger id="sector" className="mt-1.5">
                  <SelectValue placeholder={isLoadingDepartments ? "Loading departments..." : "Select department"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="metricType" className="text-sm font-medium">
                Metric Type
              </Label>
              <Select onValueChange={(value) => setMetricType(value as MetricType)}>
                <SelectTrigger id="metricType" className="mt-1.5">
                  <SelectValue placeholder="Select metric type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="currency">Currency ($)</SelectItem>
                  <SelectItem value="count">Count (#)</SelectItem>
                  <SelectItem value="hours">Hours (hrs)</SelectItem>
                  <SelectItem value="custom">Custom Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {metricType === "custom" && (
            <div>
              <Label htmlFor="metricUnit" className="text-sm font-medium">
                Custom Unit
              </Label>
              <Input
                id="metricUnit"
                placeholder="e.g., tasks, points"
                className="mt-1.5"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                required
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Goal Template"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default CreateGoalForm;

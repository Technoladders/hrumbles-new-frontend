
import React, { useState, useEffect } from "react";
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

interface CreateGoalFormProps {
  onClose?: () => void;
}

const CreateGoalForm: React.FC<CreateGoalFormProps> = ({ onClose }) => {
  const [sector, setSector] = useState<SectorType>();
  const [metricType, setMetricType] = useState<MetricType>();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);

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
    
    try {
      // Create goal template with minimal required fields
      const newGoal = await createGoal({
        name,
        description,
        sector,
        metricType,
        metricUnit: getMetricUnitValue(),
      });
      
      if (!newGoal) {
        throw new Error("Failed to create goal");
      }
      
      toast.success("Goal template created successfully!");
      
      // Reset form
      setName("");
      setDescription("");
      setSector(undefined);
      setMetricType(undefined);
      setCustomUnit("");
      
      // Close the modal after successful creation
      if (onClose) {
        onClose();
      }
      
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


import { useState } from "react";
import { useForm } from "react-hook-form";
import { JobData } from "@/lib/types";
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import { Label } from "@/components/jobs/ui/label";
import { Textarea } from "@/components/jobs/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { 
  Building, 
  DollarSign,
  IndianRupee,
  Tag, 
  UserCircle,
  Users,
  Store 
} from "lucide-react";
import { toast } from "sonner";

interface JobDescriptionDrawerProps {
  job: JobData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: JobData) => void;
}

const JobDescriptionDrawer = ({ 
  job, 
  open, 
  onOpenChange, 
  onUpdate 
}: JobDescriptionDrawerProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<JobData>({
    defaultValues: {
      ...job,
      description: job.description || "",
      descriptionBullets: job.descriptionBullets || [],
    }
  });

  const onSubmit = async (data: JobData) => {
    setIsSubmitting(true);
    try {
      // In a real app, you would update the job details via API
      // For now, we'll just simulate a delay and update the local state
      await new Promise(resolve => setTimeout(resolve, 800));
      onUpdate(data);
      toast.success("Job updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader className="px-6 sticky top-0 bg-background z-10 border-b pb-4">
          <DrawerTitle>Edit Job Details</DrawerTitle>
          <DrawerDescription>
            Make changes to the job. Click update when you're done.
          </DrawerDescription>
        </DrawerHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 space-y-6 pb-6 overflow-y-auto">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input 
                id="title" 
                {...register("title", { required: "Job title is required" })}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobId">Job ID</Label>
                <Input 
                  id="jobId" 
                  {...register("jobId", { required: "Job ID is required" })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hiringMode">Hiring Mode</Label>
                <Input 
                  id="hiringMode" 
                  {...register("hiringMode")}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Job Type</Label>
              <Input 
                id="type" 
                {...register("type")}
              />
            </div>
          </div>
          
          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Client Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="clientOwner">Client Name</Label>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <Input 
                  id="clientOwner" 
                  {...register("clientOwner")}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endClient">End Client</Label>
              <Input 
                id="endClient" 
                {...register("clientDetails.endClient")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Job Location</Label>
              <Textarea 
                id="location" 
                placeholder="Enter locations, separated by commas"
                {...register("location")}
                value={Array.isArray(job.location) ? job.location.join(", ") : ""}
                onChange={(e) => {
                  const locations = e.target.value.split(",").map(loc => loc.trim());
                  register("location", { value: locations });
                }}
              />
            </div>
          </div>
          
          {/* Assignment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assignment Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="assignedType">Assigned To</Label>
              <select
                id="assignedType"
                className="w-full border rounded-md h-10 px-3"
                {...register("assignedTo.type")}
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignedName">Name</Label>
              <Input 
                id="assignedName"
                {...register("assignedTo.name")}
              />
            </div>
          </div>
          
          {/* Budget Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Budget Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="clientBudget" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-gray-500" />
                Client Budget
              </Label>
              <Input 
                id="clientBudget" 
                {...register("budgets.clientBudget")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hrBudget" className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4 text-gray-500" />
                HR Budget
              </Label>
              <Input 
                id="hrBudget" 
                {...register("budgets.hrBudget")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendorBudget" className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4 text-gray-500" />
                Vendor Budget
              </Label>
              <Input 
                id="vendorBudget" 
                {...register("budgets.vendorBudget")}
              />
            </div>
          </div>
          
          {/* Skills */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Skills</h3>
            
            <div className="space-y-2">
              <Label htmlFor="primarySkills">Primary Skills</Label>
              <Textarea 
                id="primarySkills" 
                placeholder="Enter skills, separated by commas"
                {...register("primarySkills")}
                value={job.primarySkills?.join(", ") || ""}
                onChange={(e) => {
                  const skills = e.target.value.split(",").map(skill => skill.trim());
                  register("primarySkills", { value: skills });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondarySkills">Secondary Skills</Label>
              <Textarea 
                id="secondarySkills" 
                placeholder="Enter skills, separated by commas"
                {...register("secondarySkills")}
                value={job.secondarySkills?.join(", ") || ""}
                onChange={(e) => {
                  const skills = e.target.value.split(",").map(skill => skill.trim());
                  register("secondarySkills", { value: skills });
                }}
              />
            </div>
          </div>
          
          {/* Job Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Job Description</h3>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                className="min-h-40"
                {...register("description")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descriptionBullets">Description Bullets</Label>
              <Textarea 
                id="descriptionBullets" 
                placeholder="Enter bullet points, one per line"
                className="min-h-40"
                {...register("descriptionBullets")}
                value={job.descriptionBullets?.join("\n") || ""}
                onChange={(e) => {
                  const bullets = e.target.value.split("\n").filter(Boolean);
                  register("descriptionBullets", { value: bullets });
                }}
              />
              <p className="text-xs text-gray-500">Enter each bullet point on a new line</p>
            </div>
          </div>
          
          <DrawerFooter className="px-0 sticky bottom-0 bg-background pt-4 border-t">
            <div className="flex justify-end gap-2">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Job"}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};

export default JobDescriptionDrawer;

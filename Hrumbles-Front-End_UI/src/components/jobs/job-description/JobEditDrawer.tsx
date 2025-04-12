
import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobData } from "@/lib/types";
import {
  Building,
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  User
} from "lucide-react";

interface JobEditDrawerProps {
  job: JobData;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updatedJob: JobData) => void;
}

const JobEditDrawer = ({ job, open, onClose, onUpdate }: JobEditDrawerProps) => {
  const [formData, setFormData] = useState<JobData>(() => ({...job}));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      // For nested properties, we need to handle them differently
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof JobData] as Record<string, any>),
            [child]: value
          }
        };
      }
      
      return {
        ...prev,
        [name]: value
      };
    });
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(job.id, formData);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit Job</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Job Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Job Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobId">Job ID</Label>
                <Input
                  id="jobId"
                  name="jobId"
                  value={formData.jobId}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Job Type</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <Briefcase size={16} className="text-gray-500" />
                  </span>
                  <Input
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hiringMode">Hiring Mode</Label>
                <Input
                  id="hiringMode"
                  name="hiringMode"
                  value={formData.hiringMode}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                  <MapPin size={16} className="text-gray-500" />
                </span>
                <Input
                  id="location"
                  name="location"
                  value={formData.location?.join(", ")}
                  onChange={(e) => {
                    const locations = e.target.value.split(",").map(loc => loc.trim());
                    setFormData(prev => ({
                      ...prev,
                      location: locations
                    }));
                  }}
                  className="rounded-l-none"
                  placeholder="Enter locations separated by commas"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postedDate">Posted Date</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <Calendar size={16} className="text-gray-500" />
                  </span>
                  <Input
                    id="postedDate"
                    name="postedDate"
                    type="date"
                    value={formData.postedDate}
                    onChange={handleChange}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <Calendar size={16} className="text-gray-500" />
                  </span>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Client Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Client Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="clientDetails.clientName">Client Name</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                  <Building size={16} className="text-gray-500" />
                </span>
                <Input
                  id="clientDetails.clientName"
                  name="clientDetails.clientName"
                  value={formData.clientDetails?.clientName || ""}
                  onChange={handleChange}
                  className="rounded-l-none"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientDetails.endClient">End Client</Label>
              <Input
                id="clientDetails.endClient"
                name="clientDetails.endClient"
                value={formData.clientDetails?.endClient || ""}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientDetails.clientBudget">Client Budget</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                  <DollarSign size={16} className="text-gray-500" />
                </span>
                <Input
                  id="clientDetails.clientBudget"
                  name="clientDetails.clientBudget"
                  value={formData.clientDetails?.clientBudget || ""}
                  onChange={handleChange}
                  className="rounded-l-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgets.hrBudget">HR Budget</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <DollarSign size={16} className="text-gray-500" />
                  </span>
                  <Input
                    id="budgets.hrBudget"
                    name="budgets.hrBudget"
                    value={formData.budgets?.hrBudget || ""}
                    onChange={handleChange}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budgets.vendorBudget">Vendor Budget</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <DollarSign size={16} className="text-gray-500" />
                  </span>
                  <Input
                    id="budgets.vendorBudget"
                    name="budgets.vendorBudget"
                    value={formData.budgets?.vendorBudget || ""}
                    onChange={handleChange}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Assignment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assignment</h3>
            
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <div className="flex gap-2">
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted">
                    <User size={16} className="text-gray-500" />
                  </span>
                  <Input
                    value={formData.assignedTo?.name || ""}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        assignedTo: {
                          type: prev.assignedTo?.type || "individual",
                          name: e.target.value
                        }
                      }));
                    }}
                    className="rounded-l-none"
                    placeholder="Name"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Job Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Job Description</h3>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Use bullet points (starting with - or *) for better formatting
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                name="skills"
                value={formData.skills?.join(", ") || ""}
                onChange={(e) => {
                  const skills = e.target.value.split(",").map(skill => skill.trim());
                  setFormData(prev => ({
                    ...prev,
                    skills: skills
                  }));
                }}
                placeholder="Enter skills separated by commas"
              />
            </div>
          </div>
        </div>
        
        <SheetFooter className="mt-6 flex space-x-2">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Job"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default JobEditDrawer;

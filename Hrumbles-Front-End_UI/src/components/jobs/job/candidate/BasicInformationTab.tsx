import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form,
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import MultiLocationSelector from "./MultiLocationSelector";
import { CandidateFormData } from "./AddCandidateDrawer";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";


interface BasicInformationTabProps {
  form: UseFormReturn<CandidateFormData>;
  onSaveAndNext: (data: CandidateFormData) => void;
  onCancel: () => void;
}

const LOCATION_OPTIONS = [
  "New York", "San Francisco", "Chicago", "Los Angeles", "Boston",
  "Seattle", "Austin", "Denver", "Miami", "Washington DC",
  "Bangalore", "Hyderabad", "Chennai", "Mumbai", "Delhi",
  "London", "Berlin", "Paris", "Tokyo", "Sydney", "Coimbatore", "Madurai", "Remote", "Others"
];

// Helper function to format number in INR style (e.g., 1,23,456)
const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value);


const preprocessNumber = (val: unknown) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const number = Number(val);
  return isNaN(number) ? undefined : number;
};

// Form validation schema
const basicInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  currentLocation: z.string().min(1, "Current location is required"),
  preferredLocations: z.array(z.string()).min(1, "At least one preferred location is required"),
  totalExperience: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),

  totalExperienceMonths: z
    .preprocess(preprocessNumber, z.number().min(0).max(11, "Max 11 months"))
    .optional(),

  relevantExperience: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),

  relevantExperienceMonths: z
    .preprocess(preprocessNumber, z.number().min(0).max(11, "Max 11 months"))
    .optional(),

  currentSalary: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),

  expectedSalary: z
    .preprocess(preprocessNumber, z.number().min(0, "Cannot be negative"))
    .optional(),
  resume: z.string().url("Resume URL is required"),
  skills: z.array(z.object({
    name: z.string(),
    rating: z.number()
  }))
});

const BasicInformationTab = ({ form, onSaveAndNext, onCancel }: BasicInformationTabProps) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
  
    if (!file) return;
    
    const filePath = `resumes/${Date.now()}_${file.name}`;
  
    const { data, error } = await supabase.storage
      .from("candidate_resumes")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
  
    if (error) {
      console.error("Upload Error:", error.message);
      return;
    }
  
    const { data: { publicUrl } } = supabase.storage
      .from("candidate_resumes")
      .getPublicUrl(filePath);

    if (publicUrl) {
      form.setValue("resume", publicUrl);
    }
  };

  // Watch salary fields for formatting
  const currentSalary = form.watch("currentSalary");
  const expectedSalary = form.watch("expectedSalary");
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSaveAndNext)} className="space-y-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Location <span className="text-red-500">*</span></FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select current location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCATION_OPTIONS.map(location => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="preferredLocations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Locations <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <MultiLocationSelector 
                    locations={LOCATION_OPTIONS} 
                    selectedLocations={field.value} 
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="totalExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Experience (years)</FormLabel>
                <FormControl>
                <Input
  type="number"
  min="0"
  step="1"
  value={field.value ?? ""}
  onChange={(e) => field.onChange(e.target.value)}
  placeholder="Enter years"
/>

                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="totalExperienceMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Experience (months)</FormLabel>
                <FormControl>
                <Input
  type="number"
  min="0"
  max="11"
  step="1"
  value={field.value === undefined || isNaN(field.value) ? "" : field.value}
  onChange={(e) => field.onChange(e.target.value)}
  placeholder="0-11"
/>

                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="relevantExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevant Experience (years)</FormLabel>
                <FormControl>
                <Input
  type="number"
  min="0"
  step="1"
  value={field.value ?? ""}
  onChange={(e) => field.onChange(e.target.value)}
  placeholder="Enter years"
/>

                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="relevantExperienceMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevant Experience (months)</FormLabel>
                <FormControl>
                <Input
  type="number"
  min="0"
  max="11"
  step="1"
  value={field.value === undefined || isNaN(field.value) ? "" : field.value}
  onChange={(e) => field.onChange(e.target.value)}
  placeholder="0-11"
/>

                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Salary</FormLabel>
                <FormControl>
                <Input
  type="number"
  min="0"
  value={field.value === undefined || isNaN(field.value) ? "" : field.value}
  onChange={(e) => field.onChange(e.target.value)}
  placeholder="Enter salary in LPA"
/>

                </FormControl>
                {currentSalary !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">
                    ₹ {formatINR(currentSalary)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="expectedSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Salary</FormLabel>
                <FormControl>
                <Input
  type="number"
  min="0"
  value={field.value === undefined || isNaN(field.value) ? "" : field.value}
  onChange={(e) => field.onChange(e.target.value)}
  placeholder="Enter salary in LPA"
/>

                </FormControl>
                {expectedSalary !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">
                    ₹ {formatINR(expectedSalary)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
  control={form.control}
  name="resume"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        Resume <span className="text-red-500">*</span>
      </FormLabel>
      <FormControl>
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
        />
      </FormControl>

      {field.value && (
  <div className="flex items-center text-sm mt-1 gap-1">
    <FileText size={16} className="purple-text-color" />
    <a
      href={field.value}
      target="_blank"
      rel="noopener noreferrer"
      className="purple-text-color underline"
    >
      View Resume
    </a>
  </div>
)}


      <FormMessage />
    </FormItem>
  )}
/>

        
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save & Next
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BasicInformationTab;
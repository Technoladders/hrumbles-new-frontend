import { useState } from "react";
import { useSelector } from "react-redux";
import { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Import Switch
import { Label } from "@/components/ui/label";   // Import Label
import MultiLocationSelector from "./MultiLocationSelector";
import SingleLocationSelector from "./SingleLocationSelector";
import { CandidateFormData } from "./AddCandidateDrawer";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "sonner";

interface BasicInformationTabProps {
  form: UseFormReturn<CandidateFormData>;
  onSaveAndNext: (data: CandidateFormData) => void;
  onCancel: () => void;
  // ADDED: Prop to send the full parsed data back to the parent
  onParseComplete: (data: any) => void;
}

// --- ADDED: Helper function to calculate experience from work history ---
const calculateExperienceFromHistory = (workHistory: any[]) => {
  if (!workHistory || workHistory.length === 0) {
    return { years: 0, months: 0 };
  }

  let totalMonths = 0;
  workHistory.forEach(job => {
    try {
      const startDate = new Date(job.start_date);
      const endDate = job.end_date === 'Present' ? new Date() : new Date(job.end_date);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
        months -= startDate.getMonth();
        months += endDate.getMonth();
        totalMonths += months <= 0 ? 0 : months;
      }
    } catch (e) {
      console.warn("Could not parse date from work history", job);
    }
  });

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12
  };
};

// Revert to hard-coded locations
const LOCATION_OPTIONS = [
  "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", 
  "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore",
  "Bhopal", "Patna", "Vadodara", "Ludhiana", "Agra", "Nashik", "Faridabad",
  "Meerut", "Rajkot", "Kalyan", "Vasai-Virar", "Varanasi", "Srinagar",
  "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi",
  "Howrah", "Gwalior", "Jabalpur", "Coimbatore", "Madurai", "Visakhapatnam",
  "Vijayawada", "Chandigarh", "Thiruvananthapuram", "Kochi", "Mysore",
  "Jodhpur", "Raipur", "Dehradun", "Guwahati", "Hubli-Dharwad", "Salem",
  "Tiruchirappalli", "Bhubaneshwar", "Gurgaon", "Remote", "Others",
];

const formatINR = (value: number): string => {
  const formattedNumber = new Intl.NumberFormat("en-IN").format(value);
  if (value >= 1_00_00_000) return `${formattedNumber} (Crore)`;
  if (value >= 1_00_000) return `${formattedNumber} (Lakh)`;
  if (value >= 1_000) return `${formattedNumber} (Thousand)`;
  if (value >= 100) return `${formattedNumber} (Hundred)`;
  return `${formattedNumber}`;
};

const YEARS = Array.from({ length: 31 }, (_, i) => i.toString());
const MONTHS = Array.from({ length: 12 }, (_, i) => i.toString());

const NOTICE_PERIOD_OPTIONS = [
  "Immediate", "15 days", "30 days", "45 days", "60 days", "90 days",
];

const sanitizeFileName = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const name = fileName.substring(0, fileName.length - (extension.length + 1));
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${sanitizedName}.${extension}`;
};

const BasicInformationTab = ({ form, onSaveAndNext, onCancel, onParseComplete }: BasicInformationTabProps) => {
  const [isParsing, setIsParsing] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a PDF or DOCX file.");
      return;
    }

    const sanitizedFileName = sanitizeFileName(file.name);
    const filePath = `resumes/${Date.now()}_${sanitizedFileName}`;
    
    setIsParsing(true);
    toast.info("Uploading resume...");

    try {
      const { error: uploadError } = await supabase.storage
        .from("candidate_resumes")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(`Upload Error: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from("candidate_resumes").getPublicUrl(filePath);
      if (!publicUrl) throw new Error("Failed to retrieve resume URL.");
      
      form.setValue("resume", publicUrl);
      toast.success("Resume uploaded. Parsing with AI, please wait...");

      const { data: parsedData, error: functionError } = await supabase.functions.invoke('parse-resume', {
        body: { 
            fileUrl: publicUrl,
            user_id: user?.id,
            organization_id: organizationId
        },
      });
      if (functionError) throw new Error(`AI Parsing Error: ${functionError.message}`);

       // ADDED: Call the callback with the full parsed data object
      if (parsedData) {
        onParseComplete(parsedData);
      }
      
      if (parsedData) {
        // --- KEY CHANGE: Handle the new, richer data structure ---
        if (parsedData.firstName) form.setValue("firstName", parsedData.firstName, { shouldValidate: true });
        if (parsedData.lastName) form.setValue("lastName", parsedData.lastName, { shouldValidate: true });
        if (parsedData.email) form.setValue("email", parsedData.email, { shouldValidate: true });
        if (parsedData.linkedInId) form.setValue("linkedInId", parsedData.linkedInId, { shouldValidate: true });
        
        if (parsedData.phone) {
          let phoneNumber = parsedData.phone.replace(/\s+/g, '');
          if (!phoneNumber.startsWith('+')) phoneNumber = `+91${phoneNumber}`;
          form.setValue("phone", phoneNumber, { shouldValidate: true });
        }
        
        if (parsedData.currentLocation) form.setValue("currentLocation", parsedData.currentLocation, { shouldValidate: true });

        // Calculate and set total experience from the new work_experience array
        if (parsedData.work_experience && parsedData.work_experience.length > 0) {
            const exp = calculateExperienceFromHistory(parsedData.work_experience);
            form.setValue("totalExperience", exp.years, { shouldValidate: true });
            form.setValue("totalExperienceMonths", exp.months, { shouldValidate: true });
        } else {
             // Fallback to old fields if work_experience is not present
            if (parsedData.totalExperience !== undefined) form.setValue("totalExperience", parsedData.totalExperience, { shouldValidate: true });
            if (parsedData.totalExperienceMonths !== undefined) form.setValue("totalExperienceMonths", parsedData.totalExperienceMonths, { shouldValidate: true });
        }
      }
      
      toast.success("Resume parsed and form has been auto-filled!");

    } catch (err: any) {
      console.error("Error during resume processing:", err);
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) {
      const errors = form.formState.errors;
      console.log("Form validation errors:", errors);
      toast.error("Please fill all required fields correctly.");
      return;
    }
    const formData = form.getValues();
    onSaveAndNext(formData);
  };

  const currentSalary = form.watch("currentSalary");
  const expectedSalary = form.watch("expectedSalary");
  const hasOffers = form.watch("hasOffers");
  const isLinkedInRequired = form.watch("isLinkedInRequired");

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {/* **Resume field moved to top** */}
        <div className="mb-6">
          <FormField
            control={form.control}
            name="resume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Resume <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                      disabled={isParsing}
                      className="flex-1"
                    />
                    {isParsing && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
                  </div>
                </FormControl>
                {field.value && !isParsing && (
                  <div className="flex items-center text-sm mt-1 gap-1">
                    <FileText size={16} className="purple-text-color" />
                    <a href={field.value} target="_blank" rel="noopener noreferrer" className="purple-text-color underline">
                      View Uploaded Resume
                    </a>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <hr className="my-6"/>

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
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    value={field.value}
                    onChange={field.onChange}
                    className="border rounded-md p-2 w-full"
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
            name="currentLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Location <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <SingleLocationSelector
                    locations={LOCATION_OPTIONS}
                    selectedLocation={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
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
                <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select years" /></SelectTrigger></FormControl>
                  <SelectContent>{YEARS.map((year) => (<SelectItem key={year} value={year}>{year} years</SelectItem>))}</SelectContent>
                </Select>
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
                <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger></FormControl>
                  <SelectContent>{MONTHS.map((month) => (<SelectItem key={month} value={month}>{month} months</SelectItem>))}</SelectContent>
                </Select>
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
                <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select years" /></SelectTrigger></FormControl>
                  <SelectContent>{YEARS.map((year) => (<SelectItem key={year} value={year}>{year} years</SelectItem>))}</SelectContent>
                </Select>
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
                <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger></FormControl>
                  <SelectContent>{MONTHS.map((month) => (<SelectItem key={month} value={month}>{month} months</SelectItem>))}</SelectContent>
                </Select>
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
                <FormControl><Input type="number" min="0" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="Enter salary in INR"/></FormControl>
                {currentSalary !== undefined && (<p className="text-sm text-gray-500 mt-1">₹ {formatINR(currentSalary)}</p>)}
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
                <FormControl><Input type="number" min="0" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} placeholder="Enter salary in INR"/></FormControl>
                {expectedSalary !== undefined && (<p className="text-sm text-gray-500 mt-1">₹ {formatINR(expectedSalary)}</p>)}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="noticePeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notice Period</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select notice period" /></SelectTrigger></FormControl>
                  <SelectContent>{NOTICE_PERIOD_OPTIONS.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastWorkingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Working Day</FormLabel>
                <FormControl><Input type="date" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} placeholder="Select date"/></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* **LinkedIn Field with Toggle** */}
        <FormField
          control={form.control}
          name="linkedInId"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>
                  LinkedIn Profile URL 
                  {isLinkedInRequired && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormField
                  control={form.control}
                  name="isLinkedInRequired"
                  render={({ field: switchField }) => (
                    <FormItem className="flex items-center space-x-2">
                       <FormControl>
                         <Switch
                          checked={switchField.value}
                          onCheckedChange={switchField.onChange}
                         />
                       </FormControl>
                       <Label htmlFor="isLinkedInRequired" className="text-sm font-medium">Required</Label>
                    </FormItem>
                  )}
                />
              </div>
              <FormControl>
                <Input
                  placeholder="https://linkedin.com/in/username"
                  {...field}
                  value={field.value ?? ""}
                  disabled={!isLinkedInRequired}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hasOffers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Existing Offers</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {hasOffers === "Yes" && (
            <FormField
              control={form.control}
              name="offerDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Details</FormLabel>
                  <FormControl><Input placeholder="Enter offer details" {...field} value={field.value ?? ""}/></FormControl>
                  <FormMessage />
              </FormItem>
              )}
            />
          )}
        </div>
        
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isParsing}>
            Cancel
          </Button>
          <Button type="submit" disabled={isParsing}>
            {isParsing ? 'Parsing...' : 'Save & Next'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BasicInformationTab;
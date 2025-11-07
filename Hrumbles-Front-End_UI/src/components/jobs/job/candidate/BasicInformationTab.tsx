import { useState } from "react";
import { useSelector } from "react-redux";
import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion"; // Import framer-motion
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MultiLocationSelector from "./MultiLocationSelector";
import SingleLocationSelector from "./SingleLocationSelector";
import { CandidateFormData } from "./AddCandidateDrawer";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, User, Mail, Phone, MapPin, Briefcase, DollarSign, Clock, Link as LinkIcon, CalendarDays, Paperclip, UploadCloud } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "sonner";
import { Candidate } from "@/lib/types";

// --- Animation Variants for Framer Motion ---
// Defines the animation for each section card (fade in and slide up)
const sectionVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1 // Animates children one after another
    } 
  },
};

// Defines the animation for individual form fields (subtle slide up)
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Defines the 3D hover effect for input fields
const fieldHoverEffect = {
  hover: { 
    scale: 1.03,
    boxShadow: "0px 10px 30px -5px rgba(123, 97, 255, 0.2)",
    transition: { type: "spring", stiffness: 400, damping: 15 }
  }
};


interface BasicInformationTabProps {
  form: UseFormReturn<CandidateFormData>;
  onSaveAndNext: (data: CandidateFormData) => void;
  onCancel: () => void;
  onParseComplete: (parsedData: any, rawText: string) => void;
  candidate?: Candidate; 
  isEditMode?: boolean;
}

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

const LOCATION_OPTIONS = [
  "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", 
  "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore",
  "Bhopal", "Patna", "Vadodara", "Ludhiana", "Agra", "Nashik", "Faridabad",
  "Meerut", "Rajkot", "Kalyan", "Vasai-Virar", "Varanasi", "Srinagar",
  "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi",
  "Howrah", "Gwalior", "Jabalpur", "Coimbatore", "Madurai", "Visakhapatnam",
  "Vijayawada", "Chandigarh", "Thiruvananthapuram", "Kochi", "Mysore",
  "Jodhpur", "Raipur", "Dehradun", "Guwahati", "Hubli-Dharwad", "Salem",
  "Tiruchirappalli", "Bhubaneshwar", "Gurgaon", "Noida", 
  "Ghaziabad", 
  "Thane", 
  "Pimpri-Chinchwad", 
  "Kota", 
  "Jamshedpur", 
  "Tiruppur", 
  "Gandhinagar", 
  "Bareilly", 
  "Solapur", "Remote", "Others",
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

// Constants for CTC fields
const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
];
const budgetTypes = ["LPA", "Monthly", "Hourly"];

const formatForInput = (value?: number | string | null): string => {
    if (value === null || value === undefined || value === '') return '';
    const numericString = String(value).replace(/[^0-9]/g, '');
    if (numericString === '') return '';
    return new Intl.NumberFormat('en-IN').format(Number(numericString));
};

// This function is for display-only text, like the small text below an input
const formatForDisplayText = (value: number): string => {
  const formattedNumber = new Intl.NumberFormat("en-IN").format(value);
  if (value >= 1_00_00_000) return `${formattedNumber} (Crore)`;
  if (value >= 1_00_000) return `${formattedNumber} (Lakh)`;
  return formattedNumber;
};

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

const BasicInformationTab = ({ form, onSaveAndNext, onCancel, onParseComplete, candidate, isEditMode }: BasicInformationTabProps) => {
  const [isParsing, setIsParsing] = useState(false);
  const [isUploadingOffer, setIsUploadingOffer] = useState(false);
  const [isUploadingJoining, setIsUploadingJoining] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const isOfferIssued = isEditMode && candidate?.sub_status?.name === 'Offer Issued';
  const isJoined = isEditMode && candidate?.sub_status?.name === 'Joined';
  const ctcLabel = isJoined ? 'Joined CTC' : 'Offered CTC';
  const dateLabel = isJoined ? 'Joined Date' : 'Offer/Joining Date';

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

      const { data: responseData, error: functionError } = await supabase.functions.invoke('parse-resume-test', {
        body: { 
            fileUrl: publicUrl,
            user_id: user?.id,
            organization_id: organizationId
        },
      });
      if (functionError) throw new Error(`AI Parsing Error: ${functionError.message}`);

      const { parsedData, rawText } = responseData;

      if (parsedData && rawText) {
        onParseComplete(parsedData, rawText);
      }
      
      if (parsedData) {
        if (parsedData.firstName) form.setValue("firstName", parsedData.firstName, { shouldValidate: true });
        if (parsedData.lastName) form.setValue("lastName", parsedData.lastName, { shouldValidate: true });
        if (parsedData.email) form.setValue("email", parsedData.email, { shouldValidate: true });
        if (parsedData.linkedin_url) form.setValue("linkedInId", parsedData.linkedin_url, { shouldValidate: true });
        if (parsedData.phone) {
          let phoneNumber = parsedData.phone.replace(/\s+/g, '');
          if (!phoneNumber.startsWith('+')) phoneNumber = `+91${phoneNumber}`;
          form.setValue("phone", phoneNumber, { shouldValidate: true });
        }
        // if (parsedData.currentLocation) form.setValue("currentLocation", parsedData.currentLocation, { shouldValidate: true });

        if (parsedData.work_experience && parsedData.work_experience.length > 0) {
            const exp = calculateExperienceFromHistory(parsedData.work_experience);
            form.setValue("totalExperience", exp.years, { shouldValidate: true });
            form.setValue("totalExperienceMonths", exp.months, { shouldValidate: true });
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

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'offer' | 'joining'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !candidate?.id) return;
    const setLoading = type === 'offer' ? setIsUploadingOffer : setIsUploadingJoining;
    const formField = type === 'offer' ? 'offerLetterUrl' : 'joiningLetterUrl';
   
    setLoading(true);
    toast.info(`Uploading ${type} letter...`);
    try {
        const filePath = `public/${type}-letters/${candidate.id}-${Date.now()}-${file.name}`;
       
        // **CRITICAL CHANGE:** Use the new bucket name here
        const { error: uploadError } = await supabase.storage
            .from("candidate-attachments")
            .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
            .from("candidate-attachments")
            .getPublicUrl(filePath);
        if (!publicUrl) throw new Error("Failed to get public URL.");
        form.setValue(formField, publicUrl, { shouldValidate: true, shouldDirty: true });
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} letter uploaded successfully!`);
    } catch (error: any) {
        console.error(`Error uploading ${type} letter:`, error);
        toast.error(`Failed to upload ${type} letter: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  console.log("BasicInformationTab",candidate)

  const currentSalary = form.watch("currentSalary");
  const expectedSalary = form.watch("expectedSalary");
  const hasOffers = form.watch("hasOffers");
  const isLinkedInRequired = form.watch("isLinkedInRequired");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSaveAndNext)} className="space-y-8 py-4">
        {/* --- Section 1: Resume Upload --- */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="p-6 bg-white rounded-xl shadow-lg border border-gray-100"
        >
          <motion.h3 variants={itemVariants} className="text-xl font-bold mb-4 text-gray-800">Start with the Resume</motion.h3>
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="resume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Upload Resume for AI Parsing <span className="text-red-500">*</span>
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
                      <FileText size={16} className="text-purple-600" />
                      <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">
                        View Uploaded Resume
                      </a>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        </motion.div>

        {/* --- Section 2: Personal & Contact Details --- */}
        <motion.div 
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="p-6 bg-white rounded-xl shadow-lg border border-gray-100"
        >
          <h3 className="text-xl font-bold mb-4 text-gray-800">Candidate Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="John" {...field} className="pl-10" />
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                    <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Doe" {...field} className="pl-10" />
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="john.doe@example.com" type="email" {...field} className="pl-10" />
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                        <PhoneInput
                          international
                          defaultCountry="IN"
                          placeholder="Enter phone number"
                          value={field.value}
                          onChange={field.onChange}
                          className="border rounded-md p-2 w-full pl-10"
                        />
                      </motion.div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* --- Section 3: Professional Background --- */}
        <motion.div 
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="p-6 bg-white rounded-xl shadow-lg border border-gray-100"
        >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Professional Background</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current & Preferred Locations */}
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="currentLocation"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Current Location <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                            <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <div className="pl-8">
                                <SingleLocationSelector
                                    locations={LOCATION_OPTIONS}
                                    selectedLocation={field.value}
                                    onChange={field.onChange}
                                />
                                </div>
                            </motion.div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="preferredLocations"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preferred Locations <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                            <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <div className="pl-8">
                                <MultiLocationSelector
                                    locations={LOCATION_OPTIONS}
                                    selectedLocations={field.value}
                                    onChange={field.onChange}
                                />
                                </div>
                            </motion.div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                {/* Total Experience */}
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="totalExperience"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Experience (years) <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                            <FormControl>
                                <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <SelectTrigger className="pl-10">
                                    <SelectValue placeholder="Select years" />
                                </SelectTrigger>
                                </motion.div>
                            </FormControl>
                            <SelectContent>{YEARS.map((year) => (<SelectItem key={year} value={year}>{year} years</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="totalExperienceMonths"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Experience (months) <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                            <FormControl>
                                <motion.div variants={fieldHoverEffect} whileHover="hover">
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select months" />
                                    </SelectTrigger>
                                </motion.div>
                            </FormControl>
                            <SelectContent>{MONTHS.map((month) => (<SelectItem key={month} value={month}>{month} months</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                {/* Relevant Experience */}
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="relevantExperience"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Relevant Experience (years)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                            <FormControl>
                                <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <SelectTrigger className="pl-10">
                                    <SelectValue placeholder="Select years" />
                                </SelectTrigger>
                                </motion.div>
                            </FormControl>
                            <SelectContent>{YEARS.map((year) => (<SelectItem key={year} value={year}>{year} years</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="relevantExperienceMonths"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Relevant Experience (months)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} value={field.value?.toString()}>
                            <FormControl>
                                <motion.div variants={fieldHoverEffect} whileHover="hover">
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select months" />
                                    </SelectTrigger>
                                </motion.div>
                            </FormControl>
                            <SelectContent>{MONTHS.map((month) => (<SelectItem key={month} value={month}>{month} months</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
            </div>
        </motion.div>
        
        {/* --- Section 4: Compensation & Logistics --- */}
        <motion.div 
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="p-6 bg-white rounded-xl shadow-lg border border-gray-100"
        >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Compensation & Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Salary */}
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="currentSalary"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Current Salary <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                            <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input 
                                type="number" 
                                min="0" 
                                value={field.value ?? ""} 
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} 
                                placeholder="Enter salary in INR"
                                className="pl-10"
                                />
                            </motion.div>
                            </FormControl>
                            {currentSalary !== undefined && (<p className="text-sm text-gray-500 mt-1">₹ {formatINR(currentSalary)}</p>)}
                            <FormMessage />
                        </FormItem>
                        )}
                        
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="expectedSalary"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Expected Salary <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                            <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input 
                                type="number" 
                                min="0" 
                                value={field.value ?? ""} 
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} 
                                placeholder="Enter salary in INR"
                                className="pl-10"
                                />
                            </motion.div>
                            </FormControl>
                            {expectedSalary !== undefined && (<p className="text-sm text-gray-500 mt-1">₹ {formatINR(expectedSalary)}</p>)}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                {/* Notice Period */}
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="noticePeriod"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notice Period</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <SelectTrigger className="pl-10">
                                    <SelectValue placeholder="Select notice period" />
                                </SelectTrigger>
                                </motion.div>
                            </FormControl>
                            <SelectContent>{NOTICE_PERIOD_OPTIONS.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FormField
                        control={form.control}
                        name="lastWorkingDay"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Last Working Day</FormLabel>
                            <FormControl>
                            <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Input 
                                type="date" 
                                value={field.value ?? ""} 
                                onChange={(e) => field.onChange(e.target.value || undefined)} 
                                placeholder="Select date"
                                className="pl-3"
                                />
                            </motion.div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </motion.div>
                {/* --- DYNAMIC OFFER/JOINING SECTION --- */}
                {(isOfferIssued || isJoined) && (
                    <>
                        <motion.div variants={itemVariants} className="md:col-span-2">
                            <hr className="my-2 border-gray-200" />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                             <FormField
                                control={form.control}
                                name="ctc"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-gray-700">{ctcLabel}</FormLabel>
                                    <div className="flex items-center mt-2">
                                        <FormField
                                            control={form.control} name="currencyType"
                                            render={({ field: currencyField }) => (
                                            <Select onValueChange={currencyField.onChange} value={currencyField.value} disabled>
                                                <FormControl>
                                                    <SelectTrigger className="w-[80px] rounded-r-none border-r-0"><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>{currencies.map((c) => (<SelectItem key={c.value} value={c.value}>{c.symbol}</SelectItem>))}</SelectContent>
                                            </Select>
                                            )}
                                        />
                                        <FormControl>
                                            {/* **FIX 2:** Use the safe formatting function here */}
                                            <Input
                                                type="text"
                                                placeholder="e.g., 1,500,000"
                                                className="rounded-none flex-1"
                                                value={formatForInput(field.value)}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/[^0-9]/g, "");
                                                    field.onChange(rawValue ? Number(rawValue) : undefined);
                                                }}
                                            />
                                        </FormControl>
                                        <FormField
                                            control={form.control} name="budgetType"
                                            render={({ field: budgetField }) => (
                                            <Select onValueChange={budgetField.onChange} value={budgetField.value} disabled>
                                                <FormControl>
                                                    <SelectTrigger className="w-[110px] rounded-l-none border-l-0"><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>{budgetTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                                            </Select>
                                            )}
                                        />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                             <FormField
                                control={form.control}
                                name="joiningDate"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-gray-700">{dateLabel}</FormLabel>
                                    <FormControl>
                                        <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative mt-2">
                                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input type="date" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} className="pl-10"/>
                                        </motion.div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                    />
                </motion.div>

                        <motion.div variants={itemVariants}>
                            <FormField
                                control={form.control} name="offerLetterUrl"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-gray-700">Offer Letter</FormLabel>
                                    <div className="mt-2">
                                        {field.value ? (
                                            <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                                                <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-2 truncate">
                                                    <Paperclip className="h-4 w-4 flex-shrink-0" /> <span className="truncate">View Uploaded Offer Letter</span>
                                                </a>
                                                <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('offer-letter-input')?.click()} disabled={isUploadingOffer}> Change </Button>
                                            </div>
                                        ) : (
                                            <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('offer-letter-input')?.click()} disabled={isUploadingOffer}>
                                                {isUploadingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                                                Upload Offer Letter
                                            </Button>
                                        )}
                                        <Input id="offer-letter-input" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*"  onChange={(e) => handleAttachmentUpload(e, 'offer')} />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </motion.div>

                        {isJoined && (
                            <motion.div variants={itemVariants}>
                                <FormField
                                    control={form.control} name="joiningLetterUrl"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-gray-700">Joining Letter</FormLabel>
                                        <div className="mt-2">
                                            {field.value ? (
                                                <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                                                    <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-2 truncate">
                                                        <Paperclip className="h-4 w-4 flex-shrink-0" /> <span className="truncate">View Uploaded Joining Letter</span>
                                                    </a>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('joining-letter-input')?.click()} disabled={isUploadingJoining}> Change </Button>
                                                </div>
                                            ) : (
                                                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('joining-letter-input')?.click()} disabled={isUploadingJoining}>
                                                    {isUploadingJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                                                    Upload Joining Letter
                                                </Button>
                                            )}
                                            <Input id="joining-letter-input" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*"  onChange={(e) => handleAttachmentUpload(e, 'joining')} />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </motion.div>

{/* --- Section 5: Additional Information --- */}
<motion.div 
    variants={sectionVariants}
    initial="hidden"
    animate="visible"
    className="p-6 bg-white rounded-xl shadow-lg border border-gray-100"
>
    <h3 className="text-xl font-bold mb-4 text-gray-800">Additional Information</h3>
    <div className="space-y-6">
        {/* LinkedIn (unchanged) */}
        <motion.div variants={itemVariants}>
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
                        <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="https://linkedin.com/in/username"
                            {...field}
                            value={field.value ?? ""}
                            disabled={!isLinkedInRequired}
                            className="pl-10"
                        />
                        </motion.div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </motion.div>
        
        {/* Existing Offers with new Button Toggle */}
        <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <FormField
                    control={form.control}
                    name="hasOffers"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-semibold text-gray-700">Do they have existing offers?</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-3 pt-2">
                                <motion.button
                                    type="button"
                                    onClick={() => field.onChange("Yes")}
                                    className={`w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                                    field.value === "Yes"
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    whileHover={{ scale: field.value === "Yes" ? 1.0 : 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Yes
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={() => field.onChange("No")}
                                    className={`w-full rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                                    field.value === "No"
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    whileHover={{ scale: field.value === "No" ? 1.0 : 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    No
                                </motion.button>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                {/* Offer Details field animates in when "Yes" is selected */}
                {hasOffers === "Yes" && (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <FormField
                        control={form.control}
                        name="offerDetails"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-gray-700">Offer Details</FormLabel>
                                <FormControl>
                                    <motion.div variants={fieldHoverEffect} whileHover="hover">
                                        <Input placeholder="e.g., Company, Salary, Role" {...field} value={field.value ?? ""}/>
                                    </motion.div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </motion.div>
                )}
            </div>
        </motion.div>
    </div>
</motion.div>
        {/* --- Action Buttons --- */}
        <div className="flex justify-end space-x-4 pt-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isParsing}>
              Cancel
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="submit" disabled={isParsing} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/50">
              {isParsing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Parsing...
                </div>
              ) : 'Save & Next'}
            </Button>
          </motion.div>
        </div>
      </form>
    </Form>
  );
};

export default BasicInformationTab;
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { City } from "country-state-city";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandItem1,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Loader2,
  Search,
  Briefcase,
  Clock,
  ChevronsUpDown,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Constants & Helpers ---
const NOTICE_PERIOD_OPTIONS = ["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days"];
const SALARY_TYPES = ["LPA", "Monthly", "Hourly"] as const;
const YEARS = Array.from({ length: 31 }, (_, i) => i.toString());
const MONTHS = Array.from({ length: 12 }, (_, i) => i.toString());

const formatINR = (value: number | null | undefined, type: typeof SALARY_TYPES[number]): string => {
  if (value == null || isNaN(value)) return "";
  const num = Number(value);
  const formatted = new Intl.NumberFormat("en-IN").format(num);
  const suffix = type === "LPA" ? "LPA" : type.toLowerCase();
  return `₹ ${formatted} ${suffix}`;
};

const sanitizePhoneNumber = (phone: string | undefined): string | undefined => {
  if (!phone) return undefined;
  return phone.replace(/[^+\d]/g, "");
};

const parseExperience = (experience: string | null | undefined): { years: number; months: number } => {
  if (!experience) return { years: 0, months: 0 };

  const cleaned = experience.trim().toLowerCase().replace(/\s+/g, " ");
  const yMatch = cleaned.match(/(\d+\.?\d*)\s*(y|years|year)?/i);
  const mMatch = cleaned.match(/(\d+)\s*(m|months|month)/i);

  let years = 0;
  let months = 0;

  if (yMatch) {
    const yearValue = parseFloat(yMatch[1]);
    years = Math.floor(yearValue);
    if (yearValue % 1 !== 0) {
      months = Math.round((yearValue % 1) * 12);
    }
  }
  if (mMatch) {
    months = parseInt(mMatch[1], 10) || 0;
  }

  if (months >= 12) {
    years += Math.floor(months / 12);
    months = months % 12;
  }

  return { years, months };
};

const formatExperience = (years: number, months: number): string => {
  if (years === 0 && months === 0) return "0y 0m";
  return `${years}y ${months}m`;
};

// --- Animation Variants ---
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
};
const fieldHoverEffect = {
  hover: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 10 } },
};

export const AddBenchProfileSheet = ({ isOpen, onClose, onSuccess, existingProfile }: any) => {
  const { user, organization_id } = useSelector((state: any) => state.auth);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [talentPoolCandidates, setTalentPoolCandidates] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [filteredIndianCities, setFilteredIndianCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const allIndianCities = useMemo(() => City.getCitiesOfCountry("IN").map((c: any) => c.name).sort(), []);

  // --- Zod Schema ---
  const benchProfileSchema = z.object({
    talent_pool_id: z.string().uuid(),
    name: z.string().min(2, "Name is required"),
    suggested_title: z.string().min(1, "Title or Role is required"),
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    phone: z
      .string()
      .min(1, "Phone is required")
      .regex(/^\+\d{10,15}$/, "Phone number must be with country (e.g., +918019056622)"),
    experience: z.object({
      years: z.number().min(0, "Years must be non-negative").max(30, "Years cannot exceed 30"),
      months: z.number().min(0, "Months must be non-negative").max(11, "Months cannot exceed 11"),
    }),
    relevantExperience: z.object({
      years: z.number().min(0, "Years must be non-negative").max(30, "Years cannot exceed 30"),
      months: z.number().min(0, "Months must be non-negative").max(11, "Months cannot exceed 11"),
    }).optional(),
    current_location: z
      .string()
      .min(1, "Current Location is required")
      .refine((val) => allIndianCities.includes(val), { message: "Select a valid city from the list" }),
    current_salary: z
      .object({
        amount: z.number().min(0, "Amount must be positive"),
        type: z.enum(SALARY_TYPES),
      })
      .refine((data) => data.amount > 0, { message: "Current Salary is required" }),
    expected_salary: z
      .object({
        amount: z.number().min(0, "Amount must be positive"),
        type: z.enum(SALARY_TYPES),
      })
      .refine((data) => data.amount > 0, { message: "Expected Salary is required" }),
    skills: z.array(z.string()).min(1, "At least one skill is required").optional(),
    notice_period: z.enum(NOTICE_PERIOD_OPTIONS, { required_error: "Notice Period is required" }),
    worked_as_freelancer: z.boolean().default(false),
    is_remote_worker: z.boolean().default(false),
  });

  type BenchProfileFormData = z.infer<typeof benchProfileSchema>;

  const form = useForm<BenchProfileFormData>({
    resolver: zodResolver(benchProfileSchema),
    defaultValues: {
      worked_as_freelancer: false,
      is_remote_worker: false,
      skills: [],
      current_salary: { amount: 0, type: "LPA" },
      expected_salary: { amount: 0, type: "LPA" },
      notice_period: "Immediate",
      experience: { years: 0, months: 0 },
      relevantExperience: { years: 0, months: 0 },
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (existingProfile) {
        const { years: expYears, months: expMonths } = parseExperience(existingProfile.experience);
        const { years: relYears, months: relMonths } = parseExperience(existingProfile.relevant_experience);
        const parseSalary = (salaryStr: string | null | undefined) => {
          if (!salaryStr) return { amount: 0, type: "LPA" as const };
          const amountMatch = salaryStr.match(/[\d,]+/);
          const typeMatch = salaryStr.toUpperCase().includes("LPA")
            ? "LPA"
            : salaryStr.toUpperCase().includes("MONTHLY")
            ? "Monthly"
            : "Hourly";
          return {
            amount: amountMatch ? parseFloat(amountMatch[0].replace(/,/g, "")) : 0,
            type: typeMatch,
          };
        };
        const profileData = {
          ...existingProfile,
          phone: sanitizePhoneNumber(existingProfile.phone),
          experience: { years: expYears, months: expMonths },
          relevantExperience: { years: relYears, months: relMonths },
          current_salary: parseSalary(existingProfile.current_salary),
          expected_salary: parseSalary(existingProfile.expected_salary),
          skills: existingProfile.skills || [],
        };
        form.reset(profileData);
        setStep(2);
      } else {
        form.reset({
          worked_as_freelancer: false,
          is_remote_worker: false,
          skills: [],
          current_salary: { amount: 0, type: "LPA" },
          expected_salary: { amount: 0, type: "LPA" },
          notice_period: "Immediate",
          experience: { years: 0, months: 0 },
          relevantExperience: { years: 0, months: 0 },
        });
        setStep(1);
        setSearchQuery("");
        setTalentPoolCandidates([]);
      }
    }
  }, [isOpen, existingProfile, form]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearchQuery.length < 2) {
        setFilteredIndianCities([]);
        return;
      }
      const filtered = allIndianCities
        .filter((c) => c.toLowerCase().includes(locationSearchQuery.toLowerCase()))
        .slice(0, 10);
      setFilteredIndianCities(filtered);
    }, 200);

    return () => clearTimeout(timer);
  }, [locationSearchQuery, allIndianCities]);

  useEffect(() => {
    const searchTalentPool = async () => {
      if (searchQuery.length < 1) {
        setTalentPoolCandidates([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("hr_talent_pool")
          .select("id, candidate_name, email, suggested_title, phone, total_experience, current_location, notice_period, top_skills")
          .eq("organization_id", organization_id)
          .or(`candidate_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);
        if (error) {
          toast.error(`Search failed: ${error.message}`);
          setTalentPoolCandidates([]);
        } else {
          setTalentPoolCandidates(data || []);
        }
      } catch (err) {
        toast.error("An unexpected error occurred during search.");
        setTalentPoolCandidates([]);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(() => {
      searchTalentPool();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, organization_id]);

  const handleSelectCandidate = (candidate: any) => {
    form.reset();
    const { years: expYears, months: expMonths } = parseExperience(candidate.total_experience);
    form.setValue("talent_pool_id", candidate.id);
    form.setValue("name", candidate.candidate_name);
    form.setValue("email", candidate.email);
    form.setValue("phone", sanitizePhoneNumber(candidate.phone));
    form.setValue("experience", { years: expYears, months: expMonths });
    form.setValue("relevantExperience", { years: 0, months: 0 }); // Default for new candidates
    form.setValue("suggested_title", candidate.suggested_title || "");
    form.setValue("current_location", candidate.current_location || "");
    form.setValue("notice_period", candidate.notice_period || "Immediate");
    form.setValue("skills", candidate.top_skills || []);
    form.setValue("current_salary", parseSalaryString(candidate.current_salary || ""));
    form.setValue("expected_salary", parseSalaryString(candidate.expected_salary || ""));
    setStep(2);
  };

  const parseSalaryString = (salaryStr: string) => {
    if (!salaryStr) return { amount: 0, type: "LPA" as const };
    const amountMatch = salaryStr.match(/[\d,]+/);
    const typeMatch = salaryStr.toUpperCase().includes("LPA")
      ? "LPA"
      : salaryStr.toUpperCase().includes("MONTHLY")
      ? "Monthly"
      : "Hourly";
    return {
      amount: amountMatch ? parseFloat(amountMatch[0].replace(/,/g, "")) : 0,
      type: typeMatch,
    };
  };

const onSubmit = async (values: BenchProfileFormData) => {
  console.log("Form submitted with values:", values);
  console.log("Form errors:", form.formState.errors);

  if (Object.keys(form.formState.errors).length > 0) {
    toast.error("Please fix form errors before submitting.");
    return;
  }

  setIsSaving(true);
  try {
    const { relevantExperience, ...restValues } = values; // Destructure to exclude relevantExperience
    const dataToUpsert = {
      ...restValues,
      experience: formatExperience(values.experience.years, values.experience.months),
      relevant_experience: values.relevantExperience
        ? formatExperience(values.relevantExperience.years, values.relevantExperience.months)
        : null,
      current_salary: values.current_salary ? formatINR(values.current_salary.amount, values.current_salary.type) : null,
      expected_salary: values.expected_salary ? formatINR(values.expected_salary.amount, values.current_salary.type) : null,
      organization_id,
      updated_at: new Date().toISOString(),
    };
    if (!existingProfile) dataToUpsert.created_by = user.id;

    console.log("Submitting to Supabase:", dataToUpsert);

    const { error } = existingProfile
      ? await supabase.from("hr_bench_profiles").update(dataToUpsert).eq("id", existingProfile.id)
      : await supabase.from("hr_bench_profiles").insert(dataToUpsert);

    if (error) {
      console.error("Supabase error:", error);
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(`Profile ${existingProfile ? "updated" : "added"}!`);
      onSuccess();
    }
  } catch (err) {
    console.error("Unexpected error during submission:", err);
    toast.error("An unexpected error occurred while saving the profile.");
  } finally {
    setIsSaving(false);
  }
};

  const renderSearchLoader = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">Searching candidates...</p>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Search className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-muted-foreground mb-1">No candidates found</p>
      <p className="text-xs text-muted-foreground">Try searching by name or email</p>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
         {step === 1 && !existingProfile ? (
          <>
            <SheetHeader className="text-center">
              <SheetTitle className="flex items-center justify-center gap-2">
                <User className="h-5 w-5" />
                Select Candidate
              </SheetTitle>
              <SheetDescription>Search your talent pool to add a new bench profile.</SheetDescription>
            </SheetHeader>
            {/* FIX: Use proper filter function to disable client-side filtering without crashing */}
            <Command
              className="flex-grow flex flex-col"
              filter={() => 1} // Always return 1 (full match) to show all items, no client filtering
            >
              <div className="sticky top-0 z-10 bg-background p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <CommandInput
                    className="pl-10 w-full h-10 border rounded-md bg-background shadow-sm"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                </div>
              </div>
              <div className="flex-grow overflow-y-auto">
                <CommandList className="max-h-[calc(80vh-4rem)]">
                  {isSearching ? (
                    <CommandEmpty>{renderSearchLoader()}</CommandEmpty>
                  ) : talentPoolCandidates.length === 0 ? (
                    <CommandEmpty>{renderEmptyState()}</CommandEmpty>
                  ) : (
                    <CommandGroup heading={`Search Results (${talentPoolCandidates.length})`}>
                      {talentPoolCandidates.map((c: any) => (
                        <CommandItem1 
                          key={c.id} 
                          value={c.candidate_name.toLowerCase()} // For semantics/accessibility
                          onSelect={() => handleSelectCandidate(c)} 
                          className="cursor-pointer flex flex-col items-start p-4 gap-2 border-b last:border-b-0 hover:bg-purple-50 data-[selected]:bg-white-50 transition-colors"
                        >
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <p className="font-semibold text-sm leading-tight">{c.candidate_name}</p>
                                <p className="text-xs text-muted-foreground">{c.email}</p>
                              </div>
                            </div>
                            <Check className="h-4 w-4 text-primary mt-1" />
                          </div>
                          {c.suggested_title && (
                            <div className="flex items-center gap-1 text-xs bg-accent/50 px-2 py-1 rounded-md">
                              <Briefcase size={12} />
                              {c.suggested_title}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} />
                              {c.current_location}
                            </div>
                            {c.total_experience && (
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                {c.total_experience}
                              </div>
                            )}
                          </div>
                        </CommandItem1>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </div>
            </Command>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{existingProfile ? "Edit" : "Step 2: Review"} Profile</SheetTitle>
              <SheetDescription>Confirm details and add any missing information.</SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto space-y-6 p-4">
                {Object.keys(form.formState.errors).length > 0 && (
                  <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
                    <p>Please fix the following errors:</p>
                    <ul className="list-disc pl-5">
                      {Object.entries(form.formState.errors).map(([field, error]) => (
                        <li key={field}>
                          {field}: {error.message || JSON.stringify(error)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-4 bg-white rounded-lg shadow-sm border space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="name"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="suggested_title"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title or Role <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="email"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="phone"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <PhoneInput
                              international
                              defaultCountry="IN"
                              value={field.value || ""}
                              onChange={(value) => field.onChange(value || "")}
                              className="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="experience.years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Experience (years) <span className="text-red-500">*</span></FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? Number(value) : 0)}
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <SelectTrigger className="pl-10">
                                  <SelectValue placeholder="Select years" />
                                </SelectTrigger>
                              </motion.div>
                            </FormControl>
                            <SelectContent>
                              {YEARS.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year} years
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
                      name="experience.months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Experience (months) <span className="text-red-500">*</span></FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? Number(value) : 0)}
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <motion.div variants={fieldHoverEffect} whileHover="hover">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select months" />
                                </SelectTrigger>
                              </motion.div>
                            </FormControl>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month} value={month}>
                                  {month} months
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
                      name="relevantExperience.years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relevant Experience (years)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? Number(value) : 0)}
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <SelectTrigger className="pl-10">
                                  <SelectValue placeholder="Select years" />
                                </SelectTrigger>
                              </motion.div>
                            </FormControl>
                            <SelectContent>
                              {YEARS.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year} years
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
                      name="relevantExperience.months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relevant Experience (months)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? Number(value) : 0)}
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <motion.div variants={fieldHoverEffect} whileHover="hover">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select months" />
                                </SelectTrigger>
                              </motion.div>
                            </FormControl>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month} value={month}>
                                  {month} months
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-4 bg-white rounded-lg shadow-sm border space-y-4"
                >
                  <h3 className="font-semibold text-lg">Compensation & Logistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="current_salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Salary <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <div className="flex">
                              <Input
                                type="number"
                                min="0"
                                placeholder="e.g., 5"
                                className="rounded-r-none border-r-0"
                                {...form.register("current_salary.amount", { valueAsNumber: true })}
                                onChange={(e) =>
                                  field.onChange({
                                    amount: parseFloat(e.target.value) || 0,
                                    type: field.value?.type || "LPA",
                                  })
                                }
                              />
                              <Select
                                onValueChange={(value) =>
                                  field.onChange({ ...field.value, type: value as typeof SALARY_TYPES[number] })
                                }
                                value={field.value?.type || "LPA"}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-[100px] rounded-l-none border-l-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SALARY_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          {field.value?.amount > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatINR(field.value.amount, field.value.type)}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expected_salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Salary <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <div className="flex">
                              <Input
                                type="number"
                                min="0"
                                placeholder="e.g., 8"
                                className="rounded-r-none border-r-0"
                                {...form.register("expected_salary.amount", { valueAsNumber: true })}
                                onChange={(e) =>
                                  field.onChange({
                                    amount: parseFloat(e.target.value) || 0,
                                    type: field.value?.type || "LPA",
                                  })
                                }
                              />
                              <Select
                                onValueChange={(value) =>
                                  field.onChange({ ...field.value, type: value as typeof SALARY_TYPES[number] })
                                }
                                value={field.value?.type || "LPA"}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-[100px] rounded-l-none border-l-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SALARY_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          {field.value?.amount > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatINR(field.value.amount, field.value.type)}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notice_period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notice Period <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <motion.div variants={fieldHoverEffect} whileHover="hover" className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <SelectTrigger className="pl-10">
                                  <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                              </motion.div>
                            </FormControl>
                            <SelectContent>
                              {NOTICE_PERIOD_OPTIONS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
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
                      name="current_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Location <span className="text-red-500">*</span></FormLabel>
                          <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value
                                  ? allIndianCities.find((c) => c === field.value) || field.value
                                  : "Select location"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search location..."
                                  value={locationSearchQuery}
                                  onValueChange={setLocationSearchQuery}
                                />
                                <CommandEmpty>
                                  {locationSearchQuery.length < 2 ? "Type to search cities..." : "No location found."}
                                </CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {filteredIndianCities.map((c) => (
                                      <CommandItem
                                        key={c}
                                        value={c}
                                        onSelect={() => {
                                          field.onChange(c);
                                          setLocationPopoverOpen(false);
                                          setLocationSearchQuery("");
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            c === field.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {c}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
                <motion.div
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-4 bg-white rounded-lg shadow-sm border"
                >
                  <h3 className="font-semibold text-lg mb-3">Additional Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="worked_as_freelancer"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <FormLabel>Previously Worked as Freelancer?</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="is_remote_worker"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <FormLabel>Open to Remote? <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
                <SheetFooter className="pt-4 flex flex-row justify-end gap-2 sticky bottom-0 bg-white py-4">
                  {!existingProfile && (
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isSaving}
                    onClick={() => console.log("Add to Bench button clicked")}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {existingProfile ? "Save Changes" : "Add to Bench"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
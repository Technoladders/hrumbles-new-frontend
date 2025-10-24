import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { City } from 'country-state-city';

// UI Components & Icons
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandItem1, CommandList } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, Loader2, Search, Briefcase, DollarSign, IndianRupee, Clock, ChevronsUpDown, User, MapPin, Calendar } from "lucide-react";
import { TalentPoolCandidate } from "@/pages/TalentPoolPage"; // Adjust path if needed
import { cn } from "@/lib/utils"; // Your utility for class names

// --- Constants & Helpers ---
const NOTICE_PERIOD_OPTIONS = ["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days"];
const formatINR = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return "";
  const num = Number(value);
  const formatted = new Intl.NumberFormat("en-IN").format(num);
  if (num >= 10000000) return `₹ ${formatted} (Crore)`;
  if (num >= 100000) return `₹ ${formatted} (Lakh)`;
  return `₹ ${formatted}`;
};

// --- Animation Variants ---
const sectionVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } } };
const fieldHoverEffect = { hover: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 10 } } };

// --- Zod Schema ---
const benchProfileSchema = z.object({
  talent_pool_id: z.string().uuid(),
  name: z.string().min(2, "Name is required"),
  suggested_title: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  current_location: z.string().optional().nullable(),
  current_salary: z.number().optional().nullable(),
  expected_salary: z.number().optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  notice_period: z.string().optional().nullable(),
  worked_as_freelancer: z.boolean().default(false),
  is_remote_worker: z.boolean().default(false),
});

type BenchProfileFormData = z.infer<typeof benchProfileSchema>;

export const AddBenchProfileSheet = ({ isOpen, onClose, onSuccess, existingProfile }: any) => {
  const { user, organization_id } = useSelector((state: any) => state.auth);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [talentPoolCandidates, setTalentPoolCandidates] = useState<TalentPoolCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState(""); // Local query for location filter
  const [filteredIndianCities, setFilteredIndianCities] = useState<string[]>([]); // Only render filtered subset
  
  // FIX: State for debounced search query
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<BenchProfileFormData>({ resolver: zodResolver(benchProfileSchema) });

  // Memoized full Indian cities (computed once on mount)
  const allIndianCities = useMemo(() => City.getCitiesOfCountry('IN').map((c: any) => c.name).sort(), []);

  useEffect(() => {
    if (isOpen) {
      if (existingProfile) {
        const profileData = {
            ...existingProfile,
            current_salary: existingProfile.current_salary ? Number(String(existingProfile.current_salary).replace(/[^0-9.]/g, '')) : undefined,
            expected_salary: existingProfile.expected_salary ? Number(String(existingProfile.expected_salary).replace(/[^0-9.]/g, '')) : undefined,
        };
        form.reset(profileData);
        setStep(2);
      } else {
        form.reset({ worked_as_freelancer: false, is_remote_worker: false, skills: [] });
        setStep(1);
        setSearchQuery(""); // Reset search query on open
        setTalentPoolCandidates([]); // Reset candidates list
      }
    }
  }, [isOpen, existingProfile, form]);
  
  // Debounced filter for location cities (like reference's fetchLocationSuggestions)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearchQuery.length < 2) {
        setFilteredIndianCities([]); // Show nothing until query
        return;
      }
      const filtered = allIndianCities
        .filter(c => c.toLowerCase().includes(locationSearchQuery.toLowerCase()))
        .slice(0, 10); // Limit to 10 for perf
      setFilteredIndianCities(filtered);
    }, 200); // Shorter debounce for responsive feel

    return () => clearTimeout(timer);
  }, [locationSearchQuery, allIndianCities]);

  // FIX: Debounced search effect
  useEffect(() => {
    const searchTalentPool = async () => {
        if (searchQuery.length < 1) {
            setTalentPoolCandidates([]);
            return;
        }
        setIsSearching(true);
        const { data } = await supabase.from('hr_talent_pool').select('id, candidate_name, email, suggested_title, phone, total_experience, current_location, notice_period, top_skills').eq('organization_id', organization_id).or(`candidate_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`).limit(10);
        setTalentPoolCandidates((data as any) || []);
        setIsSearching(false);
    };

    const timer = setTimeout(() => {
        searchTalentPool();
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, organization_id]);


  const handleSelectCandidate = (candidate: any) => {
    form.reset();
    form.setValue("talent_pool_id", candidate.id);
    form.setValue("name", candidate.candidate_name);
    form.setValue("email", candidate.email);
    form.setValue("phone", candidate.phone);
    form.setValue("experience", candidate.total_experience);
    form.setValue("suggested_title", candidate.suggested_title);
    form.setValue("current_location", candidate.current_location);
    form.setValue("notice_period", candidate.notice_period);
    form.setValue("skills", candidate.top_skills || []);
    setStep(2);
  };

  const onSubmit = async (values: BenchProfileFormData) => {
    setIsSaving(true);
    const dataToUpsert = { 
        ...values, 
        current_salary: values.current_salary ? `₹ ${new Intl.NumberFormat("en-IN").format(values.current_salary)}` : null,
        expected_salary: values.expected_salary ? `₹ ${new Intl.NumberFormat("en-IN").format(values.expected_salary)}` : null,
        organization_id, 
        updated_at: new Date().toISOString() 
    };
    if (!existingProfile) dataToUpsert.created_by = user.id;

    const promise = existingProfile ? supabase.from('hr_bench_profiles').update(dataToUpsert).eq('id', existingProfile.id) : supabase.from('hr_bench_profiles').insert(dataToUpsert);
    
    const { error } = await promise;
    if (error) toast.error(`Failed: ${error.message}`);
    else toast.success(`Profile ${existingProfile ? 'updated' : 'added'}!`);
    if(!error) onSuccess();
    setIsSaving(false);
  };

  const currentSalary = form.watch("current_salary");
  const expectedSalary = form.watch("expected_salary");

  // Render loading spinner for search
  const renderSearchLoader = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">Searching candidates...</p>
    </div>
  );

  // Render empty state
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
            <SheetHeader><SheetTitle>{existingProfile ? 'Edit' : 'Step 2: Review'} Profile</SheetTitle><SheetDescription>Confirm details and add any missing information.</SheetDescription></SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto space-y-6 p-4">
                <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg shadow-sm border space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="suggested_title" control={form.control} render={({ field }) => (<FormItem><FormLabel>Title or Role</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="phone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><PhoneInput international defaultCountry="IN" value={field.value as any} onChange={field.onChange} className="input-phone" /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </motion.div>
                <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg shadow-sm border space-y-4">
                    <h3 className="font-semibold text-lg">Compensation & Logistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="current_salary" render={({ field }) => (<FormItem><FormLabel>Current Salary (INR)</FormLabel><FormControl><motion.div variants={fieldHoverEffect} whileHover="hover" className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input type="number" min="0" placeholder="e.g., 1500000" className="pl-10" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)} /></motion.div></FormControl>{field.value != null && (<p className="text-sm text-gray-500 mt-1">{formatINR(field.value)}</p>)}<FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="expected_salary" render={({ field }) => (<FormItem><FormLabel>Expected Salary (INR)</FormLabel><FormControl><motion.div variants={fieldHoverEffect} whileHover="hover" className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input type="number" min="0" placeholder="e.g., 2000000" className="pl-10" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)} /></motion.div></FormControl>{field.value != null && (<p className="text-sm text-gray-500 mt-1">{formatINR(field.value)}</p>)}<FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="notice_period" render={({ field }) => (<FormItem><FormLabel>Notice Period</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><motion.div variants={fieldHoverEffect} whileHover="hover" className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" /><SelectTrigger className="pl-10"><SelectValue placeholder="Select period" /></SelectTrigger></motion.div></FormControl><SelectContent>{NOTICE_PERIOD_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="current_location" render={({ field }) => (<FormItem className=""><FormLabel>Current Location</FormLabel><Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>{field.value ? allIndianCities.find((c) => c === field.value) || field.value : "Select location"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command shouldFilter={false}><CommandInput placeholder="Search location..." value={locationSearchQuery} onValueChange={setLocationSearchQuery} /><CommandEmpty>{locationSearchQuery.length < 2 ? "Type to search cities..." : "No location found."}</CommandEmpty><CommandList><CommandGroup>{filteredIndianCities.map((c) => (<CommandItem key={c} value={c} onSelect={() => {form.setValue("current_location", c); setLocationPopoverOpen(false); setLocationSearchQuery("");}}><Check className={cn("mr-2 h-4 w-4", c === field.value ? "opacity-100" : "opacity-0")} />{c}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    </div>
                </motion.div>
                <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg shadow-sm border"><h3 className="font-semibold text-lg mb-3">Additional Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="worked_as_freelancer" control={form.control} render={({ field }) => (<FormItem className="flex items-center justify-between rounded-lg border p-3"><FormLabel>Previously Worked as Freelancer?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField name="is_remote_worker" control={form.control} render={({ field }) => (<FormItem className="flex items-center justify-between rounded-lg border p-3"><FormLabel>Open to Remote?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div></motion.div>
                <SheetFooter className="pt-4 flex flex-row justify-end gap-2 sticky bottom-0 bg-white py-4">
                    {!existingProfile && <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
                    <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{existingProfile ? 'Save Changes' : 'Add to Bench'}</Button>
                </SheetFooter>
              </form>
            </Form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
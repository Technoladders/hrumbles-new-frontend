import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

// UI Components
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Check, Loader2, User, Mail, Phone, MapPin, Briefcase, DollarSign, Clock } from "lucide-react";
import { TalentPoolCandidate } from "@/pages/TalentPoolPage"; // Adjust path if needed

// Animation Variants
const sectionVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Zod Schema for Validation
const benchProfileSchema = z.object({
  talent_pool_id: z.string().uuid(),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  current_location: z.string().optional().nullable(),
  current_salary: z.string().optional().nullable(),
  expected_salary: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  notice_period: z.string().optional().nullable(),
  worked_as_freelancer: z.boolean().default(false),
  is_remote_worker: z.boolean().default(false),
});

type BenchProfileFormData = z.infer<typeof benchProfileSchema>;

interface AddBenchProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProfile?: any; // Pass profile data for editing
}

export const AddBenchProfileDrawer = ({ isOpen, onClose, onSuccess, existingProfile }: AddBenchProfileDrawerProps) => {
  const { user, organization_id } = useSelector((state: any) => state.auth);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [talentPoolCandidates, setTalentPoolCandidates] = useState<TalentPoolCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<BenchProfileFormData>({
    resolver: zodResolver(benchProfileSchema),
  });
  
  useEffect(() => {
    if (isOpen) {
      if (existingProfile) {
        // Edit mode: Skip to step 2 and populate form
        form.reset(existingProfile);
        setStep(2);
      } else {
        // Create mode: Start at step 1 and reset form
        form.reset({ worked_as_freelancer: false, is_remote_worker: false, skills: [] });
        setStep(1);
      }
    }
  }, [isOpen, existingProfile, form]);


  const searchTalentPool = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setTalentPoolCandidates([]);
      return;
    }
    setIsSearching(true);
    const { data } = await supabase
      .from('hr_talent_pool')
      .select('id, candidate_name, email, phone, total_experience, current_location, current_salary, expected_salary, notice_period, top_skills')
      .eq('organization_id', organization_id)
      .or(`candidate_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);
    setTalentPoolCandidates((data as any) || []);
    setIsSearching(false);
  };

  const handleSelectCandidate = (candidate: any) => {
    form.reset(); // Clear previous data
    form.setValue("talent_pool_id", candidate.id);
    form.setValue("name", candidate.candidate_name);
    form.setValue("email", candidate.email);
    form.setValue("phone", candidate.phone);
    form.setValue("experience", candidate.total_experience);
    form.setValue("current_location", candidate.current_location);
    form.setValue("current_salary", candidate.current_salary);
    form.setValue("expected_salary", candidate.expected_salary);
    form.setValue("notice_period", candidate.notice_period);
    form.setValue("skills", candidate.top_skills || []);
    setStep(2);
  };
  
  const onSubmit = async (values: BenchProfileFormData) => {
    setIsSaving(true);
    const dataToUpsert = {
      ...values,
      organization_id: organization_id,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const promise = existingProfile
      ? supabase.from('hr_bench_profiles').update(dataToUpsert).eq('id', existingProfile.id)
      : supabase.from('hr_bench_profiles').insert(dataToUpsert);

    const { error } = await promise;

    if (error) {
      toast.error(`Failed to save profile: ${error.message}`);
    } else {
      toast.success(`Profile ${existingProfile ? 'updated' : 'added'} successfully!`);
      onSuccess();
    }
    setIsSaving(false);
  };
  
  const renderStepOne = () => (
    <>
      <DrawerHeader>
        <DrawerTitle>Step 1: Select a Candidate</DrawerTitle>
        <DrawerDescription>Search and select a candidate from your talent pool to begin.</DrawerDescription>
      </DrawerHeader>
      <div className="p-4">
        <Command>
          <CommandInput placeholder="Search by name or email..." onValueChange={searchTalentPool} />
          <CommandList>
            <CommandEmpty>{isSearching ? "Searching..." : "No candidates found."}</CommandEmpty>
            <CommandGroup>
              {talentPoolCandidates.map((candidate) => (
                <CommandItem key={candidate.id} onSelect={() => handleSelectCandidate(candidate)} className="cursor-pointer">
                  {candidate.candidate_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </>
  );

  const renderStepTwo = () => (
     <>
      <DrawerHeader>
        <DrawerTitle>{existingProfile ? 'Edit' : 'Step 2: Review & Complete'} Bench Profile</DrawerTitle>
        <DrawerDescription>Confirm the auto-filled details and add any missing information.</DrawerDescription>
      </DrawerHeader>
       <div className="p-4 overflow-y-auto">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-3">Candidate Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="phone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </motion.div>

                <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-3">Professional Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField name="experience" control={form.control} render={({ field }) => (<FormItem><FormLabel>Experience</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="current_location" control={form.control} render={({ field }) => (<FormItem><FormLabel>Current Location</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="current_salary" control={form.control} render={({ field }) => (<FormItem><FormLabel>Current Salary</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="expected_salary" control={form.control} render={({ field }) => (<FormItem><FormLabel>Expected Salary</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="notice_period" control={form.control} render={({ field }) => (<FormItem><FormLabel>Notice Period</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="skills" control={form.control} render={({ field }) => (<FormItem><FormLabel>Skills</FormLabel><FormControl><Input placeholder="Comma-separated" onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} value={Array.isArray(field.value) ? field.value.join(', ') : ''}/></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </motion.div>

                <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="p-4 bg-white rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-3">Additional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="worked_as_freelancer" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Worked as Freelancer?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                        <FormField name="is_remote_worker" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Open to Remote?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </div>
                </motion.div>

                <DrawerFooter className="pt-4 flex flex-row justify-end gap-2">
                    {!existingProfile && <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {existingProfile ? 'Save Changes' : 'Add to Bench'}
                    </Button>
                </DrawerFooter>
            </form>
        </Form>
      </div>
    </>
  );

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        {step === 1 && !existingProfile ? renderStepOne() : renderStepTwo()}
      </DrawerContent>
    </Drawer>
  );
};
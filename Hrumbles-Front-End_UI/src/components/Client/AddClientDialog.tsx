import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { clientFormSchema, type ClientFormValues } from "@/lib/schemas/client";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import Stepper from "./form/Stepper";
import SelectCompanyStep from "./form/SelectCompanyStep";
import ClientDetailsStep from "./form/ClientDetailsStep";
import ClientContactsStep from "./form/ClientContactsStep";
import ClientAddressStep from "./form/ClientAddressStep";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientToEdit?: any;
  onClientAdded?: () => void;
}

// Helper to parse the address string. This is a best-effort approach
// and might need adjustment based on address format variety.
const parseAddress = (fullAddress: string) => {
  if (!fullAddress) return {};
  const parts = fullAddress.split(',').map(p => p.trim());
  const address: any = {};
 
  // Assumption: Last part might contain zip and country
  const lastPart = parts[parts.length - 1] || "";
  const zipMatch = lastPart.match(/\b\d{6}\b/);
  if (zipMatch) {
    address.zipCode = zipMatch[0];
  }
 
  address.country = "India"; // Default or parse from string
  address.state = parts[parts.length - 2] || "";
  address.city = parts[parts.length - 3] || "";
  address.street = parts.slice(0, -3).join(', ');
  return address;
};

const STEPS = ["Details", "Contacts", "Address"];

const stepValidationFields = {
  1: ["display_name", "client_name", "service_type"],
  2: ["contacts"],
  3: []
};

const AddClientDialog = ({ open, onOpenChange, clientToEdit, onClientAdded }: AddClientDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      display_name: "",
      client_name: "",
      end_client: "",
      contacts: [{ name: "", email: "", phone: "", designation: "" }],
      currency: "INR",
      service_type: [],
      payment_terms: 30,
      internal_contact: "",
      billing_address: { street: "", city: "", state: "", country: "India", zipCode: "" },
      shipping_address: { street: "", city: "", state: "", country: "India", zipCode: "" },
      commission_type: undefined,
      commission_value: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset();
      if (clientToEdit) {
        setCurrentStep(1);
        fetchClientDetails();
      } else {
        setCurrentStep(0);
      }
    } else {
      setCurrentStep(0);
    }
  }, [open, clientToEdit, form]);

  const fetchClientDetails = async () => {
    if (!clientToEdit) return;

    const { data: clientData, error: clientError } = await supabase
      .from("hr_clients")
      .select("*")
      .eq("id", clientToEdit.id)
      .single();

    const { data: contactsData, error: contactsError } = await supabase
      .from("hr_client_contacts")
      .select("*")
      .eq("client_id", clientToEdit.id);

    if (clientError || contactsError) {
      toast.error("Failed to load client details");
      return;
    }

    const cleanedContacts = contactsData.map((contact: any) => ({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      designation: contact.designation || "",
    }));

    form.reset({
      display_name: clientData.display_name || "",
      client_name: clientData.client_name || "",
      end_client: clientData.end_client || "",
      contacts: cleanedContacts.length > 0 ? cleanedContacts : [{ name: "", email: "", phone: "", designation: "" }],
      currency: clientData.currency || "INR",
      service_type: clientData.service_type || [],
      payment_terms: clientData.payment_terms || 30,
      internal_contact: clientData.internal_contact || "",
      billing_address: clientData.billing_address || { street: "", city: "", state: "", country: "India", zipCode: "" },
      shipping_address: clientData.shipping_address || { street: "", city: "", state: "", country: "India", zipCode: "" },
      commission_type: clientData.commission_type || undefined,
      commission_value: clientData.commission_value || undefined,
    });
  };

  const handleCompanySelect = (company: any) => {
    form.setValue("client_name", company.company_name, { shouldValidate: true });
    form.setValue("display_name", company.company_name, { shouldValidate: true });
    // NEW: Auto-fill address
    if (company.registered_address) {
      const parsed = parseAddress(company.registered_address);
      form.setValue("billing_address", {
        street: parsed.street || "",
        city: parsed.city || "",
        state: company.state || parsed.state || "",
        country: parsed.country || "India",
        zipCode: parsed.zipCode || "",
      });
      form.setValue("shipping_address", {
        street: parsed.street || "",
        city: parsed.city || "",
        state: company.state || parsed.state || "",
        country: parsed.country || "India",
        zipCode: parsed.zipCode || "",
      });
    }
    setCurrentStep(1);
  };

  const handleManualEntry = () => {
    setCurrentStep(1);
  };

  const handleNext = async () => {
    const fieldsToValidate = stepValidationFields[currentStep];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const onSubmit = async (values: ClientFormValues) => {
    try {
      if (!user || !organization_id) {
        toast.error("Authentication error: Missing user or organization ID");
        return;
      }

      if (clientToEdit) {
        const clientData = {
          display_name: values.display_name,
          client_name: values.client_name,
          end_client: values.end_client,
          currency: values.currency,
          service_type: values.service_type,
          payment_terms: values.payment_terms,
          internal_contact: values.internal_contact,
          billing_address: values.billing_address,
          shipping_address: values.shipping_address,
          commission_type: values.commission_type,
          commission_value: values.commission_value,
          updated_by: user.id,
          status: "active",
        };

        const { error: clientError } = await supabase
          .from("hr_clients")
          .update(clientData)
          .eq("id", clientToEdit.id);

        if (clientError) throw clientError;

        await supabase.from("hr_client_contacts").delete().eq("client_id", clientToEdit.id);

        const contactsToInsert = values.contacts.map((contact) => ({
          client_id: clientToEdit.id,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          designation: contact.designation || null,
          organization_id
        }));

        const { error: contactsError } = await supabase
          .from("hr_client_contacts")
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;

        toast.success("Client updated successfully");
      } else {
        const clientData = {
          display_name: values.display_name,
          client_name: values.client_name,
          end_client: values.end_client,
          currency: values.currency,
          service_type: values.service_type,
          payment_terms: values.payment_terms,
          internal_contact: values.internal_contact,
          billing_address: values.billing_address,
          shipping_address: values.shipping_address,
          commission_type: values.commission_type,
          commission_value: values.commission_value,
          organization_id,
          created_by: user.id,
          updated_by: user.id,
          status: "active",
        };

        const { data: clientResult, error: clientError } = await supabase
          .from("hr_clients")
          .insert(clientData)
          .select("id")
          .single();

        if (clientError) throw clientError;

        const clientId = clientResult.id;
        const contactsToInsert = values.contacts.map((contact) => ({
          client_id: clientId,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          designation: contact.designation || null,
          organization_id
        }));

        const { error: contactsError } = await supabase
          .from("hr_client_contacts")
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;

        toast.success("Client added successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["hr_clients"] });
      onClientAdded?.();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(clientToEdit ? "Failed to update client" : "Failed to add client");
    }
  };

  // CHANGED: New handler to explicitly trigger submission
  const handleSave = () => {
    form.handleSubmit(onSubmit)();
  };

  const { isSubmitting, isValid } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-center">
            {clientToEdit ? "Edit Client" : "Create New Client"}
          </DialogTitle>
        </DialogHeader>
       
        {currentStep > 0 && <Stepper steps={STEPS} currentStep={currentStep} />}
       
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <Form {...form}>
            {/* CHANGED: Switched to a defensive onSubmit to prevent accidental triggers */}
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <AnimatePresence mode="wait">
                 <motion.div
                    key={currentStep}
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                >
                    {currentStep === 0 && <SelectCompanyStep onCompanySelect={handleCompanySelect} onManualEntry={handleManualEntry} />}
                    {currentStep === 1 && <ClientDetailsStep form={form} />}
                    {currentStep === 2 && <ClientContactsStep form={form} />}
                    {currentStep === 3 && <ClientAddressStep form={form} />}
                </motion.div>
              </AnimatePresence>
             
              {currentStep > 0 && (
                <div className="flex justify-between items-center pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={handleBack} disabled={currentStep <= 1}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div className="flex gap-2">
                         <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        {currentStep < STEPS.length ? (
                            <Button type="button" onClick={handleNext}>Next</Button>
                        ) : (
                            // CHANGED: This button now uses the explicit handleSave onClick handler
                            <Button type="button" onClick={handleSave} disabled={isSubmitting || !isValid}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {clientToEdit ? "Update Client" : "Save Client"}
                            </Button>
                        )}
                    </div>
                </div>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
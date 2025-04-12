import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Form } from "../../components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { clientFormSchema, type ClientFormValues } from "../../lib/schemas/client";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ClientBasicInfo from "./form/ClientBasicInfo";
import ClientAddress from "./form/ClientAddress";
import ContactList from "./form/ContactList";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientToEdit?: any;
}

const AddClientDialog = ({ open, onOpenChange, clientToEdit }: AddClientDialogProps) => {
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmittingIntentionally, setIsSubmittingIntentionally] = useState(false); // New flag
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
      billing_address: { street: "", city: "", state: "", country: "", zipCode: "" },
      shipping_address: { street: "", city: "", state: "", country: "", zipCode: "" },
      commission_type: undefined,
      commission_value: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (clientToEdit) {
      const fetchClientDetails = async () => {
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

        form.reset({
          display_name: clientData.display_name || "",
          client_name: clientData.client_name || "",
          end_client: clientData.end_client || "",
          contacts: contactsData.length > 0 ? contactsData : [{ name: "", email: "", phone: "", designation: "" }],
          currency: clientData.currency || "INR",
          service_type: clientData.service_type || [],
          payment_terms: clientData.payment_terms || 30,
          internal_contact: clientData.internal_contact || "",
          billing_address: clientData.billing_address || { street: "", city: "", state: "", country: "", zipCode: "" },
          shipping_address: clientData.shipping_address || { street: "", city: "", state: "", country: "", zipCode: "" },
          commission_type: clientData.commission_type || undefined,
          commission_value: clientData.commission_value || undefined,
        });
      };
      fetchClientDetails();
    }
  }, [clientToEdit, form]);

  const onSubmit = async (values: ClientFormValues) => {
    console.log("onSubmit called with values:", values); // Debug log
    if (!isSubmittingIntentionally) {
      console.log("Submission blocked: Not intentional");
      return; // Prevent submission unless explicitly triggered by Save button
    }

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
        }));

        const { error: contactsError } = await supabase
          .from("hr_client_contacts")
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;

        toast.success("Client added successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["hr_clients"] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(clientToEdit ? "Failed to update client" : "Failed to add client");
    } finally {
      setIsSubmittingIntentionally(false); // Reset flag
    }
  };

  const isDetailsTabValid = () => {
    const values = form.getValues();
    const isValid = values.display_name.trim() !== "" && values.service_type.length > 0;
    console.log("Details tab valid:", isValid);
    return isValid;
  };

  const isContactsTabValid = () => {
    const values = form.getValues();
    const isValid = values.contacts.length > 0 && values.contacts.every(contact => contact.name.trim() !== "");
    console.log("Contacts tab valid:", isValid);
    return isValid;
  };

  const handleNext = () => {
    console.log("handleNext called, current tab:", activeTab); // Debug log
    if (activeTab === "details" && isDetailsTabValid()) {
      setActiveTab("contacts");
    } else if (activeTab === "contacts" && isContactsTabValid()) {
      setActiveTab("address");
    } else {
      toast.error("Please fill all required fields before proceeding.");
    }
  };

  const handleSave = () => {
    console.log("Save button clicked"); // Debug log
    setIsSubmittingIntentionally(true);
    form.handleSubmit(onSubmit)();
  };

  const { isSubmitting, isValid, errors } = form.formState;

  if (process.env.NODE_ENV === "development") {
    console.log("Form Errors:", errors);
    console.log("Form Values:", form.getValues());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-4">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-semibold">
            {clientToEdit ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submission prevented"); // Debug log
            }}
            className="space-y-2"
          >
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-2">
                  <TabsTrigger value="details" className="text-sm">Client Details</TabsTrigger>
                  <TabsTrigger value="contacts" className="text-sm">Contacts</TabsTrigger>
                  <TabsTrigger value="address" className="text-sm">Address Info</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-2">
                  <ClientBasicInfo form={form} />
                </TabsContent>
                <TabsContent value="contacts" className="space-y-2">
                  <ContactList form={form} />
                </TabsContent>
                <TabsContent value="address" className="space-y-2">
                  <ClientAddress form={form} />
                </TabsContent>
              </Tabs>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {activeTab === "address" ? (
                <Button
                  type="button" // Changed to type="button"
                  size="sm"
                  disabled={isSubmitting || !isValid}
                  onClick={handleSave} // Use handleSave instead of direct submit
                >
                  {isSubmitting ? "Saving..." : (clientToEdit ? "Update" : "Save")}
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
            {process.env.NODE_ENV === "development" && (
              <div className="text-xs text-gray-500 mt-2">
                Form Valid: {isValid.toString()} | Submitting: {isSubmitting.toString()}
                <pre>{JSON.stringify(errors, null, 2)}</pre>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
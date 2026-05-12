import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/jobs/ui/dialog";
import { Button } from "@/components/jobs/ui/button";
import { Label } from "@/components/jobs/ui/label";
import { MultiEmployeeSelect } from "@/components/ui/multi-employee-select";
import { toast } from "sonner";
import { Loader2, UserCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { JobData } from "@/lib/types";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";

interface JobPocModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobData | null;
  onSaved: () => void; // to refetch jobs after update
}

const JobPocModal = ({ isOpen, onClose, job, onSaved }: JobPocModalProps) => {
  const [clientContacts, setClientContacts] = useState<
    { id: string; first_name: string; last_name: string }[]
  >([]);
  const [internalContacts, setInternalContacts] = useState<
    { id: string; first_name: string; last_name: string }[]
  >([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedInternalIds, setSelectedInternalIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  const organization_id = useSelector(
    (state: any) => state.auth.organization_id
  );

  // Fetch client and contacts when modal opens
  useEffect(() => {
    if (!isOpen || !job?.clientDetails?.clientName) return;
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // 1. Find client ID by name
        const { data: clientData, error: clientError } = await supabase
          .from("hr_clients")
          .select("id, internal_contact_ids")
          .eq("client_name", job.clientDetails!.clientName)
          .eq("organization_id", organization_id)
          .single();

        if (clientError || !clientData) {
          toast.error("Client not found");
          setLoadingData(false);
          return;
        }
        setClientId(clientData.id);

        // 2. Fetch client contacts (hr_client_contacts)
        const { data: contactsData } = await supabase
          .from("hr_client_contacts")
          .select("id, name")
          .eq("client_id", clientData.id);

        setClientContacts(
          (contactsData || []).map((c) => ({
            id: c.id,
            first_name: c.name,
            last_name: "",
          }))
        );

        // 3. Fetch internal POC employees
        const internalIds = clientData.internal_contact_ids || [];
        if (internalIds.length > 0) {
          const { data: empData } = await supabase
            .from("hr_employees")
            .select("id, first_name, last_name")
            .in("id", internalIds);
          setInternalContacts(empData || []);
        } else {
          setInternalContacts([]);
        }

        // 4. Pre‑select existing assignments
        const currentDetails = job.clientDetails || {};
        if (currentDetails.point_of_contact_ids?.length) {
          setSelectedContactIds(currentDetails.point_of_contact_ids);
        } else if (currentDetails.pointOfContact) {
          // fallback for old jobs: match by name
          const names = currentDetails.pointOfContact.split(",").map((s: string) => s.trim());
          const matchedIds = (contactsData || [])
            .filter((c) => names.includes(c.name))
            .map((c) => c.id);
          setSelectedContactIds(matchedIds);
        } else {
          setSelectedContactIds([]);
        }

        setSelectedInternalIds(currentDetails.internal_poc_ids || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load contact data");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [isOpen, job?.id]);

  const handleSave = async () => {
    if (!job?.id || !clientId) return;
    setSaving(true);
    try {
      // Build pointOfContact names
      const contactNames = selectedContactIds
        .map((id) => clientContacts.find((c) => c.id === id)?.first_name)
        .filter(Boolean)
        .join(", ");

      // Fetch current client_details
      const { data: currentJob, error: fetchError } = await supabase
        .from("hr_jobs")
        .select("client_details")
        .eq("id", job.id)
        .single();

      if (fetchError) throw fetchError;

      const newDetails = {
        ...currentJob.client_details,
        pointOfContact: contactNames,
        point_of_contact_ids: selectedContactIds,
        internal_poc_ids: selectedInternalIds,
      };

      const { error: updateError } = await supabase
        .from("hr_jobs")
        .update({ client_details: newDetails })
        .eq("id", job.id);

      if (updateError) throw updateError;

      toast.success("Points of contact updated");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update contacts");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0 border-0 shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-bold leading-tight">
                Manage Points of Contact
              </DialogTitle>
              <DialogDescription className="text-violet-200 text-xs mt-0.5 truncate max-w-[340px]">
                {job?.title}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-5 space-y-5">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-xs text-slate-400">Loading contacts…</p>
            </div>
          ) : (
            <>
              {/* Client Point of Contact */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Client Point of Contact
                </Label>
                <MultiEmployeeSelect
                  value={selectedContactIds}
                  onChange={setSelectedContactIds}
                  employees={clientContacts}
                  placeholder="Select client contact(s)…"
                  disabled={saving}
                />
              </div>

              {/* Internal Point of Contact */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Internal Point of Contact
                </Label>
                <MultiEmployeeSelect
                  value={selectedInternalIds}
                  onChange={setSelectedInternalIds}
                  employees={internalContacts}
                  placeholder="Select internal contact(s)…"
                  disabled={saving}
                />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loadingData}
              className="h-8 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 shadow-sm px-4"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Contacts"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobPocModal;
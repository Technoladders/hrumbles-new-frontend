import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientDetailsData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { MultiEmployeeSelect } from "@/components/ui/multi-employee-select";

interface ClientInformationFieldsProps {
  data: ClientDetailsData;
  onChange: (data: Partial<ClientDetailsData>) => void;
}

const ClientInformationFields = ({ data, onChange }: ClientInformationFieldsProps) => {
  const [clients, setClients] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [internalContactsList, setInternalContactsList] = useState<any[]>([]);

  // Multi‑select state
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Fetch clients and all contacts once
  useEffect(() => {
    const fetchData = async () => {
      const { data: clientData } = await supabase.from("hr_clients").select("*");
      setClients(clientData || []);
      setFilteredClients(clientData || []);

      const { data: contactsData } = await supabase.from("hr_client_contacts").select("*");
      setAllContacts(contactsData || []);
    };
    fetchData();
  }, []);

  // Auto‑match client when editing
  useEffect(() => {
    if (data.clientName && clients.length > 0) {
      const matched = clients.find(c => c.client_name === data.clientName);
      if (matched) {
        setSelectedClient(matched.id);
        onChange({ clientName: matched.client_name });
      }
    }
  }, [clients, data.clientName]);

  // Filter contacts when selectedClient changes (NO reset here)
  useEffect(() => {
    if (!selectedClient) {
      setFilteredContacts([]);
      return;
    }
    const related = allContacts.filter(c => c.client_id === selectedClient);
    setFilteredContacts(related);
  }, [selectedClient, allContacts]);

  // Fetch internal POC list for the selected client
  useEffect(() => {
    const fetchInternal = async () => {
      if (!selectedClient) {
        setInternalContactsList([]);
        return;
      }
      const { data: clientData } = await supabase
        .from("hr_clients")
        .select("internal_contact_ids")
        .eq("id", selectedClient)
        .single();
      const ids = clientData?.internal_contact_ids || [];
      if (ids.length > 0) {
        const { data: employees } = await supabase
          .from("hr_employees")
          .select("id, first_name, last_name")
          .in("id", ids);
        setInternalContactsList(employees || []);
      } else {
        setInternalContactsList([]);
      }
    };
    fetchInternal();
  }, [selectedClient]);

  // Initialize selectedContactIds from form data (handles old & new formats)
  useEffect(() => {
    if (filteredContacts.length === 0) return;

    // New format: array of UUIDs
    if (data.pointOfContactIds && data.pointOfContactIds.length > 0) {
      setSelectedContactIds(data.pointOfContactIds);
    } 
    // Old format: single string (possibly comma‑separated names)
    else if (data.pointOfContact && typeof data.pointOfContact === "string") {
      const names = data.pointOfContact.split(",").map(n => n.trim()).filter(Boolean);
      const matchedIds = filteredContacts
        .filter(c => names.includes(c.name))
        .map(c => c.id);
      setSelectedContactIds(matchedIds);
    } else {
      setSelectedContactIds([]);
    }
  }, [filteredContacts, data.pointOfContactIds, data.pointOfContact]);

  // Transform filtered contacts for MultiEmployeeSelect
  const contactOptions = useMemo(() => 
    filteredContacts.map(c => ({
      id: c.id,
      first_name: c.name,
      last_name: "",
    })), [filteredContacts]
  );

  // Called when user manually selects a client
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      onChange({ clientName: client.client_name, endClient: client.end_client || "" });
      // Reset point‑of‑contact when client changes
      setSelectedContactIds([]);
      onChange({ pointOfContact: "", pointOfContactIds: [] });
    }
  };

  // Called when point‑of‑contact multi‑select changes
  const handlePointOfContactChange = (ids: string[]) => {
    setSelectedContactIds(ids);
    const names = ids
      .map(id => filteredContacts.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    onChange({ pointOfContactIds: ids, pointOfContact: names });
  };

  return (
    <>
      {/* Client Name */}
      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name <span className="text-red-500">*</span></Label>
        <Select onValueChange={handleClientChange} value={selectedClient || undefined}>
          <SelectTrigger id="clientName">
            <SelectValue placeholder="Select a client">
              {clients.find(c => c.id === selectedClient)?.client_name || data.clientName || "Select a client"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredClients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.client_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Point of Contact – Multi‑Select */}
      <div className="space-y-2">
        <Label>Point of Contact</Label>
        <MultiEmployeeSelect
          value={selectedContactIds}
          onChange={handlePointOfContactChange}
          employees={contactOptions}
          placeholder="Select contacts..."
        />
      </div>

      {/* Internal Point of Contact */}
      <div className="space-y-2">
        <Label>Internal Point of Contact</Label>
        <MultiEmployeeSelect
          value={data.internalPocIds || []}
          onChange={(ids) => onChange({ internalPocIds: ids })}
          employees={internalContactsList}
          placeholder="Select internal contacts..."
        />
      </div>
    </>
  );
};

export default ClientInformationFields;
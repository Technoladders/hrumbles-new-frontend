import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [internalContactsList, setInternalContactsList] = useState<any[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      const { data: clientData } = await supabase.from("hr_clients").select("*");
    

// NEW (all clients)
setClients(clientData || []);
setFilteredClients(clientData || []);
    };

    const fetchContacts = async () => {
      const { data: contactData } = await supabase.from("hr_client_contacts").select("*");
      setContacts(contactData);
    };

    fetchClients();
    fetchContacts();
  }, []);

  // Set selectedClient once clients are available
  useEffect(() => {
    if (data.clientName && clients.length > 0) {
      const matchedClient = clients.find(client => client.client_name === data.clientName);
      if (matchedClient) {
        setSelectedClient(matchedClient.id);
        onChange({ clientName: matchedClient.client_name }); // Ensure the form data is updated
      }
    }
  }, [clients, data.clientName]); // Runs whenever clients or clientName changes

   // Fetch internal contacts for selected client
  useEffect(() => {
    const fetchInternalContacts = async () => {
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
    fetchInternalContacts();
  }, [selectedClient]);

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);

    // Find the selected client by ID
    const client = clients.find(client => client.id === clientId);
    if (client) {
      onChange({ clientName: client.client_name, endClient: client.end_client || "" });

      // Filter contacts for the selected client
      const relatedContacts = contacts.filter(contact => contact.client_id === client.id);
      setFilteredContacts(relatedContacts);
    }
  };

  return (
    <>
      {/* Client Name Field */}
      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name <span className="text-red-500">*</span></Label>
        <Select onValueChange={handleClientChange} value={selectedClient || undefined}>
          <SelectTrigger id="clientName">
            <SelectValue placeholder="Select a client">
              {clients.find(client => client.id === selectedClient)?.client_name || data.clientName || "Select a client"}
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

      {/* End Client Field */}
      {/* <div className="space-y-2">
        <Label htmlFor="endClient">End Client</Label>
        <Input 
          id="endClient" 
          value={data.endClient || ""} 
          onChange={(e) => onChange({ endClient: e.target.value })} 
          placeholder="Enter end client (if different)"
        />
      </div> */}

      {/* Point of Contact Field */}
      <div className="space-y-2">
        <Label htmlFor="pointOfContact">Point of Contact</Label>
        <Select 
          onValueChange={(value) => onChange({ pointOfContact: value })} 
          value={data.pointOfContact || undefined}
        >
          <SelectTrigger id="pointOfContact">
            <SelectValue placeholder="Select a contact">
              {data.pointOfContact || "Select a contact"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredContacts.map(contact => (
              <SelectItem key={contact.id} value={contact.name}>
                {contact.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

       {/* NEW: Internal Point of Contact (multi-select from client's internal contacts) */}
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
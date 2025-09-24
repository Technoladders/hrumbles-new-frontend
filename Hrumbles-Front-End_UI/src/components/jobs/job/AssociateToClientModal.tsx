import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { JobData } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import supabase from "@/config/supabaseClient";
import { toast } from "sonner";
import { Loader2, Plus, ChevronsUpDown, Check } from "lucide-react";

interface AssociateToClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobData;
  onAssociate: (updatedJob: JobData) => Promise<void>;
}

interface Client {
  id: string;
  client_name: string;
  service_type: string[];
}

interface ClientProject {
  id: string;
  name: string;
  client_id: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  client_id: string;
}

const AssociateToClientModal = ({ 
  isOpen, 
  onClose, 
  job, 
  onAssociate 
}: AssociateToClientModalProps) => {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [budgetType, setBudgetType] = useState<string>("LPA");
  const [budget, setBudget] = useState<string>("");
  const [currencyType, setCurrencyType] = useState<string>("INR");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [isInternPaid, setIsInternPaid] = useState<string>("Paid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openClientPopover, setOpenClientPopover] = useState(false);
  const isInitialMount = useRef(true);
  const navigate = useNavigate();

  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients-permanent-contractual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_clients')
        .select('id, client_name, service_type');
      if (error) throw error;
      return data as Client[];
    }
  });
  
  const filteredClients = clients.filter(client => 
    client.service_type.includes("permanent") || 
    client.service_type.includes("contractual")
  );
  
  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['client-projects', selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from('hr_projects')
        .select('id, name, client_id')
        .eq('client_id', selectedClient);
      if (error) throw error;
      return data as ClientProject[];
    },
    enabled: !!selectedClient,
  });
  
  const { data: contacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ['client-contacts', selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from('hr_client_contacts')
        .select('id, name, email, phone, designation, client_id')
        .eq('client_id', selectedClient);
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!selectedClient,
  });
  
  useEffect(() => {
    if (isOpen && isInitialMount.current) {
      if (job.clientDetails?.clientName) {
        const client = clients.find(c => c.client_name === job.clientDetails.clientName);
        if (client) {
          setSelectedClient(client.id);
          if (job.clientDetails.clientBudget) {
            const currentCurrency = currencies.find(c => job.clientDetails.clientBudget.startsWith(c.symbol)) || currencies[0];
            const budgetParts = job.clientDetails.clientBudget.replace(currentCurrency.symbol, "").trim().split(' ');
            const amount = budgetParts[0] || '';
            const type = budgetParts[1] || 'LPA';
            setBudget(amount);
            setBudgetType(type);
            setCurrencyType(currentCurrency.value);
          }
          setSelectedProject(job.clientProjectId || '');
        }
      }
      isInitialMount.current = false;
    }
    
    if (!isOpen) {
      isInitialMount.current = true;
      setSelectedClient('');
      setBudget('');
      setBudgetType('LPA');
      setCurrencyType('INR');
      setSelectedProject('');
      setSelectedContact('');
    }
  }, [isOpen, job.clientDetails, clients, job.clientProjectId]);
  
  useEffect(() => {
    if (selectedClient && contacts.length > 0 && job.clientDetails?.pointOfContact) {
      const contact = contacts.find(c => c.name === job.clientDetails.pointOfContact);
      setSelectedContact(contact ? contact.id : '');
    }
  }, [contacts, selectedClient, job.clientDetails]);
  
  useEffect(() => {
    if (job.hiringMode === "Full Time" || job.hiringMode === "Permanent") {
      setBudgetType("LPA");
    } else if (job.hiringMode === "Intern") {
      setBudgetType(isInternPaid === "Paid" ? "Stipend" : "Unpaid");
    } else {
      setBudgetType("Monthly");
    }
  }, [job.hiringMode, isInternPaid]);
  
  useEffect(() => {
    setSelectedProject("");
    setSelectedContact("");
    if (selectedClient) {
      refetchProjects();
      refetchContacts();
    }
  }, [selectedClient, refetchProjects, refetchContacts]);
  
  const handleCurrencyChange = (value: string) => {
    setCurrencyType(value);
  };

  const handleNavigateToClients = () => {
    onClose();
    navigate('/clients');
  };
  
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (!selectedClient) {
        toast.error("Please select a client");
        return;
      }
      if (!budget && budgetType !== "Unpaid") {
        toast.error("Please enter a budget");
        return;
      }
      const client = clients.find(c => c.id === selectedClient);
      if (!client) {
        toast.error("Selected client not found");
        return;
      }
      const contact = contacts.find(c => c.id === selectedContact);
      const currentCurrency = currencies.find(c => c.value === currencyType) || currencies[0];
      const updatedJob: JobData = {
        ...job,
        submissionType: "Client",
        clientOwner: client.client_name,
        clientDetails: {
          ...job.clientDetails,
          clientName: client.client_name,
          clientBudget: budgetType === "Unpaid" ? "Unpaid" : `${currentCurrency.symbol}${budget} ${budgetType}`,
          pointOfContact: contact ? contact.name : '',
          currency_type: currencyType,
        },
        clientProjectId: selectedProject || undefined,
        currency_type: currencyType
      };
      await onAssociate(updatedJob);
      toast.success("Job successfully associated with client");
      onClose();
    } catch (error) {
      console.error("Error associating job with client:", error);
      toast.error("Failed to associate job with client");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getBudgetTypeOptions = () => {
    if (job.hiringMode === "Full Time") return ["LPA", "Monthly", "Hourly"];
    if (job.hiringMode === "Contract" || job.hiringMode === "Part Time") return ["Monthly", "Hourly"];
    if (job.hiringMode === "Intern") return isInternPaid === "Paid" ? ["Stipend"] : ["Unpaid"];
    return ["LPA"];
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Associate Job to Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client">Select Client <span className="text-red-500">*</span></Label>
            {isLoadingClients ? (
              <div className="flex items-center justify-center h-10 border rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading clients...</span>
              </div>
            ) : (
              <Popover open={openClientPopover} onOpenChange={setOpenClientPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClientPopover}
                    className="w-full justify-between font-normal"
                  >
                    {selectedClient
                      ? clients.find((client) => client.id === selectedClient)?.client_name
                      : "Select a client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search client..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          No client found.
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setOpenClientPopover(false);
                            handleNavigateToClients();
                          }}
                          className="text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Client
                        </CommandItem>
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.client_name}
                            onSelect={() => {
                              setSelectedClient(client.id);
                              setOpenClientPopover(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedClient === client.id ? "opacity-100" : "opacity-0"}`}
                            />
                            {client.client_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          {job.hiringMode === "Intern" && (
            <div className="space-y-2">
              <Label>Internship Type <span className="text-red-500">*</span></Label>
              <Select value={isInternPaid} onValueChange={setIsInternPaid}>
                <SelectTrigger id="internType">
                  <SelectValue placeholder="Select internship type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {budgetType !== "Unpaid" && (
            <div className="space-y-2">
              <Label htmlFor="budget">
                {budgetType === "Stipend" ? "Stipend (Monthly)" : "Budget"} <span className="text-red-500">*</span>
              </Label>
              <div className="flex">
                <Select value={currencyType} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-[80px] rounded-r-none border-r-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Currency</SelectLabel>
                      {currencies.map(currency => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.symbol} {currency.value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input
                  id="budget"
                  type="text"
                  placeholder={`Enter ${budgetType === "Stipend" ? "stipend" : "budget"} amount`}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="rounded-none"
                />
                <Select value={budgetType} onValueChange={setBudgetType} disabled={getBudgetTypeOptions().length <= 1}>
                  <SelectTrigger className="w-[110px] rounded-l-none border-l-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getBudgetTypeOptions().map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {selectedClient && (
            <>
              <div className="space-y-2">
                <Label htmlFor="project">Client Project (Optional)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Select an existing project or leave blank</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact">SPOC Contact (Optional)</Label>
                <Select value={selectedContact} onValueChange={setSelectedContact}>
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}{contact.email ? ` (${contact.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Select a contact person or leave blank</p>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedClient}>
            {isSubmitting ? "Assigning..." : "Assign to Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssociateToClientModal;
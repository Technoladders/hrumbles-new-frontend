// src/pages/ContactsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
// Updated imports:
import { Contact, ContactInsert, UnifiedContactListItem } from '@/types/contact'; // Added UnifiedContactListItem
import { useContacts } from '@/hooks/use-contacts';
import { useUpdateContact, ContactUpdatableFields } from '@/hooks/use-update-contact'; // Import the mutation hook and types

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Download, Search, Loader2 } from 'lucide-react';
import ContactsTable from '@/components/sales/ContactPage/ContactsTable';
import EffectivePagination from '@/components/sales/EffectivePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import ContactAddForm from '@/components/sales/ContactPage/ContactAddForm';
import ContactEditForm from '@/components/sales/ContactPage/ContactEditForm';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { z } from 'zod';

// --- Zod Schema for Contact CSV ---
const contactCsvSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Valid Email is required" }),
  mobile: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  linkedin_url: z.string().url({ message: "Invalid LinkedIn URL" }).optional().or(z.literal('')).nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
  // Add company_id if you plan to import it via CSV for manual contacts
  // company_id: z.preprocess(val => (val === "" || val === null || val === undefined) ? undefined : Number(val), z.number().int().optional().nullable()),
}).transform(data => ({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    mobile: data.mobile?.trim() || null,
    job_title: data.job_title?.trim() || null,
    linkedin_url: data.linkedin_url?.trim() || null,
    contact_owner: data.contact_owner?.trim() || null,
    contact_stage: data.contact_stage?.trim() || 'Prospect',
    // company_id: data.company_id,
}));
type ContactCsvRow = z.infer<typeof contactCsvSchema>;

// CSV Template Header for Contacts
const CONTACT_CSV_TEMPLATE_HEADER = "Name,Email,Mobile,Job Title,LinkedIn URL,Contact Owner,Contact Stage"; // Add Company ID if importing

const ContactsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // useContacts now returns UnifiedContactListItem[]
  const { data: contacts = [], isLoading, isError, error } = useContacts();
  
  // Instantiate the mutation hook
  const updateContactMutation = useUpdateContact();

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  // Editing contact should now be UnifiedContactListItem to align with what the table displays
  const [editingContact, setEditingContact] = useState<UnifiedContactListItem | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 15;

  // Effects
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  useEffect(() => {
    if (isError && error) {
      toast({ title: "Error Loading Contacts", description: error.message, variant: "destructive"});
      console.error("Error loading contacts:", error);
    }
  }, [isError, error, toast]);

  // Filtering (contacts is already UnifiedContactListItem[])
   const filteredContacts: UnifiedContactListItem[] =( contacts?.filter(contact =>
        (contact.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (contact.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (contact.job_title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (contact.contact_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ) || []
  ).sort((a, b) => {
    // Primary sort by name (case-insensitive, handle nulls)
    const nameA = a.name?.trim().toLowerCase() || '\uffff'; // Sort null/empty names last
    const nameB = b.name?.trim().toLowerCase() || '\uffff';
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    
    // Secondary sort by ID (ensure it's a string or number for comparison)
    // Assuming 'id' is unique and suitable for stable sorting.
    const idA = String(a.id || ''); 
    const idB = String(b.id || '');
    if (idA < idB) return -1;
    if (idA > idB) return 1;
    
    return 0;
  });

   // Pagination
   const totalFilteredPages = Math.ceil(filteredContacts.length / itemsPerPage);
   const paginatedContacts: UnifiedContactListItem[] = filteredContacts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
   const handlePageChange = (page: number) => { if (page >= 1 && page <= totalFilteredPages) { setCurrentPage(page); } };

  // Modal Handlers
  const handleAddContactClick = () => setIsAddContactDialogOpen(true);
  const handleCloseAddContactDialog = () => setIsAddContactDialogOpen(false);

  // Edit handler now accepts UnifiedContactListItem
  const handleEditContactClick = (contact: UnifiedContactListItem) => {
    // The ContactEditForm likely expects a 'Contact' type (from 'contacts' table).
    // Only allow editing if the source is 'contacts' and it fits the 'Contact' structure.
    if (contact.source_table === 'contacts') {
      setEditingContact(contact);
      setIsEditContactDialogOpen(true);
    } else {
      toast({
        title: "Edit Not Available",
        description: "This item originates from candidate data and cannot be edited here directly.",
        variant: "default",
      });
      // Or, you could have a different edit form/modal for candidate_companies items
    }
  };
  const handleCloseEditContactDialog = () => { setIsEditContactDialogOpen(false); setTimeout(() => setEditingContact(null), 300); };

  // --- Handler for updating contact fields (e.g., stage, owner) ---
  const handleUpdateContactField = (item: UnifiedContactListItem, updates: ContactUpdatableFields) => {
    updateContactMutation.mutate(
      { item, updates },
      {
        onSuccess: (updatedData) => {
          toast({
            title: "Update Successful",
            description: `${item.name}'s details have been updated.`,
          });
          console.log("Contact field updated successfully:", updatedData);
        },
        onError: (err) => {
          toast({
            title: "Update Failed",
            description: err.message || "Could not update contact details.",
            variant: "destructive",
          });
          console.error("Failed to update contact field:", err);
        },
      }
    );
  };

  // --- CSV Handlers ---
   const downloadCsvTemplate = () => {
    const csvContent = `${CONTACT_CSV_TEMPLATE_HEADER}\n"John Sample","john.sample@email.com","+15551234","Sales Manager","https://linkedin.com/in/johnsample","Your Name","Interested"`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url); link.setAttribute("download", "contacts_template.csv");
      link.style.visibility = 'hidden'; document.body.appendChild(link);
      link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } else { toast({ title: "Download Failed", variant: "destructive"}); }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file) { toast({ title: "No file selected" }); return; }
     if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) { toast({ title: "Invalid File Type", variant: "destructive" }); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
     setIsImporting(true); toast({ title: "Import Started", description: "Parsing CSV..." });
     Papa.parse<Record<string, any>>(file, {
        header: true, skipEmptyLines: true, transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        complete: (results) => {
            console.log("CSV Parse Complete:", results);
            if (results.errors.length > 0) { console.error("CSV Errors:", results.errors); toast({ title: "CSV Parsing Issue", description: `Could not parse some rows: ${results.errors[0]?.message || 'Unknown error'}`, variant: "destructive"}); }
            processContactCsvData(results.data as Record<string, any>[]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        error: (err: any) => { console.error("CSV Error:", err); toast({ title: "CSV Parsing Failed", variant: "destructive" }); setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
     });
  };

  const processContactCsvData = async (data: Record<string, any>[]) => {
     // CSV processing only adds to the 'contacts' table, so ContactInsert is correct here.
     const validContacts: ContactInsert[] = [];
     const validationErrors: { row: number, errors: string[] }[] = [];
     data.forEach((rawRow, index) => {
        if (Object.values(rawRow).every(val => !val)) return;
        const mappedRow = {
             name: rawRow["name"] || rawRow["contact_name"],
             email: rawRow["email"] || rawRow["email_address"],
             mobile: rawRow["mobile"] || rawRow["phone"] || rawRow["phone_number"],
             job_title: rawRow["job_title"] || rawRow["title"] || rawRow["designation"],
             linkedin_url: rawRow["linkedin"] || rawRow["linkedin_url"],
             contact_owner: rawRow["contact_owner"] || rawRow["owner"],
             contact_stage: rawRow["contact_stage"] || rawRow["stage"],
             // company_id: rawRow["company_id"], // Map if you added company_id to CSV
        };
        const result = contactCsvSchema.safeParse(mappedRow);
        if (result.success) { if(result.data.name && result.data.email) { validContacts.push(result.data as ContactInsert); } else { validationErrors.push({ row: index + 2, errors: ["Name and Email are required."] }); } }
        else { validationErrors.push({ row: index + 2, errors: result.error.errors.map(e => `${e.path.join('.') || 'Row'}: ${e.message}`) }); }
     });

     console.log("Contact Validation:", { valid: validContacts.length, errors: validationErrors.length });

     if (validationErrors.length > 0) {
       const errorSummary = validationErrors.slice(0, 5).map(e => `Row ${e.row}: ${e.errors.join(', ')}`).join('\n');
       toast({ title: `Validation Failed (${validationErrors.length} row(s))`, description: `Check CSV.\nErrors:\n${errorSummary}${validationErrors.length > 5 ? '\n...' : ''}`, variant: "destructive", duration: 10000 });
       if (validContacts.length === 0) { setIsImporting(false); return; }
     }

     if (validContacts.length > 0) {
        toast({ title: "Importing Contacts...", description: `Attempting to import ${validContacts.length} valid contacts...` });
        let skippedCount = 0;
        try {
            // CSV data is inserted into 'contacts' table
            const { error: upsertError, count } = await supabase
                .from('contacts')
                .upsert(validContacts, { // validContacts is ContactInsert[]
                    onConflict: 'email', 
                    ignoreDuplicates: true,
                });

            if (upsertError) throw upsertError;

            const insertedCount = count ?? validContacts.length;
            skippedCount = validContacts.length - insertedCount;
            if (skippedCount < 0) skippedCount = 0;

            let description = `${insertedCount} contacts processed.`;
            if (skippedCount > 0) description += ` ${skippedCount} duplicates skipped (based on email).`;
            if (validationErrors.length > 0) description += ` ${validationErrors.length} rows had validation errors.`;

            toast({ title: "Import Complete", description });
            // **IMPORTANT: Update query key to match useContacts**
            queryClient.invalidateQueries({ queryKey: ['combinedContactsList'] });

        } catch (err: any) {
          console.error("Import Failed:", err);
          toast({ title: "Import Failed", description: err.message || "Database operation error.", variant: "destructive" });
        }
        finally { setIsImporting(false); }
     } else {
        if (validationErrors.length === 0) { toast({ title: "Import Info", description: "No new contact data found to import.", variant: "default" }); }
        setIsImporting(false);
     }
  };
   // --- End CSV ---


  return (
    <div className="container mx-auto px-0 py-0 max-w-full"> {/* Full width within layout */}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2 flex-wrap">
             {/* Add Contact Button */}
             <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
                <DialogTrigger asChild><Button className="h-9" onClick={handleAddContactClick}><Plus className="h-4 w-4 mr-2" /> Add Contact</Button></DialogTrigger>
                <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Add New Contact</DialogTitle><DialogDescription>Enter details. Email must be unique.</DialogDescription></DialogHeader>
                  {/* ContactAddForm will need to be able to set company_id if you want that functionality */}
                  <ContactAddForm onClose={handleCloseAddContactDialog} />
                </DialogContent>
             </Dialog>
            {/* Download & Import Buttons */}
            <Button variant="outline" className="h-9" onClick={downloadCsvTemplate}><Download className="h-4 w-4 mr-2" /> Download Template</Button>
            <Button variant="outline" className="h-9" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>{isImporting ? (<Loader2 className="h-4 w-4 mr-2 animate-spin" />) : (<Upload className="h-4 w-4 mr-2" />)} {isImporting ? 'Importing...' : 'Import Contacts'}</Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, text/csv" style={{ display: 'none' }} />
        </div>
      </div>

      {/* Search & Total */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="relative w-full sm:w-auto sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="text-sm text-muted-foreground mt-2 sm:mt-0">
              Total Contacts: {isLoading ? '...' : filteredContacts.length} {searchTerm && `(filtered from ${contacts.length})`}
          </div>
      </div>

      {/* Contacts Table Area */}
      {isLoading ? ( <div className="text-center py-10 text-muted-foreground">Loading contacts...</div>
      ) : isError ? ( <div className="text-center py-10 text-red-600">Error: {error?.message}</div>
      ) : (
          <ContactsTable
              contacts={paginatedContacts} // paginatedContacts is UnifiedContactListItem[]
              onEditContact={handleEditContactClick} // Expects UnifiedContactListItem
              // **NEW PROP: Pass the update handler to ContactsTable**
              onUpdateContactField={handleUpdateContactField} 
              // You might also want to pass the mutation's pending state for specific items
              isUpdatingItemId={updateContactMutation.isPending ? updateContactMutation.variables?.item.id : null}
          />
      )}

       {/* Pagination */}
       {totalFilteredPages > 1 && !isLoading && (
           <EffectivePagination
               className="mt-6"
               currentPage={currentPage}
               totalCount={filteredContacts.length}
               pageSize={itemsPerPage}
               onPageChange={handlePageChange}
               siblingCount={1}
           />
       )}

       {/* Edit Contact Modal */}
       <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
           <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto pr-2">
               <DialogHeader>
                   <DialogTitle>Edit Contact</DialogTitle>
                   <DialogDescription>Update details for {editingContact?.name ?? 'this contact'}.</DialogDescription>
               </DialogHeader>
               {/* 
                 Ensure ContactEditForm can handle 'editingContact' which is UnifiedContactListItem.
                 If editingContact.source_table === 'contacts', it should be compatible or adaptable to 'Contact'.
                 The 'Contact' type is a subset of 'UnifiedContactListItem' when source_table is 'contacts',
                 but ContactEditForm might expect exactly the 'Contact' type.
                 You might need to cast or transform 'editingContact' before passing it.
                 For safety, ensure all fields ContactEditForm expects are present.
               */}
               {editingContact && editingContact.source_table === 'contacts' && (
                  <ContactEditForm 
                    contact={editingContact as Contact} // Cast here, ensure compatibility
                    onClose={handleCloseEditContactDialog} 
                  />
               )}
           </DialogContent>
       </Dialog>

    </div>
  );
};

export default ContactsPage;
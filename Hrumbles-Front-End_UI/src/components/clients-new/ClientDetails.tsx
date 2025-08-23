// src/components/clients-new/ClientDetails.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Client, ClientContact, Address } from './ClientTypes';
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Pencil, Plus, MoreVertical, Trash2, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const AddressView: React.FC<{ title: string; address: Address }> = ({ title, address }) => (
  <div className="mb-2">
    <div className="flex justify-between items-center mb-1">
      <h4 className="text-sm font-semibold text-gray-600">{title}</h4>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3 text-gray-500" /></Button>
    </div>
    <address className="text-sm text-gray-700 not-italic">
      {address.street}<br />{address.city}, {address.state} {address.zipCode}<br />{address.country}
    </address>
  </div>
);

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b last:border-b-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
);

interface ClientDetailsProps {
  client: Client;
  contacts: ClientContact[];
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contactId: string) => void;
  onEditAddress: (type: 'billing_address' | 'shipping_address') => void;
}


const ClientDetails: React.FC<ClientDetailsProps> = ({ client, contacts, onAddContact, onEditContact, onDeleteContact, onEditAddress }) => {
  return (
    <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3']} className="w-full space-y-4">
      <AccordionItem value="item-1" className="bg-white border rounded-lg px-4">
        <AccordionTrigger className="text-base font-semibold">Address</AccordionTrigger>
        <AccordionContent>
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-semibold text-gray-600">Billing Address</h4>
              {/* --- UPDATE onClick HANDLER --- */}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditAddress('billing_address')}>
                <Pencil className="h-3 w-3 text-gray-500" />
              </Button>
            </div>
            <address className="text-sm text-gray-700 not-italic">
              {client.billing_address?.street}<br />{client.billing_address?.city}, {client.billing_address?.state} {client.billing_address?.zipCode}
            </address>
          </div>
          <div className="mb-2">
             <div className="flex justify-between items-center mb-1">
               <h4 className="text-sm font-semibold text-gray-600">Shipping Address</h4>
               {/* --- UPDATE onClick HANDLER --- */}
               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditAddress('shipping_address')}>
                 <Pencil className="h-3 w-3 text-gray-500" />
               </Button>
             </div>
            <address className="text-sm text-gray-700 not-italic">
              {client.shipping_address?.street}<br />{client.shipping_address?.city}, {client.shipping_address?.state} {client.shipping_address?.zipCode}
            </address>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2" className="bg-white border rounded-lg px-4">
        <AccordionTrigger className="text-base font-semibold">
            <div className="flex justify-between items-center w-full">
                <span>Contacts</span>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onAddContact(); }} className="mr-2 hover:bg-gray-200"><UserPlus className="h-4 w-4 mr-2"/>Add Contact</Button>
            </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-3">
                <Avatar><AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.email}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEditContact(contact)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDeleteContact(contact.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
             {contacts.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No contacts found.</p>}
          </div>
        </AccordionContent>
      </AccordionItem>
      {/* OTHER DETAILS SECTION */}
      <AccordionItem value="item-3" className="bg-white border rounded-lg px-4">
        <AccordionTrigger className="text-base font-semibold">Other Details</AccordionTrigger>
        <AccordionContent>
            <DetailRow label="Customer Type" value="Business" />
            <DetailRow label="Default Currency" value={client.currency} />
            <DetailRow label="GST Treatment" value="Registered Business - Regular" />
            {client.verification_status === 'Verified' && (
                <>
                    <DetailRow label="Verified Name" value={client.verified_company_name} />
                    <DetailRow label="Company ID" value={client.verified_company_id} />
                    <DetailRow label="Incorporation Date" value={client.verified_incorporation_date ? format(new Date(client.verified_incorporation_date), 'dd MMM yyyy') : 'N/A'} />
                    <DetailRow label="State" value={client.verified_state} />
                </>
            )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ClientDetails;
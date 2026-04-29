// src/components/clients-new/ClientDetails.tsx
// Light mode — white cards, violet accent

import React from 'react';
import { Client, ClientContact, Address } from './ClientTypes';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pencil, Trash2, UserPlus, MoreVertical, MapPin, Mail, Building2, Phone } from 'lucide-react';

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
    <span className="text-[11px] text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</span>
    <span className="text-xs font-medium text-gray-700 text-right max-w-[58%]">{value}</span>
  </div>
);

const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden ${className}`}>{children}</div>
);

interface ClientDetailsProps {
  client: Client; contacts: ClientContact[];
  onAddContact: () => void; onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contactId: string) => void;
  onEditAddress: (type: 'billing_address' | 'shipping_address') => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({
  client, contacts, onAddContact, onEditContact, onDeleteContact, onEditAddress,
}) => {
  return (
    <Accordion type="multiple" defaultValue={['address', 'contacts', 'details']} className="w-full">

      {/* ── Address ──────────────────────────────────────────────── */}
      <AccordionItem value="address" className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-gray-700 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
          <div className="flex items-center gap-2"><MapPin size={13} className="text-violet-500" />Address</div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-1">
          {(['billing_address', 'shipping_address'] as const).map(type => (
            <div key={type} className="mb-3 last:mb-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{type === 'billing_address' ? 'Billing' : 'Shipping'}</span>
                <button onClick={() => onEditAddress(type)} className="p-1 rounded text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-all"><Pencil size={11} /></button>
              </div>
              {client[type]?.street ? (
                <address className="text-xs text-gray-600 not-italic leading-relaxed">
                  {client[type]?.street}<br />{client[type]?.city}, {client[type]?.state} {client[type]?.zipCode}
                </address>
              ) : <p className="text-xs text-gray-300 italic">Not set</p>}
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

      {/* ── Contacts ─────────────────────────────────────────────── */}
      <AccordionItem value="contacts" className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
          <div className="flex items-center justify-between w-full pr-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Mail size={13} className="text-cyan-500" />
              Contacts
              {contacts.length > 0 && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">{contacts.length}</span>}
            </div>
            <button onClick={e => { e.stopPropagation(); onAddContact(); }} className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 transition-colors">
              <UserPlus size={11} />Add
            </button>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-1">
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {contacts.length > 0 ? contacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-violet-50/50 transition-colors">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-[11px] font-bold text-white bg-gradient-to-br from-violet-500 to-violet-700">{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{contact.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{contact.email}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-all"><MoreVertical size={12} /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                    <DropdownMenuItem onClick={() => onEditContact(contact)} className="text-xs"><Pencil size={11} className="mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDeleteContact(contact.id)} className="text-xs text-red-600"><Trash2 size={11} className="mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )) : (
              <div className="text-center py-5">
                <Mail size={22} className="text-gray-200 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400">No contacts yet</p>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ── Other Details ─────────────────────────────────────────── */}
      <AccordionItem value="details" className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Building2 size={13} className="text-emerald-500" />Other Details</div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-1">
          <DetailRow label="Customer Type" value="Business" />
          <DetailRow label="Currency" value={client.currency} />
          <DetailRow label="GST Treatment" value="Registered — Regular" />
          {client.commission_type && (
            <DetailRow label="Commission" value={`${client.commission_value}${client.commission_type === 'percentage' ? '%' : ` ${client.currency}`} (${client.commission_type})`} />
          )}
          {client.service_type?.length > 0 && (
            <DetailRow label="Services" value={
              <div className="flex flex-wrap gap-1 justify-end">
                {client.service_type.map((t, i) => (
                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${t === 'permanent' ? 'bg-violet-100 text-violet-700' : 'bg-cyan-50 text-cyan-700'}`}>{t}</span>
                ))}
              </div>
            } />
          )}
          {client.verification_status === 'Verified' && (
            <>
              <DetailRow label="Verified Name" value={client.verified_company_name} />
              <DetailRow label="Company ID" value={client.verified_company_id} />
              <DetailRow label="Incorporation" value={client.verified_incorporation_date ? format(new Date(client.verified_incorporation_date), 'dd MMM yyyy') : 'N/A'} />
              <DetailRow label="State" value={client.verified_state} />
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ClientDetails;
// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactDetailSidebar.tsx
import React, { useState } from 'react';
import { 
  Mail, Phone, ShieldCheck, Clock, CheckCircle2, AlertCircle, 
  MapPin, Globe, Linkedin, Copy, ExternalLink, Plus, ChevronDown, ChevronUp,
  Building, AlertTriangle, Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractFromRaw, hasData } from '@/utils/dataExtractor';
import { cn } from '@/lib/utils';

interface ContactDetailSidebarProps {
  contact: any;
  isRequestingPhone: boolean;
  setIsRequestingPhone: (val: boolean) => void;
  onRequestPhone: () => void;
  refetch: () => void;
}

export const ContactDetailSidebar: React.FC<ContactDetailSidebarProps> = ({ 
  contact, 
  isRequestingPhone, 
  setIsRequestingPhone, 
  onRequestPhone,
  refetch 
}) => {
  const { toast } = useToast();
  const data = extractFromRaw(contact);
  
  // Collapsible states
  const [contactInfoOpen, setContactInfoOpen] = useState(true);
  const [scoresOpen, setScoresOpen] = useState(true);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const handleRequestPhone = async () => {
    setIsRequestingPhone(true);
    try {
      const { error } = await supabase.functions.invoke('request-phone', {
        body: { 
          contactId: contact.id, 
          apolloPersonId: data.rawPerson?.id 
        }
      });
      if (error) throw error;
      toast({ title: "Phone enrichment requested", description: "We'll verify and add phone numbers shortly" });
      refetch();
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Request failed", 
        description: err.message 
      });
    } finally { 
      setIsRequestingPhone(false); 
    }
  };

  // Count emails and phones
  const emailCount = (data.allEmails?.length || 0) + (contact.email && !data.allEmails?.find((e: any) => e.email === contact.email) ? 1 : 0);
  const phoneCount = (data.phoneNumbers?.length || 0) + (contact.mobile ? 1 : 0);

  return (
    <div className="divide-y divide-gray-200">
      
      {/* Contact Information Section */}
      <Collapsible open={contactInfoOpen} onOpenChange={setContactInfoOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-sm font-semibold text-gray-900">Contact information</span>
          {contactInfoOpen ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            
            {/* Email Section */}
            <div className="space-y-2">
              {/* Primary/Manual Email */}
              {contact.email ? (
                <ContactInfoRow
                  icon={<Mail size={16} className="text-green-600" />}
                  iconBg="bg-green-50"
                  value={contact.email}
                  label="Primary"
                  verified={true}
                  onCopy={() => copyToClipboard(contact.email, 'Email')}
                />
              ) : (
                <ContactInfoRow
                  icon={<Mail size={16} className="text-gray-400" />}
                  iconBg="bg-gray-50"
                  value="****@****.com"
                  masked={true}
                  actionButton={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs font-medium text-gray-600 border-gray-300"
                    >
                      <Plus size={12} className="mr-1" />
                      Access email
                    </Button>
                  }
                />
              )}

              {/* Enriched Emails */}
              {data.allEmails?.filter((e: any) => e.email !== contact.email).map((emailData: any, idx: number) => (
                <ContactInfoRow
                  key={idx}
                  icon={<Mail size={16} className="text-green-600" />}
                  iconBg="bg-green-50"
                  value={emailData.email}
                  label={emailData.email_status || emailData.status}
                  verified={['verified', 'valid'].includes(emailData.email_status?.toLowerCase())}
                  onCopy={() => copyToClipboard(emailData.email, 'Email')}
                />
              ))}
            </div>

            {/* Phone Section */}
            <div className="space-y-2">
              {/* Primary/Manual Phone */}
              {contact.mobile ? (
                <ContactInfoRow
                  icon={<Phone size={16} className="text-gray-600" />}
                  iconBg="bg-gray-100"
                  value={contact.mobile}
                  label="Mobile"
                  onCopy={() => copyToClipboard(contact.mobile, 'Phone')}
                />
              ) : data.hasDirectPhone ? (
                <ContactInfoRow
                  icon={<Phone size={16} className="text-gray-400" />}
                  iconBg="bg-gray-50"
                  value="(***)-***-****"
                  sublabel="Mobile · credits"
                  masked={true}
                  actionButton={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs font-medium text-gray-600 border-gray-300"
                      onClick={handleRequestPhone}
                      disabled={isRequestingPhone}
                    >
                      {isRequestingPhone ? (
                        <>
                          <Clock size={12} className="mr-1 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Phone size={12} className="mr-1" />
                          Access mobile
                        </>
                      )}
                    </Button>
                  }
                />
              ) : null}

              {/* Enriched Phones */}
              {data.phoneNumbers?.map((phoneData: any, idx: number) => (
                <ContactInfoRow
                  key={idx}
                  icon={<Phone size={16} className="text-gray-600" />}
                  iconBg="bg-gray-100"
                  value={phoneData.phone_number || phoneData.raw_number}
                  label={phoneData.type}
                  onCopy={() => copyToClipboard(phoneData.phone_number || phoneData.raw_number, 'Phone')}
                />
              ))}

              {/* No business phone available */}
              {!contact.mobile && (!data.phoneNumbers || data.phoneNumbers.length === 0) && (
                <ContactInfoRow
                  icon={<Building size={16} className="text-gray-400" />}
                  iconBg="bg-gray-50"
                  value="No phone number available"
                  sublabel="Business"
                  disabled={true}
                />
              )}

              {/* Pending Status */}
              {contact.phone_enrichment_status === 'pending_phones' && (
                <div className="flex items-center gap-2 px-2 py-2 bg-amber-50 rounded-md border border-amber-200">
                  <Clock size={14} className="text-amber-600 animate-spin" />
                  <span className="text-xs text-amber-700 font-medium">Verification in progress...</span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Scores Section */}
      <Collapsible open={scoresOpen} onOpenChange={setScoresOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-sm font-semibold text-gray-900">Scores</span>
          {scoresOpen ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3 py-3">
              {/* Placeholder score bars */}
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-6 h-1.5 rounded-full bg-gray-200" />
                  ))}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-6 h-1.5 rounded-full",
                        i <= 2 ? "bg-green-500" : "bg-gray-200"
                      )} 
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-6 h-1.5 rounded-full bg-gray-200" />
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">No scores found</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                Create score
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* DNC Warning */}
      <div className="px-4 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Do Not Call (DNC) is not enabled
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Protect your team from compliance risks by screening numbers against DNC registries.
              </p>
              <a 
                href="#" 
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-900 mt-2"
              >
                Enable in Settings
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Social Profiles Section */}
      {(data.linkedinUrl || data.twitterUrl) && (
        <div className="px-4 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Social Profiles
          </h3>
          <div className="space-y-2">
            {data.linkedinUrl && (
              <a 
                href={data.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all group"
              >
                <div className="p-1.5 bg-[#0A66C2] rounded">
                  <Linkedin size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
                    LinkedIn Profile
                  </p>
                </div>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600" />
              </a>
            )}
            {data.twitterUrl && (
              <a 
                href={data.twitterUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all group"
              >
                <div className="p-1.5 bg-gray-900 rounded">
                  <XIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
                    X (Twitter) Profile
                  </p>
                </div>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Quick Info Section */}
      {(data.city || data.timezone || data.seniority || contact.medium) && (
        <div className="px-4 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Information
          </h3>
          <div className="space-y-2.5">
            {data.city && (
              <InfoRow 
                label="Location"
                value={[data.city, data.state, data.country].filter(Boolean).join(', ')}
              />
            )}
            {data.timezone && (
              <InfoRow 
                label="Timezone"
                value={data.timezone?.replace('_', ' ')}
              />
            )}
            {data.seniority && (
              <InfoRow 
                label="Seniority"
                value={
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                    {data.seniority}
                  </span>
                }
              />
            )}
            {contact.medium && (
              <InfoRow 
                label="Source"
                value={contact.medium}
              />
            )}
          </div>
        </div>
      )}

      {/* Record Details */}
      <div className="px-4 py-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Record Details
        </h3>
        <div className="space-y-2.5">
          <InfoRow 
            label="Stage"
            value={
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded",
                contact.contact_stage === 'Lead' && "bg-blue-100 text-blue-700",
                contact.contact_stage === 'Prospect' && "bg-purple-100 text-purple-700",
                contact.contact_stage === 'Customer' && "bg-green-100 text-green-700",
              )}>
                {contact.contact_stage}
              </span>
            }
          />
          {contact.created_at && (
            <InfoRow 
              label="Created"
              value={new Date(contact.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            />
          )}
          {contact.updated_at && (
            <InfoRow 
              label="Last Updated"
              value={new Date(contact.updated_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Contact Info Row Component - Apollo Style
const ContactInfoRow = ({ 
  icon, 
  iconBg,
  value, 
  label, 
  sublabel,
  verified,
  masked,
  disabled,
  onCopy,
  actionButton
}: { 
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label?: string;
  sublabel?: string;
  verified?: boolean;
  masked?: boolean;
  disabled?: boolean;
  onCopy?: () => void;
  actionButton?: React.ReactNode;
}) => (
  <div className={cn(
    "flex items-start gap-3 py-2",
    disabled && "opacity-50"
  )}>
    <div className={cn("p-2 rounded-full flex-shrink-0", iconBg)}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={cn(
          "text-sm font-medium truncate",
          masked ? "text-gray-400" : "text-gray-900"
        )}>
          {value}
        </p>
        {verified && (
          <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
        )}
        {onCopy && !masked && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={onCopy}
                  className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Copy size={12} className="text-gray-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {(label || sublabel) && (
        <p className="text-xs text-gray-500 mt-0.5">
          {label && <span className="capitalize">{label}</span>}
          {sublabel && <span>{label ? ' · ' : ''}{sublabel}</span>}
        </p>
      )}
    </div>
    {actionButton && (
      <div className="flex-shrink-0">
        {actionButton}
      </div>
    )}
  </div>
);

// Info Row Component
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-sm text-gray-900 font-medium">{value}</span>
  </div>
);

// X (Twitter) Icon
const XIcon = () => (
  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
// 
// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactDetailSidebar.tsx
import React from 'react';
import { 
  Mail, Phone, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, 
  MapPin, Globe, Linkedin, Twitter, Copy, ExternalLink, Plus, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  return (
    <div className="space-y-4">
      {/* Quick Info Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <MapPin size={14} />
            Quick Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-semibold">
                  {data.seniority}
                </Badge>
              }
            />
          )}
          {contact.medium && (
            <InfoRow 
              label="Source"
              value={contact.medium}
            />
          )}
        </CardContent>
      </Card>

      {/* Email Addresses Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Mail size={14} />
              Email Addresses
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-medium">
              {(data.allEmails?.length || 0) + (contact.email && !data.allEmails?.find((e: any) => e.email === contact.email) ? 1 : 0)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Primary/Manual Email */}
          {contact.email && (
            <EmailItem 
              email={contact.email}
              status="Primary"
              isPrimary={true}
              onCopy={() => copyToClipboard(contact.email, 'Email')}
            />
          )}

          {/* Enriched Emails */}
          {data.allEmails?.filter((e: any) => e.email !== contact.email).map((emailData: any, idx: number) => (
            <EmailItem 
              key={idx}
              email={emailData.email}
              status={emailData.email_status || emailData.status}
              onCopy={() => copyToClipboard(emailData.email, 'Email')}
            />
          ))}

          {/* No emails state */}
          {!hasData(data.allEmails) && !contact.email && (
            <EmptyState icon={<Mail size={20} />} message="No email addresses found" />
          )}
        </CardContent>
      </Card>

      {/* Phone Numbers Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Phone size={14} />
              Phone Numbers
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-medium">
              {data.phoneNumbers?.length || (contact.mobile ? 1 : 0)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Primary/Manual Phone */}
          {contact.mobile && (
            <PhoneItem 
              number={contact.mobile}
              type="Primary"
              status="verified"
              onCopy={() => copyToClipboard(contact.mobile, 'Phone')}
            />
          )}

          {/* Enriched Phones */}
          {data.phoneNumbers?.map((phoneData: any, idx: number) => (
            <PhoneItem 
              key={idx}
              number={phoneData.phone_number || phoneData.raw_number}
              type={phoneData.type}
              status={phoneData.status}
              onCopy={() => copyToClipboard(phoneData.phone_number || phoneData.raw_number, 'Phone')}
            />
          ))}

          {/* Request Phone Button */}
          {!contact.mobile && 
           data.phoneNumbers?.length === 0 && 
           contact.phone_enrichment_status !== 'pending_phones' &&
           (data.hasDirectPhone || data.directDialStatus === 'enrichment_successful') && (
            <Button
              onClick={handleRequestPhone}
              disabled={isRequestingPhone}
              className="w-full h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              {isRequestingPhone ? (
                <>
                  <Clock size={14} className="mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Phone size={14} className="mr-2" />
                  Reveal Phone Number
                </>
              )}
            </Button>
          )}

          {/* Pending Status */}
          {contact.phone_enrichment_status === 'pending_phones' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <Clock size={16} className="text-amber-600 mx-auto mb-1 animate-spin" />
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                Verification in Progress
              </p>
            </div>
          )}

          {/* No phones state */}
          {!contact.mobile && 
           (!data.phoneNumbers || data.phoneNumbers.length === 0) && 
           !data.hasDirectPhone && 
           contact.phone_enrichment_status !== 'pending_phones' && (
            <EmptyState icon={<Phone size={20} />} message="No phone numbers available" />
          )}
        </CardContent>
      </Card>

      {/* Social Profiles Card */}
      {(data.linkedinUrl || data.twitterUrl || data.facebookUrl || data.githubUrl) && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Globe size={14} />
              Social Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.linkedinUrl && (
              <SocialLink 
                url={data.linkedinUrl}
                icon={<Linkedin size={16} />}
                label="LinkedIn"
                color="bg-[#0A66C2]"
              />
            )}
            {data.twitterUrl && (
              <SocialLink 
                url={data.twitterUrl}
                icon={<XIcon />}
                label="X (Twitter)"
                color="bg-slate-900"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Record Metadata Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Record Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow 
            label="CRM Stage"
            value={
              <Badge className="bg-indigo-600 text-white border-none text-[10px] font-semibold">
                {contact.contact_stage}
              </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
};

// Helper Components
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-slate-500 font-medium">{label}</span>
    <span className="text-xs text-slate-900 font-semibold">{value}</span>
  </div>
);

const EmailItem = ({ 
  email, 
  status, 
  isPrimary,
  onCopy 
}: { 
  email: string; 
  status?: string; 
  isPrimary?: boolean;
  onCopy: () => void;
}) => {
  const getStatusColor = (s: string) => {
    const lower = s?.toLowerCase();
    if (lower === 'verified' || lower === 'valid') return 'text-green-600 bg-green-50 border-green-200';
    if (lower === 'likely') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (lower === 'primary') return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getStatusIcon = (s: string) => {
    const lower = s?.toLowerCase();
    if (lower === 'verified' || lower === 'valid') return <CheckCircle2 size={12} className="text-green-600" />;
    if (lower === 'likely') return <AlertCircle size={12} className="text-blue-600" />;
    if (lower === 'primary') return <ShieldCheck size={12} className="text-indigo-600" />;
    return <AlertCircle size={12} className="text-slate-500" />;
  };

  return (
    <div className={cn(
      "group relative p-3 rounded-lg border transition-all hover:shadow-sm",
      isPrimary ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-white"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate" title={email}>
            {email}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {status && getStatusIcon(status)}
            <Badge className={cn("text-[9px] font-medium border px-1.5 py-0", getStatusColor(status || ''))}>
              {status}
            </Badge>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onCopy}
              >
                <Copy size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Copy email</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

const PhoneItem = ({ 
  number, 
  type, 
  status,
  onCopy 
}: { 
  number: string; 
  type?: string; 
  status?: string;
  onCopy: () => void;
}) => (
  <div className="group relative p-3 rounded-lg border border-slate-200 bg-white transition-all hover:shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{number}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {status === 'valid_number' && (
            <ShieldCheck size={12} className="text-green-600" />
          )}
          <Badge variant="outline" className="text-[9px] font-medium bg-slate-50 border-slate-200 px-1.5 py-0">
            {type || 'Phone'}
          </Badge>
        </div>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onCopy}
            >
              <Copy size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Copy number</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
);

const SocialLink = ({ 
  url, 
  icon, 
  label, 
  color 
}: { 
  url: string; 
  icon: React.ReactNode; 
  label: string; 
  color: string;
}) => (
  <a 
    href={url}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm transition-all group"
  >
    <div className={cn("p-2 rounded-lg text-white", color)}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
        {label}
      </p>
    </div>
    <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-500" />
  </a>
);

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
    <div className="text-slate-300 mx-auto mb-2">{icon}</div>
    <p className="text-xs text-slate-400 font-medium">{message}</p>
  </div>
);

const XIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);